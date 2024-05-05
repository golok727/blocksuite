import { describe, expect, test } from 'vitest';

import { PeekableIterator } from '../../../database-block/formula/utils/peekable.js';

describe('peekable test', () => {
  const values = [1, 2, 3, 4, 5, 6, 7];

  test('basic test', () => {
    const iter = new PeekableIterator(values);
    expect(iter.peek()).toBe(1);
    expect(iter.next()).toBe(1);
    expect(iter.peek()).toBe(2);
  });

  test('can iterate till end', () => {
    const iter = new PeekableIterator(values);
    const res: number[] = [];
    while (!iter.done()) {
      res.push(iter.next()!);
    }
    expect(values).toEqual(res);
  });

  test('done()', () => {
    const iter = new PeekableIterator([1, 2]);
    expect(iter.done()).toBe(false);
    iter.next();
    iter.next();
    expect(iter.done()).toBe(true);
  });

  test('remaining', () => {
    const iter = new PeekableIterator(values);
    const len = values.length;
    expect(iter.length).toBe(len);

    for (let i = 0; i < 3; i++) {
      iter.next();
    }

    while (!iter.done()) {
      iter.next();
    }

    expect(iter.length).toBe(0);
  });

  test('remaining should not go negative', () => {
    const iter = new PeekableIterator(values);
    const len = values.length;

    for (let i = 0; i < len + 2; i++) {
      iter.next();
    }
    expect(iter.length).toBe(0);
  });

  test('clone it', () => {
    const iter = new PeekableIterator([1, 2, 3, 4]);
    iter.next(); // eats 1
    const clone = iter.clone();
    expect(iter.peek()).toBe(clone.peek());

    // clone should not advance original
    clone.next();
    clone.next();
    expect(clone.peek()).not.toBe(iter.peek());
    expect(clone.peek()).toBe(4);
    expect(iter.peek()).toBe(2);
  });

  test('toArray', () => {
    const iter = new PeekableIterator(values);
    expect(iter.toArray()).toEqual(values);
  });

  test('map items', () => {
    const fruitsList = ['Apple', 'Banana', 'Orange'];
    const iter = new PeekableIterator(fruitsList);
    const fn = (fruit: string, index: number) => `${index + 1}. ${fruit}`;
    const mapped = iter.map(fn);

    expect(mapped.toArray()).toEqual(fruitsList.map(fn));
    expect(iter.length, 'should not advance after mapping').toBe(
      fruitsList.length
    );
  });

  test('filter items', () => {
    const numsList = [1, 2, 3, 4, 5, 6, 7];
    const iter = new PeekableIterator(numsList);
    const isOdd = (num: number) => num % 2 === 0;
    const onlyOddPeekable = iter.filter(isOdd);

    expect(onlyOddPeekable.toArray()).toEqual(numsList.filter(isOdd));

    expect(iter.length, 'should not advance after mapping').toBe(
      numsList.length
    );
  });

  test('skip n items', () => {
    const iter = new PeekableIterator([1, 2, 3, 4]);
    expect(iter.skip(3).peek()).toBe(4);
  });
});
