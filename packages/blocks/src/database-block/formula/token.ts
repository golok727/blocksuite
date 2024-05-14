import { SrcSpan } from './span.js';

export enum TokenKind {
  Name = 'lit:Name',
  TemplateString = 'lit:TemplateString',
  Number = 'lit:Number',
  String = 'lit:String',
  Bool = 'lit:Bool',

  LParen = 'sym:LParen', // (
  RParen = 'sym:RParen', // )
  LBracket = 'sym:LBracket', // [
  RBracket = 'sym:RBracket', // ]
  LCurly = 'sym:LCurly', // {
  RCurly = 'sym:RCurly', // }

  Plus = 'sym:Plus',
  Minus = 'sym:Minus',
  Star = 'sym:Star',
  StarStar = 'sym:StarStar',
  Slash = 'sym:Slash',
  Lt = 'sym:Lt', // <
  Gt = 'sym:Gt', // >
  LtEq = 'sym:LtEq', // <=
  GtEq = 'sym:GtEq', // >=
  Percent = 'sym:Percent',

  Bang = 'sym:Bang', // '!'
  Caret = 'sym:Caret',
  BitwiseOr = 'sym:BitwiseOr', // '|'
  BitwiseAnd = 'sym:BitwiseAnd', // '&'

  Question = 'sym:Question',
  Colon = 'sym:Colon',
  Semi = 'sym:Semi',
  Comma = 'sym:Comma',
  Hash = 'sym:Hash', // '#'
  Eq = 'sym:Eq',

  EqEq = 'sym:EqEq', // '=='
  NotEq = 'sym:NotEq', // '!='
  LtLt = 'sym:GtLt', // '<<'
  GtGt = 'sym:GtGt', // '>>'

  ThinArrow = 'sym:ThinArrow', // '->'
  FatArrow = 'sym:FatArrow', // =>

  Dot = 'sym:Dot', // '.'
  DotEq = 'sym:DotEq', // '.='
  DotDot = 'sym:DotDot', // '..'
  DotDotDot = 'sym:DotDotDot', // '...'
  Eof = 'sym:Eof', // End of File

  Comment = 'misc:Comment',
  NewLine = 'misc:NewLine',
  Unknown = 'misc:Unknown',

  // keywords
  Fn = 'kwd:Fn',
  If = 'kwd:If',
  Else = 'kwd:Else',
  Match = 'kwd:Match',
  Let = 'kwd:Let',
  While = 'kwd:While',
  For = 'kwd:For',
  In = 'kwd:In',
  Return = 'kwd:Return',
  Or = 'kwd:Or', // or
  And = 'kwd:And', // and
}

const tokenSym = Symbol('token_symbol');
export class Token<Value = unknown> {
  [tokenSym] = '__token__' as Value;

  constructor(
    public readonly kind: TokenKind,
    public readonly start: number,
    public readonly end: number
  ) {}

  get span() {
    return new SrcSpan(this.start, this.end);
  }
  /* Helper to make a dummy token */
  static from(kind: TokenKind) {
    return new Token(kind, -1, -1);
  }

  eq(other: Token) {
    return this.kind === other.kind;
  }
}

export type LiteralTokenDataTypes = number | string | boolean;
export class LiteralToken<Type = LiteralTokenDataTypes> extends Token<Type> {
  readonly data: Type;
  constructor(kind: TokenKind, start: number, end: number, data: Type) {
    if (!kind.startsWith('lit:'))
      throw new Error(
        'Literal Token must be of type number | string | boolean'
      );

    super(kind, start, end);
    this.data = data;
  }

  isName(): this is LiteralToken<string> {
    return this.kind === TokenKind.Name;
  }

  isNumber(): this is LiteralToken<number> {
    return this.kind === TokenKind.Number;
  }

  isString(): this is LiteralToken<string> {
    return (
      this.kind === TokenKind.String || this.kind === TokenKind.TemplateString
    );
  }

  isBool(): this is LiteralToken<boolean> {
    return this.kind === TokenKind.Bool;
  }

  static is(token: Token<unknown>): token is LiteralToken {
    return token.kind.startsWith('lit:');
  }
}

export const KeywordToTokenKindMap: Record<string, TokenKind> = {
  let: TokenKind.Let,
  fn: TokenKind.Fn,
  if: TokenKind.If,
  else: TokenKind.Else,
  match: TokenKind.Match,
  while: TokenKind.While,
  for: TokenKind.For,
  in: TokenKind.In,
  return: TokenKind.Return,
  or: TokenKind.Or,
  and: TokenKind.And,
};

export const SymbolToTokenKindMap: Record<string, TokenKind> = {
  '!': TokenKind.Bang,
  '%': TokenKind.Percent,
  '^': TokenKind.Caret,
  ',': TokenKind.Comma,

  '&': TokenKind.BitwiseAnd,
  '|': TokenKind.BitwiseOr,

  '(': TokenKind.LParen,
  ')': TokenKind.RParen,
  '[': TokenKind.LBracket,
  ']': TokenKind.RBracket,
  '{': TokenKind.LCurly,
  '}': TokenKind.RCurly,

  '+': TokenKind.Plus,
  '-': TokenKind.Minus,
  '*': TokenKind.Star,
  '**': TokenKind.StarStar,
  '/': TokenKind.Slash,
  '=': TokenKind.Eq,

  '<': TokenKind.Lt,
  '>': TokenKind.Gt,
  '<=': TokenKind.Lt,
  '>=': TokenKind.GtEq,
  '==': TokenKind.EqEq,
  '!=': TokenKind.NotEq,

  ':': TokenKind.Colon,
  '?': TokenKind.Question,
  ';': TokenKind.Semi,

  '->': TokenKind.ThinArrow,
  '=>': TokenKind.FatArrow,

  '.': TokenKind.Dot,
  '.=': TokenKind.DotEq,
  '..': TokenKind.DotDot,
  '...': TokenKind.DotDotDot,

  '\n': TokenKind.NewLine,
};
