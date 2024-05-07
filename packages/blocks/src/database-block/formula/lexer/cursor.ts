import { EOF_CHAR } from '../constants.js';
import { Peekable } from './index.js';

/**
 * Represents a cursor for traversing a source string character by character.
 */

export class Cursor<Item> {
  private chars: Peekable<Item>;
  private tokensToEat: number;

  constructor(iterable: Iterable<Item>) {
    this.chars = new Peekable(iterable);
    this.tokensToEat = this.chars.remaining;
  }

  get range() {
    return this.tokensToEat - this.chars.remaining;
  }

  resetRange() {
    this.tokensToEat = this.chars.remaining;
  }

  peekNext() {
    return this.chars.peek();
  }

  peekNext2() {
    const iter = this.chars.clone();
    iter.next();
    return iter.peek();
  }

  peekNext3() {
    const iter = this.chars.clone()!;
    iter.next();
    iter.next();
    return iter.peek();
  }

  next() {
    return this.chars.next() ?? EOF_CHAR;
  }

  eatWhile(f: (s: Item | undefined) => boolean) {
    while (!this.isEOF() && f(this.peekNext())) {
      this.chars.next();
    }
  }

  toString() {
    return this.chars.fold((item, c) => item + c, '');
  }

  isEOF() {
    return this.chars.done();
  }
}
