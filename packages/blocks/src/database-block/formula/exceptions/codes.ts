export enum ParseErrorCode {
  Unknown = 0,
}

export enum SyntaxErrorCode {
  Unknown = 0,
  UnexpectedToken,
  UnterminatedStringLiteral,
  UnexpectedNumber,
  BadNumberLiteral,
}

export enum RuntimeErrorCode {
  Unknown = 0,
}
