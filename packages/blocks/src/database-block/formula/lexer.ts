import { EOF_CHAR } from './constants.js';
import { Span } from './span.js';
import {
  LiteralToken,
  SymbolToTokenKindMap,
  Token,
  TokenKind,
} from './token.js';
import { Cursor } from './utils/cursor.js';

export class Lexer {
  private chars: Cursor;
  private loc = { start: 0, end: 0 };

  constructor(public source: string) {
    this.source = this.normalizeString(source);
    this.chars = new Cursor(this.normalizeString(this.source));
  }

  get start() {
    return this.loc.start;
  }

  get end() {
    return this.loc.end;
  }

  next(): Token {
    this.chars.resetRange();

    return this.consume();
  }

  private consume(): Token {
    const cur = this.chars.next();
    switch (cur) {
      case EOF_CHAR:
        return new Token(
          TokenKind.Eof,
          Span(this.chars.range, this.chars.range + 1)
        );

      case "'":
      case '"':
      case '`': {
        return this.consumeStringLiteral(cur);
      }

      case '/': {
        const next = this.chars.peekNext();

        if (next === '*' || next === '/')
          return this.consumeComment(next === '*' ? 'block' : 'inline');

        return this.consumeSymbol(cur);
      }
      case '!': {
        if (this.chars.peekNext() === '=') {
          return this.consumeSymbol('!=');
        }
        return this.consumeSymbol(cur);
      }
      case '=': {
        const next = this.chars.peekNext();

        if (next === '=' || next == '>') {
          this.chars.next();
          return this.consumeSymbol(cur + next);
        }

        return this.consumeSymbol(cur);
      }
      case '<':
      case '>': {
        const next = this.chars.peekNext();
        if (next === '=') {
          this.chars.next();
          return this.consumeSymbol(cur + next);
        }
        return this.consumeSymbol(cur);
      }
      case '&':
      case '|': {
        if (this.chars.peekNext() === cur) {
          this.chars.next();
          return this.consumeSymbol(cur + cur);
        }
        return this.consumeSymbol(cur);
      }
      case '.': {
        let count = 1;

        this.chars.eatWhile(c => {
          if (c === '.' && count < 3) {
            count++;
            return true;
          }
          return false;
        });

        if (count <= 3) {
          return this.consumeSymbol(cur.repeat(count));
        }

        throw new Error('Unreachable code detected @consume(.)');
      }
      case '-': {
        if (this.chars.peekNext() === '>') {
          this.chars.next();
          return this.consumeSymbol('->');
        }
        return this.consumeSymbol(cur);
      }
      case '@':
      case '%':
      case '^':
      case '(':
      case ')':
      case '[':
      case ']':
      case '{':
      case '}':
      case '+':
      case ',':
      case '*':
      case ' ':
      case '\n':
        return this.consumeSymbol(cur);
      default: {
        // check for identifiers
        // check for other stuff
        return new Token(TokenKind.Unknown, Span(0, 0));
      }
    }
  }

  private consumeStringLiteral(mode: string) {
    if (!['"', "'", '`'].includes(mode)) {
      throw new Error('Unexpected mode required " | \' | `');
    }

    let str = '';
    const isTemplate = '`';
    this.chars.eatWhile(s => {
      if (s === mode || (!isTemplate && s === '\n')) return false;
      str += s;
      return true;
    });

    this.chars.next(); // TODO throw error if next is not mode

    return new LiteralToken<string>(
      isTemplate ? TokenKind.String : TokenKind.FormatString,
      Span(0, 0),
      str
    );
  }
  private consumeComment(mode: 'inline' | 'block') {
    if (mode === 'inline') {
      this.chars.eatWhile(s => {
        return s !== '\n';
      });
    } else {
      if (this.chars.peekNext() !== '*')
        throw new Error('Invalid block comment'); // should't happen but who knows
      this.chars.next(); // eat *
      this.chars.eatWhile(c => {
        return !(c === '*' && this.chars.peekNext2() === '/');
      });
      this.chars.next();
      this.chars.next();
    }

    return new Token(TokenKind.Comment, Span(0, 0));
  }

  private consumeSymbol(symbol: string) {
    const tokenKind = SymbolToTokenKindMap[symbol];
    if (tokenKind === undefined) throw new Error(`Unexpected symbol ${symbol}`);
    return new Token(tokenKind, Span(this.chars.range, this.chars.range + 1)); // todo add a position
  }

  // private isIdentStart(_c: string) {}
  private normalizeString(str: string) {
    return str.replaceAll(/\r\n/g, '\n');
  }

  [Symbol.iterator](): Iterator<Token<unknown>> {
    const clone = new Lexer(this.source);

    let done = false;
    return {
      next() {
        const next = clone.next();
        if (next && next?.kind === TokenKind.Eof) done = true;
        return { value: clone.next(), done };
      },
    };
  }
}
