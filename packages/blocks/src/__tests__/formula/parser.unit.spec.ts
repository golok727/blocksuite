import { describe, expect, test } from 'vitest';

import {
  ExprBin,
  ExprLit,
  ExprLocalAssign,
  Ident,
  OpBin,
  StmtExpr,
  StmtLocal,
} from '../../database-block/formula/ast/index.js';
import { Lexer } from '../../database-block/formula/parser/lexer.js';
import { Parser } from '../../database-block/formula/parser/parser.js';
import { SrcSpan } from '../../database-block/formula/span.js';

describe('Parser', () => {
  test('Basic', () => {
    const src = `let radha = "krsna", krsna = "radha"
    let hello = "world", thing`;

    const lex = new Lexer(src);
    const parser = new Parser(lex);
    const parsed = parser.parse();
    const body = [
      new StmtLocal(
        [
          new ExprLocalAssign(
            new Ident('radha', new SrcSpan(4, 9)),
            null,
            new SrcSpan(4, 19)
          ),

          new ExprLocalAssign(
            new Ident('krsna', new SrcSpan(21, 26)),
            null,
            new SrcSpan(21, 36)
          ),
        ],
        new SrcSpan(0, 36)
      ),

      new StmtLocal(
        [
          new ExprLocalAssign(
            new Ident('hello', new SrcSpan(45, 50)),
            null,
            new SrcSpan(45, 60)
          ),

          new ExprLocalAssign(
            new Ident('thing', new SrcSpan(62, 67)),
            null,
            new SrcSpan(62, 67)
          ),
        ],
        new SrcSpan(41, 67)
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
    {
      const src = `let`;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Expected a name');
    }

    // with trailing comma
    {
      const src = `let a,`;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Trailing commas are not allowed');
    }
  });

  test('expression', () => {
    const src = `2 + 4 * 2 ** 10`;
    const parser = new Parser(new Lexer(src));
    const res = parser.parse().formula.body;
    const expected = [
      new StmtExpr(
        new ExprBin(
          new ExprLit(2, new SrcSpan(0, 1)),
          OpBin.Add,
          new ExprBin(
            new ExprLit(4, new SrcSpan(4, 5)),
            OpBin.Mul,
            new ExprBin(
              new ExprLit(2, new SrcSpan(8, 9)),
              OpBin.Exp,
              new ExprLit(10, new SrcSpan(13, 15)),
              new SrcSpan(8, 15)
            ),
            new SrcSpan(4, 15)
          ),
          new SrcSpan(0, 15)
        ),
        new SrcSpan(0, 15)
      ),
    ];
    expect(res).toEqual(expected);
  });
});
