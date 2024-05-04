import { EOF_CHAR } from './constants.js';
import { PeekableIterator } from './utils/peekable.js';

export class Lexer {
  private chars: PeekableIterator<string>;
  private remainingTokens: number;

  constructor(public readonly source: string) {
    this.chars = new PeekableIterator(source.split(''));
    this.remainingTokens = this.chars.length;
  }

  get range() {
    return this.remainingTokens - this.chars.length;
  }

  resetRange() {
    this.remainingTokens = this.chars.length;
  }

  peek(): string {
    return this.chars.peek() ?? EOF_CHAR;
  }

  peek2(): string {
    const iter = this.chars.clone();
    iter.next();
    return iter.next() ?? EOF_CHAR;
  }

  peek3(): string {
    const iter = this.chars.clone();
    iter.next();
    iter.next();
    return iter.next() ?? EOF_CHAR;
  }

  advance() {
    return this.chars.next();
  }

  eatWhile(f: (s: string) => boolean) {
    while (!this.isEOF() && f(this.peek())) {
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
