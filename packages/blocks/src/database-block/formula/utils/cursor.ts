import { EOF_CHAR } from '../constants.js';
import { Peekable } from './index.js';

/**
 * Represents a cursor for traversing a source string character by character.
 */
export class Cursor {
  private chars: Peekable<string>;
  private tokensToEat: number;

  constructor(public readonly source: string) {
    this.chars = new Peekable(source.split(''));
    this.tokensToEat = this.chars.remaining;
  }

  get range() {
    return this.tokensToEat - this.chars.remaining;
  }

  resetRange() {
    this.tokensToEat = this.chars.remaining;
  }

  peekNext(): string {
    return this.chars.peek() ?? EOF_CHAR;
  }

  peekNext2(): string {
    const iter = this.chars.clone();
    iter.next();
    return iter.peek() ?? EOF_CHAR;
  }

  peekNext3(): string {
    const iter = this.chars.clone();
    iter.next();
    iter.next();
    return iter.peek() ?? EOF_CHAR;
  }

  next() {
    return this.chars.next() ?? EOF_CHAR;
  }

  eatWhile(f: (s: string) => boolean) {
    while (!this.isEOF() && f(this.peekNext())) {
      this.chars.next();
    }
  }

  toString() {
    return this.chars.fold((str, c) => str + c, '');
  }

  isEOF() {
    return this.chars.done();
  }
}
