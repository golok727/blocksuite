import { describe, test } from 'vitest';

import { Lexer } from '../../database-block/formula/parser/lexer.js';
import { Parser } from '../../database-block/formula/parser/parser.js';

describe('Parser', () => {
  test('basic', () => {
    const src = `1, 2, 3, 4`;
    const lex = new Lexer(src);
    const parser = new Parser(lex);
    console.log(parser.parse().formula.body);
  });
});
