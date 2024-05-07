import { EOF_CHAR } from './constants.js';
import { ParseErrorCode } from './exceptions/codes.js';
import { BlockFormulaError } from './exceptions/error.js';
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
    return (this.chr = this.chars.next());
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
        if (this.isNumberStart(c)) {
          return this.consumeNumberLiteral();
        } else {
          if (this.isNameStart(c)) {
            const name = this.parseName();
            const keyword = this.getKeyword(name);
            if (keyword) {
              return new Token(keyword, this.span);
            }
            return new LiteralToken<string>(TokenKind.Name, this.span, name);
          }
        }

        throw BlockFormulaError.ParseError(
          ParseErrorCode.UnexpectedToken,
          `Unexpected token ${c}`
        );
      }
    }
  }

  private parseName(): string {
    let name = this.chr;
    this.eatWhile(c => {
      if (!this.isNameContinuation(c)) return false;
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
      if (!this.isNumberContinuation(c)) return false;

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

    if (mode === '`') return this.consumeRawString();
    return this.consumeQuotedString(mode);
  }

  private consumeQuotedString(quote: string) {
    let stringContent = '';

    this.eatWhile(c => {
      if (c === '\\') {
        const next = this.chars.peekNext2();
        if (next === quote || next.match(/[fnrt\\]/)) {
          const escape = this.getEscapeCharacter(next);

          if (escape !== null) {
            stringContent += escape;
            this.nextChar(); // skip f,n,r,t..
          }
          return true;
        }
      }

      if (c === quote || c === '\n') return false;
      stringContent += c;
      return true;
    });

    if (this.nextChar() !== quote)
      throw BlockFormulaError.ParseError(
        ParseErrorCode.UnterminatedLiteral,
        'Bad termination of string'
      );

    return new LiteralToken<string>(TokenKind.String, this.span, stringContent);
  }

  private consumeRawString() {
    // template strings are raw
    let stringContent = '';
    this.eatWhile(c => {
      if (c !== '`') {
        stringContent += c;
        return true;
      }
      return false;
    });

    if (this.chars.peekNext() !== '`')
      throw BlockFormulaError.ParseError(
        ParseErrorCode.UnterminatedLiteral,
        'Bad termination of string'
      );

    this.nextChar(); // eat `

    return new LiteralToken<string>(
      TokenKind.RawString,
      this.span,
      stringContent
    );
  }

  private getEscapeCharacter(c: string): string {
    const escapeMap: Record<string, string> = {
      n: '\n',
      f: '\f',
      t: '\t',
      r: '',
      "'": "'",
      '"': '"',
      '`': '`',
      '\\': '\\',
    };
    return escapeMap[c] ?? null;
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

  private isNumberStart(c: string) {
    return c >= '0' && c <= '9';
  }

  private isNumberContinuation(c: string) {
    return c === '_' || (c >= '0' && c <= '9');
  }

  private isNameStart(c: string) {
    return c === '_' || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
  }

  private isNameContinuation(c: string) {
    return (
      c === '_' ||
      (c >= 'a' && c <= 'z') ||
      (c >= 'A' && c <= 'Z') ||
      (c >= '0' && c <= '9')
    );
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

function normalizeString(str: string) {
  return str.replaceAll(/\r\n/g, '\n');
}
