import { describe, expect, test } from 'vitest';

import { Cursor } from '../../../database-block/formula/cursor.js';
import { SrcSpan } from '../../../database-block/formula/span.js';

describe('Cursor simple test', () => {
  test('Peeking', () => {
    const src = `
    let x = 10
    return x + 1
    `;
    const cur = new Cursor(src.trim());

    expect([cur.peekNext(), cur.peekNext2(), cur.peekNext3()]).toEqual(
      'let'.split('')
    );
  });

  test('traverse to the end', () => {
    const src = `
    let x = 10
    return x + 1
    `;

    const cur = new Cursor(src);
    let acc = '';
    while (!cur.isEOF()) {
      const item = cur.eat();
      acc += item;
    }
    expect(src).toBe(acc);
  });

  test('eat while', () => {
    const cur = new Cursor('"BlockSuite"');
    let str = '';
    while (!cur.isEOF()) {
      const item = cur.eat();
      if (item === '"') {
        cur.eatWhile(s => {
          if (s === '"') return false;

          str += s;
          return true;
        });
      }
    }
    expect(str).toBe('BlockSuite');
  });

  test('range', () => {
    const source = 'Block Suite';
    const cur = new Cursor(source);
    const tokens: { item: string; span: SrcSpan }[] = [];

    let cumulativeRange = cur.range;
    let str = '';
    for (let i = 0; i < 'block'.length; i++) {
      str += cur.eat();
    }

    tokens.push({
      item: str,
      span: new SrcSpan(cumulativeRange, cumulativeRange + cur.range),
    });

    cur.eat(); // space
    cumulativeRange = cur.range;

    cur.resetRange();

    str = '';
    for (let i = 0; i < 'suite'.length; i++) {
      str += cur.eat();
    }

    tokens.push({
      item: str,
      span: new SrcSpan(cumulativeRange, cumulativeRange + cur.range),
    });

    expect(
      tokens.map(({ span }) => source.slice(span.start, span.end)).join(' ')
    ).toBe(source);
  });
});
