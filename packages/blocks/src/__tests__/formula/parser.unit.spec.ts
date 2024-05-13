import { describe, expect, test } from 'vitest';

import {
  BinOp,
  ExprBinary,
  ExprKind,
  ExprLit,
  ExprLocalAssignment,
  ExprNegateNumber,
  Ident,
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
          new ExprLocalAssignment(
            new Ident('radha', new SrcSpan(4, 9)),
            new ExprLit('krsna', new SrcSpan(12, 19)),
            new SrcSpan(4, 19)
          ),

          new ExprLocalAssignment(
            new Ident('krsna', new SrcSpan(21, 26)),
            new ExprLit('radha', new SrcSpan(29, 36)),
            new SrcSpan(21, 36)
          ),
        ],
        new SrcSpan(0, 36)
      ),

      new StmtLocal(
        [
          new ExprLocalAssignment(
            new Ident('hello', new SrcSpan(45, 50)),
            new ExprLit('world', new SrcSpan(53, 60)),
            new SrcSpan(45, 60)
          ),

          new ExprLocalAssignment(
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

    {
      const src = `let a = `;
      const lex = new Lexer(src);
      const parser = new Parser(lex);
      expect(() => parser.parse()).toThrow('Expected an expr after = ');
    }
  });

  test('expression 1', () => {
    const src = `2 + 4 * 2 ** 10`;
    const parser = new Parser(new Lexer(src));
    const res = parser.parse().formula.body;
    const expected = [
      new StmtExpr(
        new ExprBinary(
          new ExprLit(2, new SrcSpan(0, 1)),
          BinOp.Add,
          new ExprBinary(
            new ExprLit(4, new SrcSpan(4, 5)),
            BinOp.Mul,
            new ExprBinary(
              new ExprLit(2, new SrcSpan(8, 9)),
              BinOp.Exp,
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

  test('expression 2', () => {
    const src = `2 + value`;
    const parser = new Parser(new Lexer(src));
    const res = parser.parse().formula.body;

    const expected = [
      new StmtExpr(
        new ExprBinary(
          new ExprLit(2, new SrcSpan(0, 1)),
          BinOp.Add,
          new Ident('value', new SrcSpan(4, 9)),
          new SrcSpan(0, 9)
        ),
        new SrcSpan(0, 9)
      ),
    ];

    expect(res).toEqual(expected);
  });

  test('expression 3', () => {
    const src = `"Hello" + world + 3`;
    const parser = new Parser(new Lexer(src));
    const res = parser.parse().formula.body;

    const expected = [
      new StmtExpr(
        new ExprBinary(
          new ExprBinary(
            new ExprLit('Hello', new SrcSpan(0, 7)),
            BinOp.Add,
            new Ident('world', new SrcSpan(10, 15)),
            new SrcSpan(0, 15)
          ),
          BinOp.Add,
          new ExprLit(3, new SrcSpan(18, 19)),
          new SrcSpan(0, 19)
        ),
        new SrcSpan(0, 19)
      ),
    ];

    expect(res).toEqual(expected);
  });

  test('group 1', () => {
    const src = '(-1 + 2 + 3) + 2';
    const parsed = Parser.parse(src).formula.body;
    const expected = [
      new StmtExpr(
        new ExprBinary(
          new ExprBinary(
            new ExprBinary(
              new ExprNegateNumber(
                new ExprLit(1, new SrcSpan(2, 3)),
                new SrcSpan(1, 3)
              ),
              BinOp.Add,
              new ExprLit(2, new SrcSpan(6, 7)),
              new SrcSpan(1, 7)
            ),
            BinOp.Add,
            new ExprLit(3, new SrcSpan(10, 11)),
            new SrcSpan(1, 11)
          ),
          BinOp.Add,
          new ExprLit(2, new SrcSpan(15, 16)),
          new SrcSpan(1, src.length)
        ),
        new SrcSpan(1, src.length)
      ),
    ];
    expect(parsed).toEqual(expected);
  });

  test('ternary', () => {
    const src = `hello == "world" ? world == "hello" ? "HelloWorld" :  1 : 122`;
    const parsed = Parser.parse(src).formula.body;
    // todo check
    // console.log(parsed);
    expect((parsed[0] as StmtExpr).expr.kind).toBe(ExprKind.If);
  });

  test('range', () => {
    const src = '1+1.=10+2';
    const parsed = Parser.parse(src).formula.body;
    // todo
    expect((parsed[0] as StmtExpr).expr.kind).toBe(ExprKind.Range);
  });

  test('block', () => {
    const src = `
      let a = 10
      { 
        let a = "Hello"
        let thing = "thing"
      }
      let world = "hello"
     
    `;
    const parsed = Parser.parse(src).formula.body;
    expect(parsed.length).toBe(3);
  });
});
