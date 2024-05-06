import {
  CHAR_IS_VALID_NAME,
  CHAR_IS_VALID_NAME_START,
  CHAR_IS_VALID_NUMBER_LITERAL,
  EOF_CHAR,
} from './constants.js';
import { LexErrorCode } from './exceptions/codes.js';
import { BlockScriptError } from './exceptions/error.js';
import { SrcSpan } from './span.js';
import {
  KeywordToTokenKindMap,
  LiteralToken,
  SymbolToTokenKindMap,
  Token,
  TokenKind,
} from './token.js';
import { Cursor } from './utils/cursor.js';

export class Lexer {
  private chars: Cursor;
  private location: number;

  // @ts-ignore
  private chr: string = EOF_CHAR;
  constructor(public source: string) {
    this.source = normalizeString(source);
    this.chars = new Cursor(this.source);
    this.location = this.chars.range;
    this.nextChar();
  }

  advance(): Token {
    const token = this.consume();

    // reset
    this.beginRange();
    this.nextChar();

    return token;
  }

  private get span() {
    return new SrcSpan(this.location, this.location + this.chars.range);
  }

  private nextChar() {
    this.chr = this.chars.next();
  }

  private eatWhile(f: (c: string) => boolean) {
    this.chars.eatWhile(c => {
      const v = f(c);
      if (v) this.chr = c;
      return v;
    });
  }

  private beginRange() {
    this.location += this.chars.range;
    this.chars.resetRange();
  }

  private consume(): Token {
    const c = this.chr;
    switch (c) {
      case EOF_CHAR:
        return new Token(TokenKind.Eof, this.span);

      case "'":
      case '"':
      case '`': {
        return this.consumeStringLiteral();
      }

      case '/': {
        const next = this.chars.peekNext();

        if (next === '*' || next === '/')
          return this.consumeComment(next === '*' ? 'block' : 'inline');

        return this.consumeSymbol(c);
      }
      case '!': {
        if (this.chars.peekNext() === '=') {
          return this.consumeSymbol('!=');
        }
        return this.consumeSymbol(c);
      }
      case '=': {
        const next = this.chars.peekNext();

        if (next === '=' || next == '>') {
          this.nextChar();
          return this.consumeSymbol(c + next);
        }

        return this.consumeSymbol(c);
      }
      case '<':
      case '>': {
        const next = this.chars.peekNext();
        if (next === '=') {
          this.nextChar();
          return this.consumeSymbol(c + next);
        }
        return this.consumeSymbol(c);
      }
      case '.': {
        let count = 1;

        this.eatWhile(c => {
          if (c === '.' && count < 3) {
            count++;
            return true;
          }
          return false;
        });

        if (count <= 3) {
          return this.consumeSymbol(c.repeat(count));
        }

        throw new Error('Unreachable code detected @consume(.)');
      }
      case '-': {
        if (this.chars.peekNext() === '>') {
          this.nextChar();
          return this.consumeSymbol('->');
        }
        return this.consumeSymbol(c);
      }
      case '@':
      case ':':
      case ';':
      case '&':
      case '|':
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
        return this.consumeSymbol(c);
      default: {
        if (isDigit(c)) {
          return this.consumeNumberLiteral();
        } else {
          if (CHAR_IS_VALID_NAME_START.test(c)) {
            const name = this.parseName();
            const keyword = this.getKeyword(name);
            if (keyword) {
              return new Token(keyword, this.span);
            }
            return new LiteralToken<string>(TokenKind.Name, this.span, name); // todo should contain the name
          }
        }

        throw BlockScriptError.LexError(
          LexErrorCode.UnexpectedToken,
          `Unexpected token ${c}`
        );
      }
    }
  }

  private parseName(): string {
    let name = this.chr;
    this.eatWhile(c => {
      if (!CHAR_IS_VALID_NAME.test(c)) return false;
      name += c;
      return true;
    });
    return name;
  }

  private getKeyword(maybeKeyword: string): TokenKind | null {
    return KeywordToTokenKindMap[maybeKeyword] ?? null;
  }

  private baseMap = {
    b: 2,
    o: 8,
    x: 16,
  } as Record<string, 2 | 8 | 10 | 16>;

  private consumeNumberLiteral(): Token {
    const stringContent = this.chr;
    const next = this.chars.peekNext();
    let base: 2 | 8 | 10 | 16 = 10;

    let parsed = '';
    if (stringContent === '0' && ['b', 'x', 'o'].includes(next.toLowerCase())) {
      // TODO add error checks for invalid prefix
      base = this.baseMap[next.toLowerCase()];
      this.nextChar();
      parsed = this.parseNumberLiteral('');
    } else {
      parsed = this.parseNumberLiteral(stringContent);
    }

    const num = parseInt(parsed, base);
    if (isNaN(num)) {
      throw new Error('Invalid number literal');
    }

    return new LiteralToken<number>(TokenKind.Number, this.span, num);
  }

  // private parseDecimal() {}

  // private parseFloat() {}

  // private parseHex() {}

  // private parseOct() {}

  private parseNumberLiteral(start: string) {
    this.eatWhile(c => {
      if (!CHAR_IS_VALID_NUMBER_LITERAL.test(c)) return false;

      if (c !== '_') start += c;
      return true;
    });
    return start;
  }

  private consumeStringLiteral() {
    const mode = this.chr;
    if (!['"', "'", '`'].includes(mode)) {
      throw new Error('Unexpected mode required " | \' | `');
    }

    let stringContent = '';
    const isTemplate = mode === '`';

    this.eatWhile(c => {
      // Todo escape characters
      if (c === mode || (!isTemplate && c === '\n')) return false;
      stringContent += c;
      return true;
    });

    this.nextChar(); // TODO throw error if next is not mode

    return new LiteralToken<string>(
      isTemplate ? TokenKind.FormatString : TokenKind.String,
      this.span,
      stringContent
    );
  }

  private consumeComment(mode: 'inline' | 'block') {
    if (mode === 'inline') {
      this.eatWhile(s => {
        return s !== '\n';
      });
    } else {
      if (this.chars.peekNext() !== '*')
        throw new Error('Invalid block comment'); // should't happen but who knows
      this.nextChar();
      this.eatWhile(c => {
        return !(c === '*' && this.chars.peekNext2() === '/');
      });
      // TODO may be add error if eof
      this.nextChar();
      this.nextChar();
    }

    return new Token(TokenKind.Comment, this.span);
  }

  private consumeSymbol(symbol: string) {
    const tokenKind = SymbolToTokenKindMap[symbol];
    if (tokenKind === undefined) throw new Error(`Unexpected symbol ${symbol}`);
    return new Token(tokenKind, this.span); // Add position
  }

  [Symbol.iterator](): Iterator<Token<unknown>> {
    const clone = new Lexer(this.source);

    let done = false;
    return {
      next() {
        const value = clone.advance();
        if (value.kind === TokenKind.Eof) done = true;
        return { value, done };
      },
    };
  }
}

export function isValidNumberChar(c: string) {
  return c === '_' || (c >= '0' && c <= '9');
}

export function isDigit(c: string) {
  return c >= '0' && c <= '9';
}

function normalizeString(str: string) {
  return str.replaceAll(/\r\n/g, '\n');
}
