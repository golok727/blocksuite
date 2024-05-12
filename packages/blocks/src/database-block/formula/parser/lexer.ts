import { EOF_CHAR, ESCAPE_CHARACTER_MAP } from '../constants.js';
import { SyntaxErrorCode } from '../exceptions/codes.js';
import { BlockFormulaError } from '../exceptions/error.js';
import { SrcSpan } from '../span.js';
import type { LiteralTokenDataTypes } from '../token.js';
import {
  KeywordToTokenKindMap,
  LiteralToken,
  SymbolToTokenKindMap,
  Token,
  TokenKind,
} from '../token.js';
import { Cursor } from '../utils/cursor.js';

export class Lexer {
  private chars: Cursor<string>;

  private pos: number = 0;
  private chr0: string = EOF_CHAR;
  constructor(public readonly source: string) {
    this.source = normalizeString(source);
    this.chars = new Cursor(this.source);

    // start up the lexer
    this.chr0 = this.peekNext();
    this.pos = this.chars.range;
  }

  advance(): Token {
    this.beginRange();
    this.nextChar();

    return this.lex();
  }

  reset() {
    this.chars = new Cursor(this.source);
    // start up the lexer
    this.chr0 = this.peekNext();
    this.pos = this.chars.range;
    return this;
  }

  private peekNext() {
    return this.chars.peekNext() ?? EOF_CHAR;
  }

  private peekNext2() {
    return this.chars.peekNext2() ?? EOF_CHAR;
  }

  isEOF() {
    return this.chars.isEOF();
  }

  // Internals
  /**
   * start a new range for the new token
   */
  private beginRange() {
    this.pos += this.chars.range;
    this.chars.resetRange();
  }

  private get span() {
    return new SrcSpan(this.pos, this.pos + this.chars.range);
  }

  /**
   * Create a base token
   */
  private createToken(kind: TokenKind) {
    return new Token(kind, this.pos, this.pos + this.chars.range);
  }

  /**
   * Create a literal token
   */
  private createLitToken(kind: TokenKind, data: LiteralTokenDataTypes) {
    return new LiteralToken(kind, this.pos, this.pos + this.chars.range, data);
  }

  /**
   * eats the next char and returns it. prefer it over this.chars.next()
   */
  private nextChar() {
    return (this.chr0 = this.chars.next());
  }
  /**
   * advances till the return of the callback fn is true and returns the string of eaten char
   */
  private eatWhile(f: (c: string) => boolean) {
    let str = '';
    this.chars.eatWhile(c => {
      const v = f(c ?? EOF_CHAR);
      if (v) {
        str += c ?? EOF_CHAR;
        this.chr0 = c ?? EOF_CHAR;
      }
      return v;
    });
    return str;
  }

  /**
   *  The main thing~
   */
  private lex(): Token {
    const c = this.chr0;

    switch (c) {
      case EOF_CHAR:
        return this.createToken(TokenKind.Eof);

      case "'":
      case '"':
      case '`': {
        return this.lexStringLiteral();
      }

      case '/': {
        const next = this.chars.peekNext();

        if (next === '/' || next === '*') {
          this.nextChar();
          return this.lexComment(next === '/' ? 'inline' : 'block');
        }

        return this.lexSymbol(c);
      }
      case '!': {
        if (this.chars.peekNext() === '=') {
          this.nextChar();
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
        // unit.unit.unit()
        // .. -> 1..9 [1 , 2, 3, ... 8]
        // .= -> 1.=9 [1, 2, 3, 4 .. 9]
        // [...unit1, 1, 2, ...unit2]
        if (this.peekNext() === '=') {
          this.nextChar();
          return this.lexSymbol('.='); // for ranges
        }

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
        throw new Error('@@internal Unreachable code detected Lexer.consume()');
      }
      case '-': {
        if (this.peekNext() === '>') {
          this.nextChar();
          return this.lexSymbol('->');
        }
        return this.lexSymbol(c);
      }

      case '*': {
        if (this.peekNext() === '*') {
          this.nextChar();
          return this.lexSymbol('**');
        }
        return this.lexSymbol(c);
      }

      case ' ':
      case '\t': {
        return this.advance(); // should skip whitespace
      }

      case '@':
      case ':':
      case '?':
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
              return this.createToken(keyword);
            }

            if (name === 'true' || name === 'false')
              return this.createLitToken(TokenKind.Bool, name === 'true');

            return this.createLitToken(TokenKind.Name, name);
          }
        }

        throw BlockFormulaError.SyntaxError(
          SyntaxErrorCode.UnexpectedToken,
          `Unexpected token ${c}`,
          this.span
        );
      }
    }
  }

  private lexName(): string {
    let name = this.chr0;
    name += this.eatWhile(this.isNameContinuation);
    return name;
  }

  private getKeyword(maybeKeyword: string): TokenKind | null {
    return KeywordToTokenKindMap[maybeKeyword] ?? null;
  }

  private lexNumberLiteral(): Token {
    if (this.chr0 === '0') {
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
        case '0': {
          throw this.createBadNumberLiteralError(
            'Bad number literal. Did you mean 0o<value> for octal?'
          );
        }
        default: {
          return this.lexIntOrFloat();
        }
      }
    }
    return this.lexIntOrFloat();
  }

  private lexBinary(): Token {
    const stringContent = this.eatWhile(this.isValidBinaryChar);
    const num = parseInt(stringContent, 2);
    if (isNaN(num))
      throw this.createBadNumberLiteralError('Invalid Binary Digit');
    return this.createLitToken(TokenKind.Number, num);
  }

  private lexHex(): Token {
    const stringContent = this.eatWhile(this.isValidHexChar);
    const num = parseInt(stringContent, 16);
    if (isNaN(num)) throw this.createBadNumberLiteralError('Invalid Hex digit');
    return this.createLitToken(TokenKind.Number, num);
  }

  private lexOctal(): Token {
    const stringContent = this.eatWhile(this.isValidOctal);
    const num = parseInt(stringContent, 8);
    if (isNaN(num))
      throw this.createBadNumberLiteralError('Invalid Octal Digit');
    return this.createLitToken(TokenKind.Number, num);
  }

  private lexIntOrFloat(): Token {
    let stringContent = this.chr0;

    let isFloat = false;

    stringContent += this.eatWhile(this.isNumberContinuation);

    const pointOrExponent = this.peekNext();
    const isPoint = pointOrExponent === '.';
    const isExponent = pointOrExponent === 'e' || pointOrExponent === 'E';

    if (isPoint || isExponent) {
      // 0. , 1., ... or 1e or 1e- or 1e+
      isFloat = true;
      stringContent += this.nextChar(); // eat . | e | E

      const nextChar = this.peekNext();

      if (isExponent && (nextChar === '-' || nextChar === '+')) {
        const plusOrMinus = this.nextChar(); // for span
        if (!this.isNumberStart(this.peekNext())) {
          throw this.createBadNumberLiteralError(
            `Signed exponents should follow a value or remove the "${plusOrMinus}"`
          );
        }
        stringContent += plusOrMinus;
      } else if ((isExponent || isPoint) && !this.isNumberStart(nextChar)) {
        throw this.createBadNumberLiteralError(
          `Expected a valid digit after "${pointOrExponent}" but got "${nextChar}"`
        );
      }
      // eat the rest of the decimal part
      stringContent += this.eatWhile(this.isNumberContinuation);
    }

    stringContent = stringContent.replaceAll('_', '');

    const num = isFloat ? parseFloat(stringContent) : parseInt(stringContent);

    if (isNaN(num))
      throw this.createBadNumberLiteralError('Bad number literal');

    return this.createLitToken(TokenKind.Number, num);
  }

  private lexStringLiteral() {
    const mode = this.chr0;
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

        // todo invalid escape error ?
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
        SyntaxErrorCode.UnterminatedStringLiteral,
        'Bad termination of string'
      );

    return this.createLitToken(TokenKind.String, stringContent);
  }

  private consumeTemplateString() {
    // template strings are raw
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

      if (c === '`') return false;

      stringContent += c;
      return true;
    });

    if (this.chars.peekNext() !== '`')
      throw BlockFormulaError.SyntaxError(
        SyntaxErrorCode.UnterminatedStringLiteral,
        'Bad termination of string'
      );

    this.nextChar(); // eat `

    return this.createLitToken(TokenKind.TemplateString, stringContent);
  }

  private getEscapeCharacter(c: string): string {
    return ESCAPE_CHARACTER_MAP[c] ?? null;
  }

  private lexComment(mode: 'inline' | 'block') {
    if (mode === 'inline') {
      this.eatWhile(s => s !== '\n');
    } else {
      this.eatWhile(c => {
        if (c === '*' && this.peekNext2() === '/') return false;
        return true;
      });
      if (this.isEOF()) throw this.createUnexpectedTokenError('Expected */');
      this.nextChar();
      this.nextChar();
    }

    return this.createToken(TokenKind.Comment);
  }

  private createUnexpectedTokenError(message: string) {
    return BlockFormulaError.SyntaxError(
      SyntaxErrorCode.UnexpectedToken,
      message,
      this.span
    );
  }

  private createBadNumberLiteralError(message: string) {
    return BlockFormulaError.SyntaxError(
      SyntaxErrorCode.BadNumberLiteral,
      message,
      this.span
    );
  }

  private lexSymbol(symbol: string) {
    const tokenKind = SymbolToTokenKindMap[symbol];
    if (tokenKind === undefined)
      throw BlockFormulaError.SyntaxError(
        SyntaxErrorCode.UnexpectedToken,
        `Unexpected symbol ${symbol}`,
        this.span
      );

    return this.createToken(tokenKind);
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
    return {
      next() {
        const value = clone.advance();
        const done = value.kind === TokenKind.Eof;
        return { value, done };
      },
    };
  }
}

function normalizeString(str: string) {
  return str.replaceAll(/\r\n/g, '\n');
}
