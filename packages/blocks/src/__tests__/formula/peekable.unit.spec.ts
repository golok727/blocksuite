import { describe, expect, test } from 'vitest';

import { Peekable } from '../../database-block/formula/utils/peekable.js';

describe('peekable test', () => {
  const values = [1, 2, 3, 4, 5, 6, 7];

  test('basic test', () => {
    const iter = new Peekable(values);
    expect(iter.peek()).toBe(1);
    expect(iter.next()).toBe(1);
    expect(iter.peek()).toBe(2);
  });

  test('can iterate till end', () => {
    const iter = new Peekable(values);
    const res: number[] = [];
    while (!iter.done()) {
      res.push(iter.next()!);
    }
    expect(values).toEqual(res);
  });

  test('done()', () => {
    const iter = new Peekable([1, 2]);
    expect(iter.done()).toBe(false);
    iter.next();
    iter.next();
    expect(iter.done()).toBe(true);
  });

  test('remaining', () => {
    const iter = new Peekable(values);
    const len = values.length;
    expect(iter.remaining).toBe(len);

    for (let i = 0; i < 3; i++) {
      iter.next();
    }

    while (!iter.done()) {
      iter.next();
    }

    expect(iter.remaining).toBe(0);
  });

  test('remaining should not go negative', () => {
    const iter = new Peekable(values);
    const len = values.length;

    for (let i = 0; i < len + 2; i++) {
      iter.next();
    }
    expect(iter.remaining).toBe(0);
  });

  test('clone', () => {
    const iter = new Peekable([1, 2, 3, 4]);
    const clone = iter.clone();
    iter.next();
    iter.next();
    clone.next();
    expect(iter.peek()).toBe(3);
    expect(clone.peek()).toBe(2);
  });

  test('toArray', () => {
    const iter = new Peekable(values);
    expect(iter.toArray()).toEqual(values);
  });

  test('map items', () => {
    const fruitsList = ['Apple', 'Banana', 'Orange'];
    const iter = new Peekable(fruitsList);
    const fn = (fruit: string, index: number) => `${index + 1}. ${fruit}`;
    const mapped = iter.map(fn);

    expect(mapped.toArray()).toEqual(fruitsList.map(fn));
    expect(iter.remaining, 'should not advance after mapping').toBe(
      fruitsList.length
    );
  });

  test('filter items', () => {
    const numsList = [1, 2, 3, 4, 5, 6, 7];
    const iter = new Peekable(numsList);
    const isOdd = (num: number) => num % 2 === 0;
    const onlyOddPeekable = iter.filter(isOdd);

    expect(onlyOddPeekable.toArray()).toEqual(numsList.filter(isOdd));

    expect(iter.remaining, 'should not advance after mapping').toBe(
      numsList.length
    );
  });

  test('skip n items', () => {
    const iter = new Peekable([1, 2, 3, 4]);
    expect(iter.skip(3).peek()).toBe(4);
  });
});
