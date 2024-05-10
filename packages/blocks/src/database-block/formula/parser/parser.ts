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
  private tokCur: Token;
  private tokNxt: Token;

  private line: number = 0;

  constructor(public readonly lex: Lexer) {
    /*   
    my be in future we can have different modes like formula or script
   */
    this.tokCur = this.lex.advance();
    this.tokNxt = this.lex.advance();
  }

  isEof() {
    return this.tokCur.kind === TokenKind.Eof;
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
    switch (this.tokCur.kind) {
      case TokenKind.Eof:
        return null;

      case TokenKind.Let:
      case TokenKind.Const:
        return this.parseLocal();

      case TokenKind.Fn:
        return Skip;

      default:
        return Skip; // todo parse expr and map it into a expr
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

    if (this.eatOneIf(TokenKind.Eq)) {
      bindingSpan.merge(this.tokCur.span);

      // todo we will change this with a expression parser
      while (
        !this.isEof() &&
        this.tokCur.kind !== TokenKind.Comma &&
        this.tokCur.kind !== TokenKind.NewLine &&
        this.tokCur.kind !== TokenKind.Semi
      ) {
        bindingSpan.mergeMut(this.nextToken().span);
      }

      return new Ast.ExprLocalAssign(ident, null, bindingSpan); // todo parse
    } else {
      // trailing comma
      if (
        this.tokCur.kind === TokenKind.Comma &&
        this.tokNxt.kind !== TokenKind.Name
      )
        throw new Error('Trailing commas are not allowed');

      return new Ast.ExprLocalAssign(ident, null, bindingSpan); // uninitialized var
    }
  };

  // -- PARSER

  private nextToken() {
    const tok = this.tokCur;

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

    this.tokCur = this.tokNxt;
    this.tokNxt = nxt;
    return tok;
  }

  private eatOneIf(kind: TokenKind) {
    const tok = this.tokCur;
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
    const start = this.tokCur.span;
    let end = this.tokCur.span;
    for (;;) {
      const parsed = parse();
      if (parsed === Skip) {
        this.nextToken();
        continue;
      }

      if (parsed === null) {
        end = this.tokCur.span;
        break;
      }

      series.push(parsed);
      end = parsed.span;

      if (delim !== undefined) {
        if (!this.eatOneIf(delim)) break;
        // check if the delim is repeated  // [1 ,,]
        if (this.eatOneIf(delim)) throw new Error('Extra separator'); // todo use parse error
      }
    }

    return [series, start.merge(end)];
  }
}

type SeriesParseFn<R extends Spannable> = () => R | null | SkipToken;
