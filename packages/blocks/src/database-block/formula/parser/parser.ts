import * as Ast from '../ast/index.js';
import type { SrcSpan } from '../span.js';
import { type Spannable } from '../span.js';
import type { LiteralToken } from '../token.js';
import type { Token } from '../token.js';
import { TokenKind } from '../token.js';
import type { Lexer } from './lexer.js';

const Skip = Symbol('skip_token');
type SkipToken = typeof Skip;

export interface Parsed {
  formula: Ast.Formula;
}

export class Parser {
  private tok0: Token;
  private tok1: Token;

  private line: number = 0;

  constructor(public readonly lex: Lexer) {
    /*   
    my be in future we can have different modes like formula or script
   */
    this.tok0 = this.lex.advance();
    this.tok1 = this.lex.advance();
  }

  isEof() {
    return this.tok0.kind === TokenKind.Eof;
  }

  parse(): Parsed {
    return {
      formula: this.parseFormula(),
    };
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

      case TokenKind.Let:
      case TokenKind.Const:
        return this.parseLocal();

      case TokenKind.Fn:
        return Skip;

      default: {
        const expr = this.parseExpr();
        console.log('Expr', expr);
        if (expr) {
          return new Ast.StmtExpr(expr, expr.span);
        }
        return Skip;
      }
    }
  };

  // without let or const consumed
  private parseLocal() {
    const letOrConst = this.nextToken(); // eat let or const

    const type =
      letOrConst.kind === TokenKind.Let
        ? Ast.LocalType.Let
        : Ast.LocalType.Const;

    const [assignments, span] = this.series(
      this.parseAssignments,
      TokenKind.Comma
    );

    const bindingsSpan = letOrConst.span.merge(span);

    return new Ast.StmtLocal(assignments, type, bindingsSpan);
  }

  private parseAssignments: SeriesParseFn<Ast.ExprLocalAssign> = () => {
    // this will be terminated when the commas are over
    // make sure to stop the tok0 at a comma to parse the rest before returning
    const nameTok = this.nextToken() as LiteralToken<string>;

    if (nameTok.kind !== TokenKind.Name) throw new Error('Expected a name');

    // todo pattern ? let [a] = [1, 2] || let {name} = {name: "block"}
    const ident = new Ast.Ident(nameTok.data, nameTok.span);

    const bindingSpan = ident.span.clone();

    if (this.eatIf(TokenKind.Eq)) {
      bindingSpan.merge(this.tok0.span);

      // todo we will change this with a expression parser
      while (
        !this.isEof() &&
        this.tok0.kind !== TokenKind.Comma &&
        this.tok0.kind !== TokenKind.NewLine &&
        this.tok0.kind !== TokenKind.Semi
      ) {
        bindingSpan.mergeMut(this.nextToken().span);
      }

      return new Ast.ExprLocalAssign(ident, null, bindingSpan); // todo parse
    } else {
      // trailing comma
      if (
        this.tok0.kind === TokenKind.Comma &&
        this.tok1.kind !== TokenKind.Name
      )
        throw new Error('Trailing commas are not allowed');

      return new Ast.ExprLocalAssign(ident, null, bindingSpan); // uninitialized var
    }
  };

  // ---- Begin Expr
  private parseExpr(): Ast.Expr | null {
    const exprStack: Ast.Expr[] = [];
    const opStack: [tok: Token, precedence: number][] = [];
    opStack;

    for (;;) {
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
          this.opExprReducer
        );
      } else break; // not an op
    }

    return this.handleOperator(null, opStack, exprStack, this.opExprReducer);
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
        const expr = exprStack.pop();
        if (!expr) return null;
        if (exprStack.length === 0) return expr;
        throw new Error('Expression not fully reduced for some reason');
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

  private opExprReducer = (op: Token, exprStack: Ast.Expr[]) => {
    const left = exprStack.pop();
    const right = exprStack.pop();
    if (!left || !right)
      throw new Error('Cant reduce expression. required minimum of 2 expr');
    exprStack.push(this.exprOpReducer(op, left, right));
  };

  private exprOpReducer(opTok: Token, left: Ast.Expr, right: Ast.Expr) {
    const op = this.tokenToOp(opTok.kind);
    if (!op) throw new Error(`Unexpected op ${opTok.kind}`);

    const span = left.span.merge(opTok.span).merge(right.span);
    return new Ast.ExprBin(left, op, right, span);
  }

  private parseExprUnit(): Ast.Expr | null {
    const tok = this.tok0;
    switch (tok.kind) {
      case TokenKind.String:
      case TokenKind.Number:
      case TokenKind.Bool:
        this.nextToken();
        return new Ast.ExprLit((tok as LiteralToken).data, tok.span);

      default: {
        return null;
      }
    }
  }

  // ----- End Expr
  // -- PARSER
  private precedence(t: TokenKind) {
    const op = this.tokenToOp(t);
    if (!op) return null;
    return Ast.getOpPrecedence(op);
  }

  private tokenToOp(t: TokenKind): Ast.OpBin | null {
    switch (t) {
      // logical
      case TokenKind.And:
        return Ast.OpBin.And;
      case TokenKind.Or:
        return Ast.OpBin.Or;

      // equality
      case TokenKind.NotEq:
        return Ast.OpBin.NotEq;
      case TokenKind.EqEq:
        return Ast.OpBin.Eq;

      // math
      case TokenKind.Plus:
        return Ast.OpBin.Add;
      case TokenKind.Minus:
        return Ast.OpBin.Sub;
      case TokenKind.Star:
        return Ast.OpBin.Mul;
      case TokenKind.Slash:
        return Ast.OpBin.Div;
      case TokenKind.StarStar:
        return Ast.OpBin.Exp;
      case TokenKind.Percent:
        return Ast.OpBin.Rem;

      //
      case TokenKind.GtEq:
        return Ast.OpBin.GtEq;
      case TokenKind.LtEq:
        return Ast.OpBin.LtEq;
      case TokenKind.Gt:
        return Ast.OpBin.Gt;
      case TokenKind.Lt:
        return Ast.OpBin.Lt;

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

  private eatIf(kind: TokenKind) {
    const tok = this.tok0;
    if (tok.kind === kind) {
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
      if (parsed === Skip) {
        this.nextToken();
        continue;
      }

      if (parsed === null) {
        end = this.tok0.span;
        break;
      }

      series.push(parsed);
      end = parsed.span;

      if (delim !== undefined) {
        if (!this.eatIf(delim)) break;
        // check if the delim is repeated  // [1 ,,]
        if (this.eatIf(delim)) throw new Error('Extra separator'); // todo use parse error
      }
    }

    return [series, start.merge(end)];
  }
}

type SeriesParseFn<R extends Spannable> = () => R | null | SkipToken;
