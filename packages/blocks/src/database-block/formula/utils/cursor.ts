import { EOF_CHAR } from '../constants.js';
import { Peekable } from '../utils/index.js';

/**
 * Represents a cursor for traversing any iterable.
 */
export class Cursor<Item> {
  private items: Peekable<Item>;
  private tokensToEat: number;

  constructor(iterable: Iterable<Item>) {
    this.items = new Peekable(iterable);
    this.tokensToEat = this.items.remaining;
  }

  get range() {
    return this.tokensToEat - this.items.remaining;
  }

  resetRange() {
    this.tokensToEat = this.items.remaining;
  }

  peekNext() {
    return this.items.peek();
  }

  peekNext2() {
    const iter = this.items.clone();
    iter.next();
    return iter.peek();
  }

  peekNext3() {
    const iter = this.items.clone();
    iter.next();
    iter.next();
    return iter.peek();
  }

  next() {
    return this.items.next() ?? EOF_CHAR;
  }

  eatWhile(f: (s: Item | undefined) => boolean) {
    while (!this.isEOF() && f(this.peekNext())) {
      this.items.next();
    }
  }

  toString() {
    return this.items.fold((item, c) => item + c, '');
  }

  isEOF() {
    return this.items.done();
  }
}
