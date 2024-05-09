import { describe, test } from 'vitest';

import { Lexer } from '../../database-block/formula/parser/lexer.js';
import { Parser } from '../../database-block/formula/parser/parser.js';

describe('Parser', () => {
  test('basic', () => {
    const src = `const radha = "krsna"
       const krsna = 'radha'
       let hello = 1`;
    const lex = new Lexer(src);
    const parser = new Parser(lex);
    console.log(parser.parse().formula.body);
  });
});
