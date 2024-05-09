import type * as Ast from '../ast/index.js';
import type { Token } from '../token.js';
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

  parse(): Parsed {
    return {
      formula: this.parseFormula(),
    };
  }

  private parseFormula(): Ast.Formula {
    throw new Error('noop');
    // const body = this.series<Ast.Statement>(
    //   this.parseStatements,
    //   TokenKind.Comma
    // );
    // const span = body.reduce(
    //   (bodySpan, stmt) => stmt.span.merge(bodySpan),
    //   new SrcSpan(0, 0)
    // );
    // const formula: Ast.Formula = {
    //   type: 'formula',
    //   body,
    //   span,
    // };
    // return formula;
  }

  private nextToken() {
    const tok = this.tok1;
    this.tok1 = this.lex.advance();
    this.tok0 = tok;
    return tok;
  }

  // PArsing

  private skipOneIf(kind: TokenKind) {
    if (this.tok0.kind === TokenKind.Eof || this.tok0.kind === kind) {
      return this.nextToken();
    }
    return null;
  }

  private series<R>(parse: SeriesParseFn<R>, delim?: TokenKind): R[] {
    const series: R[] = [];
    const run = true;

    while (run) {
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
