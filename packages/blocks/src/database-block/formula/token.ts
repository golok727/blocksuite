import { type SrcSpan } from './span.js';

export enum TokenKind {
  Ident = 'intern:ident',

  Number = 'lit:number',
  String = 'lit:string',
  Bool = 'lit:bool',

  LeftParen = 'sym:leftParen', // (
  RightParen = 'sym:rightParen', // )
  LeftSquare = 'sym:leftSq', // [
  RightSquare = 'sym:rightSq', // ]
  LeftBrace = 'sym:leftBrace', // {
  RightBrace = 'sym:rightBrace', // }

  Plus = 'sym:plus',
  Minus = 'sym:minus',
  Star = 'sym:star',
  Slash = 'sym:slash',
  Lt = 'sym:lt', // <
  Gt = 'sym:gt', // >
  LtEq = 'sym:ltEq', // <=
  GtEq = 'sym:gtEq', // >=
  Percent = 'sym:percent',

  Colon = 'sym:colon',
  Comma = 'sym:comma',
  Hash = 'sym:hash', // '#'
  Bang = 'sym:bang', // '!'
  Eq = 'sym:eq',
  EqEq = 'sym:eqEq', // '=='
  NotEqual = 'sym:nEq', // '!='
  Or = 'sym:or', // '|'
  OrOr = 'sym:orOr', // '||'
  And = 'sym:and', // '&&'
  AndAnd = 'sym:andAnd', // '&&'
  LtLt = 'sym:ltLt', // '<<'
  GtGt = 'sym:gtGt', // '>>'
  Dot = 'sym:dot', // '.'
  RArrow = 'sym:rArrow', // '->'
  LArrow = 'sym:lArrow', // '<-'
  DotDot = 'sym:dotDot', // '..'
  DotDotDot = 'sym:dotDotDot', // '...'
  At = 'sym:at', // '@'
  Eof = 'sym:eof', // End of File

  Comment = 'misc:comment',
  NewLine = 'misc:newLine',
  Whitespace = 'misc:whitespace',

  // keywords
  Const = 'kwd:const',
  Else = 'kwd:else',
  ElseIf = 'kwd:elseif',
  Fn = 'kwd:fn',
  If = 'kwd:if',
  Match = 'kwd:match',
  Let = 'kwd:let',
  Return = 'kwd:return',
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
      throw new Error('Literal Token must be of type ');
    super(kind, span);
  }

  isNumber(): this is LiteralToken<number> {
    return this.kind === TokenKind.Number;
  }

  isString(): this is LiteralToken<string> {
    return this.kind === TokenKind.String;
  }

  isBool(): this is LiteralToken<boolean> {
    return this.kind === TokenKind.Bool;
  }

  static is(token: Token<unknown>): token is LiteralToken {
    return token.kind.startsWith('lit:');
  }
}
