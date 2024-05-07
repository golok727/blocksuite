import { describe, test } from 'vitest';

import { BlockFormulaError } from '../../../database-block/formula/exceptions/error.js';
import { Lexer } from '../../../database-block/formula/lexer/lexer.js';
import { TokenKind } from '../../../database-block/formula/token.js';

describe('Lexer', () => {
  test('token gen', () => {
    const src = String.raw`let apple = "Apple" /* asdasd */`;
    const lex = new Lexer(src);
    try {
      const tokens = Array.from(lex).filter(
        token => ![TokenKind.Whitespace, TokenKind.NewLine].includes(token.kind)
      );
      const joined = tokens.map(({ span }) => src.slice(span.start, span.end));
      console.log(joined);
      console.log(tokens);
    } catch (error) {
      // Todo implement a pretty printer
      if (error instanceof BlockFormulaError) {
        if (error.span && error.message) {
          const { start, end } = error.span;
          console.log(error.message);
          console.log(`Line: ` + src.slice(start, end));
          console.log(' '.repeat(end - start + 6) + '^');
          console.log(' '.repeat(end - start + 6) + error.cause);
        } else console.log('Error');
      }
    }
  });
});
