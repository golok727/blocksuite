export enum ParseErrorCode {
  Unknown = 0,
  UnexpectedEOF,
  UnexpectedToken,
  UnterminatedLiteral,
}

export enum SyntaxErrorCode {
  Unknown = 0,
  UnexpectedToken,
  UnterminatedLiteral,
  UnexpectedNumber,
}

export enum RuntimeErrorCode {
  Unknown = 0,
}
