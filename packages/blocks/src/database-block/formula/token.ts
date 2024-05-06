import { type SrcSpan } from './span.js';

export enum TokenKind {
  Ident = 'intern:Ident',

  FormatString = 'lit:template',
  Number = 'lit:Number',
  String = 'lit:String',
  Bool = 'lit:Bool',

  LeftParen = 'sym:LeftParen', // (
  RightParen = 'sym:RightParen', // )
  LeftBracket = 'sym:LeftSquare', // [
  RightBracket = 'sym:RightSquare', // ]
  LeftBrace = 'sym:LeftBrace', // {
  RightBrace = 'sym:RightBrace', // }

  Plus = 'sym:Plus',
  Minus = 'sym:Minus',
  Star = 'sym:Star',
  Slash = 'sym:Slash',
  Lt = 'sym:Lt', // <
  Gt = 'sym:Gt', // >
  LtEq = 'sym:LtEq', // <=
  GtEq = 'sym:GtEq', // >=
  Percent = 'sym:Percent',
  Caret = 'sym:Caret',

  Colon = 'sym:Colon',
  Comma = 'sym:Comma',
  Hash = 'sym:Hash', // '#'
  Bang = 'sym:Bang', // '!'
  Eq = 'sym:Eq',
  EqEq = 'sym:EqEq', // '=='
  NotEq = 'sym:NotEq', // '!='
  Or = 'sym:Or', // '|'
  OrOr = 'sym:OrOr', // '||'
  And = 'sym:And', // '&&'
  AndAnd = 'sym:AndAnd', // '&&'
  LtLt = 'sym:GtLt', // '<<'
  GtGt = 'sym:GtGt', // '>>'

  ThinArrow = 'sym:RightArrow', // '->'
  FatArrow = 'sym:FatArrow',

  Dot = 'sym:Dot', // '.'
  DotDot = 'sym:DotDot', // '..'
  DotDotDot = 'sym:DotDotDot', // '...'
  At = 'sym:At', // '@'
  Eof = 'sym:Eof', // End of File

  Comment = 'misc:Comment',
  NewLine = 'misc:NewLine',
  Whitespace = 'misc:Whitespace',
  Unknown = 'misc:Unknown',

  // keywords
  Const = 'kwd:Const',
  Fn = 'kwd:Fn',
  If = 'kwd:If',
  Else = 'kwd:Else',
  ElseIf = 'kwd:ElseIf',
  Match = 'kwd:Match',
  Let = 'kwd:Let',
  While = 'kwd:While',
  For = 'kwd:For',
  In = 'kwd:In',
  Return = 'kwd:Return',
}

const tokenSym = Symbol('token_symbol');
export class Token<Value = unknown> {
  [tokenSym] = '__token__' as Value;

  constructor(
    public readonly kind: TokenKind,
    public readonly span: SrcSpan
  ) {}
}

export type LiteralTokenDataTypes = number | string | boolean;
export class LiteralToken<Type = LiteralTokenDataTypes> extends Token<Type> {
  constructor(
    kind: TokenKind,
    span: SrcSpan,
    public data: Type
  ) {
    if (!kind.startsWith('lit:'))
      throw new Error(
        'Literal Token must be of type number | string | boolean'
      );
    super(kind, span);
  }

  isNumber(): this is LiteralToken<number> {
    return this.kind === TokenKind.Number;
  }

  isString(): this is LiteralToken<string> {
    return (
      this.kind === TokenKind.String || this.kind === TokenKind.FormatString
    );
  }

  isBool(): this is LiteralToken<boolean> {
    return this.kind === TokenKind.Bool;
  }

  static is(token: Token<unknown>): token is LiteralToken {
    return token.kind.startsWith('lit:');
  }
}

export const SymbolToTokenKindMap: Record<string, TokenKind> = {
  '!': TokenKind.Bang,
  '@': TokenKind.At,
  '%': TokenKind.Percent,
  '^': TokenKind.Caret,
  ',': TokenKind.Comma,

  '&': TokenKind.And,
  '&&': TokenKind.AndAnd,
  '|': TokenKind.Or,
  '||': TokenKind.OrOr,

  '(': TokenKind.LeftParen,
  ')': TokenKind.RightParen,
  '[': TokenKind.LeftBracket,
  ']': TokenKind.RightBracket,
  '{': TokenKind.LeftBrace,
  '}': TokenKind.RightBrace,

  '+': TokenKind.Plus,
  '-': TokenKind.Minus,
  '*': TokenKind.Star,
  '/': TokenKind.Slash,
  '=': TokenKind.Eq,

  '<': TokenKind.Lt,
  '>': TokenKind.Gt,
  '<=': TokenKind.Lt,
  '>=': TokenKind.GtEq,
  '==': TokenKind.EqEq,
  '!=': TokenKind.NotEq,

  '->': TokenKind.ThinArrow,
  '=>': TokenKind.FatArrow,

  '.': TokenKind.Dot,
  '..': TokenKind.DotDot,
  '...': TokenKind.DotDotDot,

  ' ': TokenKind.Whitespace,
  '\n': TokenKind.NewLine,
};
