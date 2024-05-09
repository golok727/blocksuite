import * as Ast from '../ast/index.js';
import { SrcSpan } from '../span.js';
import type { LiteralToken, Token } from '../token.js';
import { TokenKind } from '../token.js';
import type { Lexer } from './lexer.js';

const Skip = Symbol('skip_token');
type SkipToken = typeof Skip;

export interface Parsed {
  formula: Ast.Formula;
}

export class Parser {
  private tok0!: Token;
  private tok1!: Token;
  private line!: number;

  constructor(public readonly lex: Lexer) {
    /*   
    my be in future we can have different modes like formula or script
   */
    this.nextToken();
    this.nextToken();
  }

  isEof() {
    return this.tok0.kind === TokenKind.Eof;
  }

  parse() {
    return {
      formula: this.parseFormula(),
    };
  }

  private parseFormula(): Ast.Formula {
    const body = this.series<Ast.Statement>(this.parseStatements);
    const span = new SrcSpan(0, this.lex.source.length);

    const formula: Ast.Formula = {
      type: 'formula',
      body: body,
      span,
    };

    return formula;
  }

  private parseStatements: SeriesParseFn<Ast.Statement> = () => {
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
    const letOrConst = this.tok0;

    this.nextToken(); // eat let or const

    const type =
      letOrConst.kind === TokenKind.Let
        ? Ast.NameDeclarationType.Let
        : Ast.NameDeclarationType.Const;

    const declarations = this.parseDeclarations();

    const declarationsSpan = letOrConst.span.clone();

    for (const decl of declarations) declarationsSpan.mergeMut(decl.span);

    return new Ast.NameDeclaration(declarations, type, declarationsSpan);
  }

  private parseDeclarations(): Ast.NameDeclarator[] {
    return this.series(this.parseDeclarator, TokenKind.Comma);
  }

  private parseDeclarator: SeriesParseFn<Ast.NameDeclarator> = () => {
    // this will be terminated when the commas are over
    // make sure to stop the tok0 at a comma to parse the rest before returning
    const nameTok = this.tok0 as LiteralToken<string>;
    if (nameTok.kind !== TokenKind.Name) throw new Error('Expected a name');

    this.nextToken(); // eat name

    const name = new Ast.Name(nameTok.data, nameTok.span);

    const declaratorSpan = name.span.clone();

    const tok = this.tok0.kind;
    if (tok === TokenKind.Eq) {
      declaratorSpan.merge(this.tok0.span);
      this.nextToken();

      // we will change this with a expression parser
      while (
        !this.isEof() &&
        this.tok0.kind !== TokenKind.Comma &&
        this.tok0.kind !== TokenKind.NewLine
      ) {
        declaratorSpan.mergeMut(this.tok0.span);
        this.nextToken();
      }

      return new Ast.NameDeclarator(name, null, declaratorSpan); // todo parse
    } else {
      // trailing comma
      if (tok === TokenKind.Comma && this.tok1.kind !== TokenKind.Name)
        throw new Error('Trailing commas are not allowed');

      return new Ast.NameDeclarator(name, null, declaratorSpan); // uninitialized var
    }
  };

  private nextToken() {
    const tok = this.tok1;
    this.tok1 = this.lex.advance();
    this.tok0 = tok;
    return tok;
  }

  // PArsing

  private skipOneIf(kind: TokenKind) {
    if (this.tok0.kind === kind) {
      return this.nextToken();
    }
    return null;
  }

  private series<R>(parse: SeriesParseFn<R>, delim?: TokenKind): R[] {
    const series: R[] = [];

    for (;;) {
      const parsed = parse();
      if (parsed === Skip) continue;
      if (parsed === null) break;

      series.push(parsed);

      if (delim !== undefined) {
        if (!this.skipOneIf(delim)) break;
        // check if the delim is repeated  // [1 ,,]
        if (this.skipOneIf(delim)) throw new Error('Extra separator'); // todo use parse error
      }
    }
    return series;
  }
}

type SeriesParseFn<R> = () => R | null | SkipToken;
