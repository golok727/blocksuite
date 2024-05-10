import { describe, expect, test } from 'vitest';

import {
  Ident,
  NameDeclaration,
  NameDeclarationType,
  NameDeclarator,
} from '../../database-block/formula/ast/index.js';
import { Lexer } from '../../database-block/formula/parser/lexer.js';
import { Parser } from '../../database-block/formula/parser/parser.js';
import { SrcSpan } from '../../database-block/formula/span.js';

describe('Parser', () => {
  test('Name declaration', () => {
    const src = `const radha = "krsna", krsna = "radha"
    let hello = "world", thing
    `;
    console.log(src.slice(0, 38));
    console.log(src.slice(0, 39));
    const lex = new Lexer(src);
    const parser = new Parser(lex);
    const parsed = parser.parse();
    const body = [
      new NameDeclaration(
        [
          new NameDeclarator(
            new Ident('radha', new SrcSpan(6, 11)),
            null,
            new SrcSpan(6, 21)
          ),

          new NameDeclarator(
            new Ident('krsna', new SrcSpan(23, 28)),
            null,
            new SrcSpan(23, 38)
          ),
        ],
        NameDeclarationType.Const,
        new SrcSpan(0, 38)
      ),

      new NameDeclaration(
        [
          new NameDeclarator(
            new Ident('hello', new SrcSpan(47, 52)),
            null,
            new SrcSpan(47, 62)
          ),

          new NameDeclarator(
            new Ident('thing', new SrcSpan(64, 69)),
            null,
            new SrcSpan(64, 69)
          ),
        ],
        NameDeclarationType.Let,
        new SrcSpan(43, 69)
      ),
    ];

    const expected = {
      formula: {
        type: 'formula',
        body,
        span: new SrcSpan(0, 70),
      },
      span: new SrcSpan(0, src.length),
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
});
