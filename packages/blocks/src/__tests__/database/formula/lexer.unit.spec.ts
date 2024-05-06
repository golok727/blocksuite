import { describe, test } from 'vitest';

import { Lexer } from '../../../database-block/formula/lexer.js';
import { TokenKind } from '../../../database-block/formula/token.js';

describe('Lexer', () => {
  test('token gen', () => {
    const src = `let a = 'Hello  World'`;
    const lex = new Lexer(src);
    const tokens = Array.from(lex).filter(
      token => ![TokenKind.Whitespace, TokenKind.NewLine].includes(token.kind)
    );
    const joined = tokens.map(({ span }) => src.slice(span.start, span.end));
    console.log(joined);
    console.log(tokens);
  });
});
