import * as Ast from '../ast/index.js';
import type { SrcSpan } from '../span.js';
import { type Spannable } from '../span.js';
import type { LiteralToken } from '../token.js';
import type { Token } from '../token.js';
import { TokenKind } from '../token.js';
import { Lexer } from './lexer.js';

/// - We don't care about new lines
const Continue = Symbol('@continue');
type Continue = typeof Continue;

export interface Parsed {
  formula: Ast.Formula;
}

export class Parser {
  private tok0: Token;
  private tok1: Token;
  // @ts-ignore
  private line: number = 0;

  constructor(public readonly lex: Lexer) {
    /*   
    todo: add feature flag for formula or script 
   */
    this.tok0 = this.lex.advance();
    this.tok1 = this.lex.advance();
  }

  static parse(source: string) {
    return new Parser(new Lexer(source)).parse();
  }

  static safeParse(source: string) {
    return new Parser(new Lexer(source)).safeParse();
  }

  isEof() {
    return this.tok0.kind === TokenKind.Eof;
  }

  parse(): Parsed {
    return {
      formula: this.parseFormula(),
    };
  }

  safeParse() {
    try {
      const parsed = this.parse();
      return {
        success: true,
        parsed,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        parsed: null,
        error,
      };
    }
  }

  private parseFormula(): Ast.Formula {
    const [body, span] = this.parseStatementSequence();
    const formula: Ast.Formula = {
      type: 'formula',
      body: body,
      span,
    };

    return formula;
  }

  // -- PARSER BEGIN

  private parseStatementSequence() {
    return this.series(this.parseStatement);
  }

  private parseStatement: SeriesParseFn<Ast.Stmt> = () => {
    switch (this.tok0.kind) {
      case TokenKind.Eof:
        return null;

      case TokenKind.Let: {
        const ret = this.parseLocal();
        return ret;
      }

      case TokenKind.Fn: {
        const fn = this.nextToken();
        return this.parseFunction(fn.span) as Ast.StmtFn;
      }

      case TokenKind.NewLine: {
        this.nextToken();
        return Continue;
      }

      case TokenKind.LCurly: {
        console.log(this.tok0.kind);
        const block = this.parseBlock();
        console.log(this.tok0.kind);
        return block;
      }

      default: {
        const expr = this.parseExpr();
        if (!expr) {
          return null;
        }
        return new Ast.StmtExpr(expr, expr.span.clone());
      }
    }
  };

  // with let
  private parseLocal() {
    const letTok = this.nextToken(); // eat let or const

    const [assignments, span] = this.series(
      this.parseAssignments,
      TokenKind.Comma
    );

    const bindingsSpan = letTok.span.merge(span);

    return new Ast.StmtLocal(assignments, bindingsSpan);
  }

  private parseAssignments: SeriesParseFn<Ast.ExprLocalAssignment> = () => {
    // this will be terminated when the commas are over
    // make sure to stop the tok0 at a comma to parse the rest before returning
    const nameTok = this.nextToken() as LiteralToken<string>;

    if (nameTok.kind !== TokenKind.Name) throw new Error('Expected a name');

    // todo pattern ? let [a] = [1, 2] || let {name} = {name: "block"}
    const ident = new Ast.Ident(nameTok.data, nameTok.span);

    const assignmentSpan = ident.span.clone();

    if (this.eatOne(TokenKind.Eq)) {
      const expr = this.parseExpr();

      if (!expr) throw new Error('Expected an expr after = '); // todo better error

      assignmentSpan.mergeMut(expr.span);

      return new Ast.ExprLocalAssignment(ident, expr, assignmentSpan); // todo parse
    } else {
      // todo change this to use the series
      // trailing comma
      if (
        this.tok0.kind === TokenKind.Comma &&
        this.tok1.kind !== TokenKind.Name
      )
        throw new Error('Trailing commas are not allowed');

      return new Ast.ExprLocalAssignment(ident, null, assignmentSpan); // uninitialized var
    }
  };

  // expr(start) .. expr (end)              ===(start to < end)
  // expr(start) .= expr (end)              === (start to <= end)
  private parseRange(from: Ast.Expr) {
    const rangeDotSyntaxToken = this.nextToken();
    const include = rangeDotSyntaxToken.kind === TokenKind.DotEq; // eat ..

    const to = this.parseExpr();
    if (!to) throw new Error('required an expression after .. or ..='); // todo error

    return new Ast.ExprRange(from, to, include, from.span.merge(to.span));
  }

  private parseTernary(condition: Ast.Expr): Ast.Expr | null {
    if (!this.eatOne(TokenKind.Question)) {
      return null; // not a ternary
    }
    const consequent = this.parseExpr();
    if (!consequent) throw new Error('Expected expression after "?"'); // todo error

    if (!this.eatOne(TokenKind.Colon))
      throw new Error('Expected a colon after expression'); // todo error

    const alternate = this.parseExpr();
    if (!alternate) throw new Error('Expected a expression after ":"');
    const span = condition.span.merge(alternate.span);
    return new Ast.ExprIf(condition, consequent, alternate, span);
  }

  // with brace
  private parseBlock() {
    const lBrace = this.expectOne(TokenKind.LCurly, 'Expected a left brace'); // todo debug
    const [stmts] = this.parseStatementSequence();

    const rBrace = this.expectOne(TokenKind.RCurly, 'Expected a "}"'); // todo errors

    return new Ast.Block(stmts, lBrace.span.merge(rBrace.span));
  }

  private parseName = () => {
    const name = this.eatOne(TokenKind.Name) as LiteralToken<string>;
    if (!name) return null;
    return new Ast.Ident(name.data, name.span);
  };

  private expectName = (): Ast.Ident => {
    const name = this.eatOne(TokenKind.Name) as LiteralToken<string>;
    if (!name) throw new Error('Expected a name');
    return new Ast.Ident(name.data, name.span);
  };

  private expectOne(kind: TokenKind, message: string) {
    const t = this.eatOne(kind);
    if (!t) throw new Error(message);
    return t;
  }

  private parseFunction(start: SrcSpan) {
    const name = this.expectName();

    const [params] = this.parseFunctionParams();

    const body = this.parseBlock();

    const span = start.merge(body.span);

    return new Ast.StmtFn(name, params, body, span);
  }

  private parseFunctionParams() {
    this.expectOne(TokenKind.LParen, 'Expected a "("');
    const params = this.series(this.parseName, TokenKind.Comma);
    this.expectOne(TokenKind.RParen, 'Expected a ")"');
    return params;
  }

  // ---- Begin Expr Main
  private parseExpr = (): Ast.Expr | null => {
    const exprStack: Ast.Expr[] = [];
    const opStack: [tok: Token, precedence: number][] = [];
    opStack;

    for (;;) {
      if (this.tok0.kind === TokenKind.Semi) break;

      // get expr
      const uniExpr = this.parseExprUnit();
      if (uniExpr) {
        exprStack.push(uniExpr);
      } else if (exprStack.length === 0) return null;
      else {
        throw new Error('Op naked right'); // todo better error
      }

      const mayBeOp = this.tok0;
      const precedence = this.precedence(mayBeOp.kind);
      if (precedence) {
        this.nextToken();
        this.handleOperator(
          [mayBeOp, precedence],
          opStack,
          exprStack,
          this.reduceOpExpr
        );
      } else {
        break;
      } // not an op
    }

    const expr = this.handleOperator(
      null,
      opStack,
      exprStack,
      this.reduceOpExpr
    );

    if (expr) {
      switch (this.tok0.kind) {
        case TokenKind.Question:
          return this.parseTernary(expr);
        case TokenKind.DotDot:
        case TokenKind.DotEq:
          return this.parseRange(expr);
      }
    }

    return expr;
  };

  private parseExprSequence() {
    return this.series<Ast.Expr>(this.parseExpr, TokenKind.Comma);
  }

  private parseExprUnit(): Ast.Expr | null {
    const tok = this.tok0;
    switch (tok.kind) {
      case TokenKind.String:
      case TokenKind.Number:
      case TokenKind.Bool:
        this.nextToken();
        return new Ast.ExprLit((tok as LiteralToken).data, tok.span);

      // Bool negation
      case TokenKind.Bang: {
        const bang = this.nextToken();

        const value = this.parseExprUnit();
        if (!value) throw new Error('expected an expression after !'); // todo errors
        return new Ast.ExprNegateBool(value, bang.span.merge(value.span));
      }
      // Number negation
      case TokenKind.Minus: {
        const minus = this.nextToken();
        const value = this.parseExprUnit();
        if (!value) throw new Error('expected an expression after -'); // todo errors
        return new Ast.ExprNegateNumber(value, minus.span.merge(value.span));
      }

      case TokenKind.Name:
        this.nextToken();
        return new Ast.Ident((tok as LiteralToken<string>).data, tok.span);

      // grouping (
      case TokenKind.LParen: {
        const lParen = this.nextToken();
        const [expressions] = this.parseExprSequence();
        const len = expressions.length;

        this.expectOne(TokenKind.RParen, 'Expected a ")" after expression'); // todo error

        const allIdent = expressions.every(
          expr => expr.kind === Ast.ExprKind.Ident // todo pattern
        );
        const maybeArrow = this.tok0.kind === TokenKind.ThinArrow;

        // if anonymous fn
        if (allIdent && maybeArrow) {
          this.nextToken();
          const body =
            this.tok0.kind === TokenKind.LCurly
              ? this.parseBlock()
              : this.parseExpr();
          if (!body)
            throw new Error('Expected a expression or a block after ->'); // todo error
          return new Ast.ExprFn(
            expressions as Ast.Ident[],
            body,
            lParen.span.merge(body.span)
          );
        }

        if (len === 0) throw new Error('Expected an expression after "("'); // todo error
        if (len > 1) throw new Error('Sequences are not allowed');
        return expressions[0];
      }

      /*
        match (cond) {
          case1 => this, 
          case2 => {
            blah + blah
            blah
          }
        }
      */
      case TokenKind.Match: {
        throw new Error('Match cases are under construction');
      }

      // { this will be for maps
      case TokenKind.LCurly: {
        // todo
        throw new Error('Objects are under construction');
      }

      case TokenKind.LBracket: {
        // todo
        throw new Error('Lists are under construction');
      }

      default: {
        return null;
      }
    }
  }

  private handleOperator(
    nextOp: [Token, number] | null,
    opStack: [Token, number][],
    exprStack: Ast.Expr[],
    reducer: (op: Token, exprStack: Ast.Expr[]) => void
  ): Ast.Expr | null {
    for (;;) {
      const op = opStack.pop();
      if (!op && !nextOp) {
        // if we don't have any operators left return the final expr
        const expr = exprStack.pop();
        if (!expr) return null;
        if (exprStack.length === 0) return expr;
        throw new Error(
          '@@internal Expression not fully reduced for some reason'
        );
      } else if (!op && nextOp) {
        opStack.push(nextOp);
        break;
      } else if (op && !nextOp) {
        reducer(op[0], exprStack);
      } else if (op && nextOp) {
        const [opl, pl] = op;
        const [opr, pr] = nextOp;
        if (pl >= pr) {
          reducer(opl, exprStack);
          nextOp = [opr, pr];
        } else {
          opStack.push([opl, pl]);
          opStack.push([opr, pr]);
          break;
        }
      } else break;
    }
    return null;
  }

  private reduceOpExpr = (op: Token, exprStack: Ast.Expr[]) => {
    const right = exprStack.pop();
    const left = exprStack.pop();
    if (!left || !right)
      throw new Error(
        '@@internal Cant reduce expression. required minimum of 2 expr'
      );
    exprStack.push(this.makeOpExpr(op, left, right));
  };

  private makeOpExpr(opTok: Token, left: Ast.Expr, right: Ast.Expr) {
    const op = this.tokenToOp(opTok.kind);
    if (!op) throw new Error(`@@internal Unexpected op ${opTok.kind}`);

    const span = left.span.merge(opTok.span).merge(right.span);
    return new Ast.ExprBinary(left, op, right, span);
  }

  // ----- End Expr
  // -- PARSER
  private precedence(t: TokenKind) {
    const op = this.tokenToOp(t);
    if (!op) return null;
    return Ast.getOpPrecedence(op);
  }

  private tokenToOp(t: TokenKind): Ast.BinOp | null {
    switch (t) {
      // logical
      case TokenKind.And:
        return Ast.BinOp.And;
      case TokenKind.Or:
        return Ast.BinOp.Or;

      // equality
      case TokenKind.NotEq:
        return Ast.BinOp.NotEq;
      case TokenKind.EqEq:
        return Ast.BinOp.Eq;

      // math
      case TokenKind.Plus:
        return Ast.BinOp.Add;
      case TokenKind.Minus:
        return Ast.BinOp.Sub;
      case TokenKind.Star:
        return Ast.BinOp.Mul;
      case TokenKind.Slash:
        return Ast.BinOp.Div;
      case TokenKind.StarStar:
        return Ast.BinOp.Exp;
      case TokenKind.Percent:
        return Ast.BinOp.Rem;

      //
      case TokenKind.GtEq:
        return Ast.BinOp.GtEq;
      case TokenKind.LtEq:
        return Ast.BinOp.LtEq;
      case TokenKind.Gt:
        return Ast.BinOp.Gt;
      case TokenKind.Lt:
        return Ast.BinOp.Lt;

      default:
        return null;
    }
  }

  private nextToken() {
    const tok = this.tok0;

    let nxt: Token = this.lex.advance();

    while (!this.lex.isEOF()) {
      let allow = true;

      switch (nxt.kind) {
        case TokenKind.Comment:
          break;
        case TokenKind.NewLine:
          break;
        default:
          allow = false;
      }

      if (!allow) break;
      nxt = this.lex.advance();
    }

    this.tok0 = this.tok1;
    this.tok1 = nxt;
    return tok;
  }

  private eatOne(kind: TokenKind) {
    if (this.tok0.kind === kind) {
      return this.nextToken();
    }

    return null;
  }

  /**
   * Use to parse a series
   */
  private series<R extends Spannable>(
    parse: SeriesParseFn<R>,
    delim?: TokenKind
  ): [result: R[], span: SrcSpan] {
    const series: R[] = [];
    const start = this.tok0.span;
    let end = this.tok0.span;
    for (;;) {
      const parsed = parse();

      if (parsed === Continue) {
        continue;
      }

      if (parsed === null) {
        end = this.tok0.span;
        break;
      }

      series.push(parsed);
      end = parsed.span;

      if (delim !== undefined) {
        if (!this.eatOne(delim)) break;
        // check if the delim is repeated  // [1 ,,]
        if (this.eatOne(delim)) throw new Error('Extra separator'); // todo use parse error
      }
    }

    return [series, start.merge(end)];
  }
}

type SeriesParseFn<R extends Spannable> = () => R | null | Continue;
