import type { Token } from './token.js';
import { Cursor } from './utils/cursor.js';

export class Lexer extends Cursor {
  constructor(source: string) {
    super(source);
  }

  next(): Token {
    // let c = this.eat();
    // match pattern
    throw new Error('un implemented');
  }
}
