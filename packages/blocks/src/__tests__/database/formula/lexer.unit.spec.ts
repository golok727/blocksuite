import { describe, test } from 'vitest';

import { Lexer } from '../../../database-block/formula/lexer.js';

describe('Lexer', () => {
  test('token gen', () => {
    const src = `let x = 10`;
    const lex = new Lexer(src);
    lex.next();
    lex.next();
  });
});
