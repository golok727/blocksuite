import {
  CHAR_IS_DIGIT,
  CHAR_IS_VALID_NAME,
  CHAR_IS_VALID_NAME_START,
  CHAR_IS_VALID_NUMBER_LITERAL,
  EOF_CHAR,
} from './constants.js';
import { Span, SrcSpan } from './span.js';
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
  constructor(public source: string) {
    this.source = this.normalizeString(source);
    this.chars = new Cursor(this.normalizeString(this.source));
    this.location = this.chars.range;
  }

  next(): Token {
    this.beginRange();
    return this.consume();
  }

  private get span() {
    return new SrcSpan(this.location, this.location + this.chars.range);
  }

  private beginRange() {
    this.location += this.chars.range;
    this.chars.resetRange();
  }

  private consume(): Token {
    const cur = this.chars.next();
    switch (cur) {
      case EOF_CHAR:
        return new Token(TokenKind.Eof, this.span);

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
        return this.consumeSymbol(cur);
      default: {
        if (CHAR_IS_DIGIT.test(cur)) {
          return this.consumeNumberLiteral(cur);
        } else {
          if (CHAR_IS_VALID_NAME_START.test(cur)) {
            const name = this.parseName(cur);
            const keyword = this.getKeyword(name);
            if (keyword) {
              return new Token(keyword, this.span);
            }
            return new Token(TokenKind.Name, this.span); // todo should contain the name
          }
        }

        // check for identifiers
        // check for other stuff
        return new Token(TokenKind.Unknown, Span(0, 0));
      }
    }
  }

  private parseName(start: string): string {
    let name = start;
    this.chars.eatWhile(c => {
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

  private consumeNumberLiteral(start: string): Token {
    // TODO make this better with float
    const next = this.chars.peekNext();
    let base: 2 | 8 | 10 | 16 = 10;

    let parsed = '';
    if (start === '0' && ['b', 'x', 'o'].includes(next.toLowerCase())) {
      // TODO add error checks for invalid prefix
      base = this.baseMap[next.toLowerCase()];
      this.chars.next();
      parsed = this.parseNumberLiteral('');
    } else {
      parsed = this.parseNumberLiteral(start);
    }

    const num = parseInt(parsed, base);
    if (isNaN(num)) {
      throw new Error('Invalid number literal');
    }

    return new LiteralToken<number>(TokenKind.Number, this.span, num);
  }

  private parseNumberLiteral(start: string) {
    this.chars.eatWhile(c => {
      if (!CHAR_IS_VALID_NUMBER_LITERAL.test(c)) return false;

      if (c !== '_') start += c;
      return true;
    });
    return start;
  }

  private consumeStringLiteral(mode: string) {
    if (!['"', "'", '`'].includes(mode)) {
      throw new Error('Unexpected mode required " | \' | `');
    }

    let str = '';
    const isTemplate = mode === '`';

    this.chars.eatWhile(s => {
      if (s === mode || (!isTemplate && s === '\n')) return false;
      str += s;
      return true;
    });

    this.chars.next(); // TODO throw error if next is not mode

    return new LiteralToken<string>(
      isTemplate ? TokenKind.FormatString : TokenKind.String,
      this.span,
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
      // TODO may be add error if eof
      this.chars.next(); // eat *
      this.chars.next(); // eat /
    }

    return new Token(TokenKind.Comment, this.span);
  }

  private consumeSymbol(symbol: string) {
    const tokenKind = SymbolToTokenKindMap[symbol];
    if (tokenKind === undefined) throw new Error(`Unexpected symbol ${symbol}`);
    return new Token(tokenKind, this.span); // Add position
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
        const value = clone.next();
        if (value.kind === TokenKind.Eof) done = true;
        return { value, done };
      },
    };
  }
}
