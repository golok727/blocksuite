import { describe, expect, test } from 'vitest';

import { EOF_CHAR } from '../../database-block/formula/constants.js';
import { Lexer } from '../../database-block/formula/parser/lexer.js';
import {
  KeywordToTokenKindMap,
  LiteralToken,
  SymbolToTokenKindMap,
  TokenKind,
} from '../../database-block/formula/token.js';

describe('Lexer', () => {
  test('basic', () => {
    const src = `let apple = "orange"
    let my_words = apple != 'apple' ? \`Wrong\` : 'Correct'
    // This is a comment
    /*Multi Line
     Comment*/`;
    const lexer = new Lexer(src);

    const tokens = [...lexer];

    expect(tokens.map(t => t.kind)).toEqual([
      TokenKind.Let,
      TokenKind.Name,
      TokenKind.Eq,
      TokenKind.String,
      TokenKind.NewLine,

      TokenKind.Let,
      TokenKind.Name,
      TokenKind.Eq,
      TokenKind.Name,
      TokenKind.NotEq,
      TokenKind.String,
      TokenKind.Question,
      TokenKind.TemplateString,
      TokenKind.Colon,
      TokenKind.String,
      TokenKind.NewLine,

      TokenKind.Comment,

      TokenKind.NewLine,
      TokenKind.Comment,
    ]);
  });

  test('bad block comment', () => {
    const src = '/*Hello world*';
    const lex = new Lexer(src);
    expect(() => [...lex]).toThrow('( SyntaxError ) -> Expected */');
  });

  test('lex name', () => {
    const src = `let block = "suite"`;
    const lexer = new Lexer(src);
    lexer.advance();
    const name = lexer.advance() as LiteralToken<string>;
    expect(name.isName()).toBe(true);
    expect(name.data).toBe('block');
  });

  test('iterator should work', () => {
    const src = `let a = true`;
    const lexer = new Lexer(src);
    const tokens = [];
    while (!lexer.isEOF()) {
      tokens.push(lexer.advance());
    }

    expect(Array.from(lexer)).toEqual(tokens);
  });

  test('iterator should use a new lexer', () => {
    const src = `let a = true`;
    const lexer = new Lexer(src);
    Array.from(lexer);
    expect(lexer.isEOF()).toBe(false);
  });

  test('spans', () => {
    const src = `let a = 'apple'
    let b = 'orange'
    return a + '' + b
    // this is a comment
    /*Block Comment*/`;
    const lexer = new Lexer(src);
    const tokens = [...lexer];
    const joined = tokens.map(({ span }) => span.sourceText(src));
    expect(joined).toEqual([
      'let',
      'a',
      '=',
      "'apple'",
      '\n',
      'let',
      'b',
      '=',
      "'orange'",
      '\n',
      'return',
      'a',
      '+',
      "''",
      '+',
      'b',
      '\n',
      '// this is a comment',
      '\n',
      '/*Block Comment*/',
    ]);
  });

  test('comments', () => {
    const src = `// this is a comment
    /*Block
    Comment*/
    "String" // comment`;
    const lexer = new Lexer(src);
    expect([...lexer].map(t => t.kind)).toEqual([
      TokenKind.Comment,
      TokenKind.NewLine,
      TokenKind.Comment,
      TokenKind.NewLine,
      TokenKind.String,
      TokenKind.Comment,
    ]);
  });

  test('lex string literal', () => {
    /* 
      "Hello
      World"
     */
    const sources: string[] = [];
    sources.push(String.raw`"\"Hello\nWorld\""`);
    sources.push(String.raw`'\'Hello\nWorld\''`);
    sources.push(`
\`\\\`Hello
Code\\\`\`
    `);
    const results = ['"Hello\nWorld"', "'Hello\nWorld'", '`Hello\nCode`'];
    sources.forEach((src, idx) => {
      const lexer = new Lexer(src);

      const string = [...lexer].filter(
        t => ![TokenKind.NewLine].includes(t.kind)
      )[0] as LiteralToken<string>;
      expect(LiteralToken.is(string)).toBe(true);
      expect(string.isString()).toBe(true);
      expect(string.data).toBe(results[idx]);
    });
  });

  test('throw on bad string or unterminated string literal', () => {
    const toThrow = (lexer: Lexer) => {
      expect(() => [...lexer]).toThrowError(
        '( SyntaxError ) -> Bad termination of string'
      );
    };
    let lexer: Lexer;

    // "
    lexer = new Lexer(`let apple = "app`);
    toThrow(lexer);
    lexer = new Lexer(`let apple = "app\nle"`);
    toThrow(lexer);

    // '
    lexer = new Lexer(`let apple = 'app`);
    toThrow(lexer);
    lexer = new Lexer(`let apple = 'app\nle'`);
    toThrow(lexer);

    // `
    lexer = new Lexer('let apple = `app');
    toThrow(lexer);
    // template strings allows new line in them :)
  });

  test('number literal', () => {
    const src =
      '1000 1_00_1000 10.9 0xaf 0b10 0o17 1e2 1e+3 1e-3 1_00_100.1_00_100';
    const lexer = new Lexer(src);

    const tokens = [...lexer] as LiteralToken<number>[];
    expect(tokens.map(t => t.data)).toEqual([
      1000, 1001000, 10.9, 0xaf, 0b10, 0o17, 1e2, 1e3, 1e-3, 100100.1001,
    ]);
  });

  test('bad number literal', () => {
    const src = '9. 1e 1e+ 1e-';
    const errors = [
      `( SyntaxError ) -> Expected a valid digit after "." but got "${EOF_CHAR}"`,
      `( SyntaxError ) -> Expected a valid digit after "e" but got "${EOF_CHAR}"`,
      `( SyntaxError ) -> Signed exponents should follow a value or remove the "+"`,
      `( SyntaxError ) -> Signed exponents should follow a value or remove the "-"`,
    ];
    src.split(' ').forEach((chunk, index) => {
      const lexer = new Lexer(chunk);
      expect(() => lexer.advance()).toThrow(errors[index]);
    });
  });

  test('boolean literal', () => {
    const src = `true false !true !false`;

    const lexer = new Lexer(src);
    expect([...lexer].map(t => t.kind)).toEqual([
      TokenKind.Bool,
      TokenKind.Bool,
      TokenKind.Bang,
      TokenKind.Bool,
      TokenKind.Bang,
      TokenKind.Bool,
    ]);

    const yes = lexer.advance() as LiteralToken<boolean>;
    const no = lexer.advance() as LiteralToken<boolean>;

    expect(yes.isBool()).toBe(true);
    expect(no.isBool()).toBe(true);

    expect(yes.data).toBe(true);
    expect(no.data).toBe(false);
  });

  test('symbols and pairs', () => {
    const src = Object.keys(SymbolToTokenKindMap).join(' ');
    const expected: TokenKind[] = Object.values(SymbolToTokenKindMap);

    const lexer = new Lexer(src);
    expect([...lexer].map(t => t.kind)).toEqual(expected);
  });

  test('keywords', () => {
    const src = Object.keys(KeywordToTokenKindMap).join(' ');
    const expected = Object.values(KeywordToTokenKindMap);

    const lexer = new Lexer(src);
    expect([...lexer].map(t => t.kind)).toEqual(expected);
  });

  test("don't confuse keywords and names", () => {
    const src =
      Object.keys(KeywordToTokenKindMap).join(' ') +
      ' hello world code blocksuite';
    const expected = Object.values(KeywordToTokenKindMap).concat(
      Array.from({ length: 4 }, () => TokenKind.Name)
    );

    const lexer = new Lexer(src);
    expect([...lexer].map(t => t.kind)).toEqual(expected);
  });
});

// todo lexer
// 1..10+2
