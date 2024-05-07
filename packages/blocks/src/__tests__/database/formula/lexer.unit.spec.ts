import { describe, test } from 'vitest';

import { Lexer } from '../../../database-block/formula/lexer/lexer.js';
import { TokenKind } from '../../../database-block/formula/token.js';

describe('Lexer', () => {
  test('token gen', () => {
    const src = String.raw`let a = 1_00_00_000`;

    const lex = new Lexer(src);
    const tokens = Array.from(lex).filter(
      token => ![TokenKind.Whitespace, TokenKind.NewLine].includes(token.kind)
    );
    const joined = tokens.map(({ span }) => src.slice(span.start, span.end));
    console.log(joined);
    console.log(tokens);
  });
});
