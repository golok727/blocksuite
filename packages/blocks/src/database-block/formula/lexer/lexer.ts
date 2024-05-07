import { EOF_CHAR, ESCAPE_CHARACTER_MAP } from '../constants.js';
import { SyntaxErrorCode } from '../exceptions/codes.js';
import { BlockFormulaError } from '../exceptions/error.js';
import { SrcSpan } from '../span.js';
import {
  KeywordToTokenKindMap,
  LiteralToken,
  SymbolToTokenKindMap,
  Token,
  TokenKind,
} from '../token.js';
import { Cursor } from './cursor.js';

export class Lexer {
  private chars: Cursor<string>;
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

  peekNext() {
    return this.chars.peekNext() ?? EOF_CHAR;
  }

  peekNext2() {
    return this.chars.peekNext2() ?? EOF_CHAR;
  }

  peekNext3() {
    return this.chars.peekNext3() ?? EOF_CHAR;
  }

  isEOF() {
    return this.chars.isEOF();
  }

  private get position() {
    return new SrcSpan(this.location, this.location + this.chars.range);
  }

  private nextChar() {
    return (this.chr = this.chars.next());
  }

  private eatWhile(f: (c: string) => boolean) {
    let str = '';
    this.chars.eatWhile(c => {
      const v = f(c ?? EOF_CHAR);
      if (v) {
        str += c ?? EOF_CHAR;
        this.chr = c ?? EOF_CHAR;
      }
      return v;
    });
    return str;
  }

  private beginRange() {
    this.location += this.chars.range;
    this.chars.resetRange();
  }

  private consume(): Token {
    const c = this.chr;
    switch (c) {
      case EOF_CHAR:
        return new Token(TokenKind.Eof, this.position);

      case "'":
      case '"':
      case '`': {
        return this.lexStringLiteral();
      }

      case '/': {
        const next = this.chars.peekNext();

        if (next === '*' || next === '/')
          return this.lexComment(next === '*' ? 'block' : 'inline');

        return this.lexSymbol(c);
      }
      case '!': {
        if (this.chars.peekNext() === '=') {
          return this.lexSymbol('!=');
        }
        return this.lexSymbol(c);
      }
      case '=': {
        const next = this.peekNext();

        if (next === '=' || next == '>') {
          this.nextChar();
          return this.lexSymbol(c + next);
        }

        return this.lexSymbol(c);
      }
      case '<':
      case '>': {
        const next = this.peekNext();
        if (next === '=') {
          this.nextChar();
          return this.lexSymbol(c + next);
        }
        return this.lexSymbol(c);
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
          return this.lexSymbol(c.repeat(count));
        }
        throw new Error('Unreachable code detected @consume(.)');
      }
      case '-': {
        if (this.peekNext() === '>') {
          this.nextChar();
          return this.lexSymbol('->');
        }
        return this.lexSymbol(c);
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
      case '\t':
      case '\n':
        return this.lexSymbol(c);
      default: {
        if (this.isNumberStart(c)) {
          return this.lexNumberLiteral();
        } else {
          if (this.isNameStart(c)) {
            const name = this.lexName();
            const keyword = this.getKeyword(name);
            if (keyword) {
              return new Token(keyword, this.position);
            }
            return new LiteralToken<string>(
              TokenKind.Name,
              this.position,
              name
            );
          }
        }

        throw BlockFormulaError.SyntaxError(
          SyntaxErrorCode.UnexpectedToken,
          `Unexpected token ${c}`
        );
      }
    }
  }

  private lexName(): string {
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

  private lexNumberLiteral(): Token {
    if (this.chr === '0') {
      switch (this.peekNext()) {
        case 'x':
        case 'X': {
          this.nextChar();
          return this.lexHex();
        }
        case 'o':
        case 'O': {
          this.nextChar();
          return this.lexOctal();
        }
        case 'b':
        case 'B': {
          this.nextChar();
          return this.lexBinary();
        }
        default: {
          return this.lexDecimal();
        }
      }
    }
    return this.lexDecimal();
  }

  private lexBinary(): Token {
    const stringContent = this.eatWhile(this.isValidBinaryChar);
    const num = parseInt(stringContent, 2);
    return new LiteralToken<number>(TokenKind.Number, this.position, num);
  }

  private lexHex(): Token {
    const stringContent = this.eatWhile(this.isValidHexChar);
    const num = parseInt(stringContent, 16);
    return new LiteralToken<number>(TokenKind.Number, this.position, num);
  }

  private lexOctal(): Token {
    const stringContent = this.eatWhile(this.isValidOctal);
    const num = parseInt(stringContent, 8);
    return new LiteralToken<number>(TokenKind.Number, this.position, num);
  }
  // Todo need a better one
  private lexDecimal(): Token {
    let stringContent = this.chr === '0' ? '' : this.chr;
    let isFloat = false;
    stringContent += this.eatWhile(c => {
      if (c === '.') {
        isFloat = true;
        return true;
      }
      if (c === '_') return true;
      return this.isDecimalContinuation(c);
    });
    stringContent.replace(/_/g, '');
    const num = isFloat ? parseFloat(stringContent) : parseInt(stringContent);

    return new LiteralToken<number>(TokenKind.Number, this.position, num);
  }

  private lexStringLiteral() {
    const mode = this.chr;
    if (!['"', "'", '`'].includes(mode)) {
      throw new Error('Unexpected mode required " | \' | `');
    }

    if (mode === '`') return this.consumeTemplateString();
    return this.consumeQuotedString(mode);
  }

  private consumeQuotedString(quote: string) {
    let stringContent = '';

    this.eatWhile(c => {
      if (c === '\\') {
        const next = this.peekNext2();
        const escape = this.getEscapeCharacter(next);

        if (escape !== null) {
          stringContent += escape;
          this.nextChar();
        } else {
          // TODO can improve this with \x
          stringContent += c;
        }

        return true;
      }
      if (c === quote || c === '\n') return false;
      stringContent += c;
      return true;
    });

    if (this.nextChar() !== quote)
      throw BlockFormulaError.SyntaxError(
        SyntaxErrorCode.UnterminatedLiteral,
        'Bad termination of string'
      );

    return new LiteralToken<string>(
      TokenKind.String,
      this.position,
      stringContent
    );
  }

  private consumeTemplateString() {
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
      throw BlockFormulaError.SyntaxError(
        SyntaxErrorCode.UnterminatedLiteral,
        'Bad termination of string'
      );

    this.nextChar(); // eat `

    return new LiteralToken<string>(
      TokenKind.TemplateString,
      this.position,
      stringContent
    );
  }

  private getEscapeCharacter(c: string): string {
    return ESCAPE_CHARACTER_MAP[c] ?? null;
  }

  private lexComment(mode: 'inline' | 'block') {
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

    return new Token(TokenKind.Comment, this.position);
  }

  private lexSymbol(symbol: string) {
    const tokenKind = SymbolToTokenKindMap[symbol];
    if (tokenKind === undefined) throw new Error(`Unexpected symbol ${symbol}`);
    return new Token(tokenKind, this.position); // Add position
  }

  private isNumberStart(c: string) {
    return c >= '0' && c <= '9';
  }

  private isValidOctal(c: string) {
    return c >= '0' && c <= '7';
  }

  private isValidHexChar(c: string) {
    return (
      (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
    );
  }

  private isValidBinaryChar(c: string) {
    return c === '1' || c === '0';
  }

  private isDecimalContinuation(c: string) {
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
