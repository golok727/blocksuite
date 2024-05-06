import type { Token } from './token.js';
import { Cursor } from './utils/cursor.js';

export class Lexer {
  private chars: Cursor;
  private loc = { start: 0, end: 0 };

  constructor(source: string) {
    this.chars = new Cursor(source);
  }

  get start() {
    return this.loc.start;
  }

  get end() {
    return this.loc.end;
  }

  next(): Token | undefined {
    this.chars.resetRange();

    return this.consume();
  }

  private consume(): Token | undefined {
    const cur = this.chars.next();
    console.log(cur);
    return undefined;
  }

  // private isIdentStart(_c: string) {}
}
