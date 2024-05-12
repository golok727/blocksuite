import { describe, expect, test } from 'vitest';

import {
  ExprLocalAssign,
  Ident,
  LocalType,
  StmtLocal,
} from '../../database-block/formula/ast/index.js';
import { Lexer } from '../../database-block/formula/parser/lexer.js';
import { Parser } from '../../database-block/formula/parser/parser.js';
import { SrcSpan } from '../../database-block/formula/span.js';

describe('Parser', () => {
  test('Basic', () => {
    const src = `const radha = "krsna", krsna = "radha"
    let hello = "world", thing`;

    const lex = new Lexer(src);
    const parser = new Parser(lex);
    const parsed = parser.parse();
    const body = [
      new StmtLocal(
        [
          new ExprLocalAssign(
            new Ident('radha', new SrcSpan(6, 11)),
            null,
            new SrcSpan(6, 21)
          ),

          new ExprLocalAssign(
            new Ident('krsna', new SrcSpan(23, 28)),
            null,
            new SrcSpan(23, 38)
          ),
        ],
        LocalType.Const,
        new SrcSpan(0, 38)
      ),

      new StmtLocal(
        [
          new ExprLocalAssign(
            new Ident('hello', new SrcSpan(47, 52)),
            null,
            new SrcSpan(47, 62)
          ),

          new ExprLocalAssign(
            new Ident('thing', new SrcSpan(64, 69)),
            null,
            new SrcSpan(64, 69)
          ),
        ],
        LocalType.Let,
        new SrcSpan(43, 69)
      ),
    ];

    const expected = {
      formula: {
        type: 'formula',
        body,
        span: new SrcSpan(0, src.length),
      },
    };

    expect(parsed).toEqual(expected);
  });

  test('bad name declaration', () => {
    // const or let with bad name
    {
      const src = `const 1123`;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Expected a name');
    }

    {
      const src = `let`;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Expected a name');
    }

    // with trailing comma
    {
      const src = `const a,`;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Trailing commas are not allowed');
    }
  });

  test('expression', () => {
    const src = `2 + 4 * 2 ** 10
    let a = 10
    let b = "hello"`;
    const parser = new Parser(new Lexer(src));
    const res = parser.parse().formula.body;
    console.log(res);
  });
});
