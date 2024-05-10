import * as Ast from '../ast/index.js';
import { SrcSpan } from '../span.js';
import type { LiteralToken } from '../token.js';
import type { Token } from '../token.js';
import { TokenKind } from '../token.js';
import type { Lexer } from './lexer.js';

const Skip = Symbol('skip_token');
type SkipToken = typeof Skip;

export interface Parsed {
  formula: Ast.Formula;
  span: SrcSpan;
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
      span: new SrcSpan(0, this.lex.source.length),
    };
  }

  private parseFormula(): Ast.Formula {
    const [body, span] = this.series<Ast.Item>(this.parseStatements);

    const formula: Ast.Formula = {
      type: 'formula',
      body: body,
      span, // span of the body excluding white spaces
    };

    return formula;
  }

  private parseStatements: SeriesParseFn<Ast.Item> = () => {
    switch (this.tok0.kind) {
      case TokenKind.Eof:
        return null;

      case TokenKind.Let:
      case TokenKind.Const:
        return this.parseNameDeclaration();

      default:
        this.nextToken();
        return Skip;
    }
  };

  private parseNameDeclaration() {
    const letOrConst = this.nextToken(); // eat let or const

    const type =
      letOrConst.kind === TokenKind.Let
        ? Ast.NameDeclarationType.Let
        : Ast.NameDeclarationType.Const;

    const [declarations, span] = this.series(
      this.parseDeclarator,
      TokenKind.Comma
    );

    const declarationsSpan = letOrConst.span.clone();

    for (const decl of declarations) declarationsSpan.mergeMut(decl.span);
    console.log(declarationsSpan, span.merge(letOrConst.span));

    return new Ast.NameDeclaration(declarations, type, declarationsSpan);
  }

  private parseDeclarator: SeriesParseFn<Ast.NameDeclarator> = () => {
    // this will be terminated when the commas are over
    // make sure to stop the tok0 at a comma to parse the rest before returning
    const nameTok = this.nextToken() as LiteralToken<string>;

    if (nameTok.kind !== TokenKind.Name) throw new Error('Expected a name');

    const name = new Ast.Ident(nameTok.data, nameTok.span);

    const declaratorSpan = name.span.clone();

    if (this.eatOneIf(TokenKind.Eq)) {
      declaratorSpan.merge(this.tok0.span);

      // we will change this with a expression parser
      while (
        !this.isEof() &&
        this.tok0.kind !== TokenKind.Comma &&
        this.tok0.kind !== TokenKind.NewLine &&
        this.tok0.kind !== TokenKind.Semi
      ) {
        declaratorSpan.mergeMut(this.nextToken().span);
      }

      return new Ast.NameDeclarator(name, null, declaratorSpan); // todo parse
    } else {
      // trailing comma
      if (
        this.tok0.kind === TokenKind.Comma &&
        this.tok1.kind !== TokenKind.Name
      )
        throw new Error('Trailing commas are not allowed');

      return new Ast.NameDeclarator(name, null, declaratorSpan); // uninitialized var
    }
  };

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

  private eatOneIf(kind: TokenKind) {
    const tok = this.tok0;
    if (tok.kind === kind) {
      return this.nextToken();
    }

    return null;
  }

  private series<R>(
    parse: SeriesParseFn<R>,
    delim?: TokenKind
  ): [result: R[], span: SrcSpan] {
    const series: R[] = [];
    const start = this.tok0.span;
    let end = this.tok0.span;
    for (;;) {
      const parsed = parse();
      if (parsed === Skip) continue;
      if (parsed === null) break;

      series.push(parsed);
      end = this.tok0.span;

      if (delim !== undefined) {
        if (!this.eatOneIf(delim)) break;
        // check if the delim is repeated  // [1 ,,]
        if (this.eatOneIf(delim)) throw new Error('Extra separator'); // todo use parse error
      }
    }

    return [series, start.merge(end)];
  }
}

type SeriesParseFn<R> = () => R | null | SkipToken;
