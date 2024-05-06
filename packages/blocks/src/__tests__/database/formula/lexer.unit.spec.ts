import { describe, test } from 'vitest';

import { Lexer } from '../../../database-block/formula/lexer.js';
import { TokenKind } from '../../../database-block/formula/token.js';

describe('Lexer', () => {
  test('token gen', () => {
    const src = `'Radhey Shyam {}'`;
    const lex = new Lexer(src);
    let thing = lex.next();
    while (thing.kind !== TokenKind.Eof) {
      if (![TokenKind.Whitespace, TokenKind.NewLine].includes(thing.kind))
        console.log(thing.kind);
      thing = lex.next();
    }
    console.log(thing.kind);
    // console.log(Array.from(lex).map(t => t.kind));
  });
});
