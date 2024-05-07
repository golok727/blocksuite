import type {
  ParseErrorCode,
  RuntimeErrorCode,
  SyntaxErrorCode,
} from './codes.js';

export enum ErrorType {
  ParseError,
  SyntaxError,
  RuntimeError,
}

export class BlockFormulaError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly code: ParseErrorCode | SyntaxErrorCode | RuntimeErrorCode,
    message?: string
  ) {
    super(message);
  }

  static ParseError(code: ParseErrorCode, message?: string) {
    return new BlockFormulaError(
      ErrorType.ParseError,
      code,
      `LexError: ${message}`
    );
  }

  static SyntaxError(code: ParseErrorCode, message?: string) {
    return new BlockFormulaError(
      ErrorType.SyntaxError,
      code,
      `ParseError: ${message}`
    );
  }

  static RuntimeError(code: ParseErrorCode, message?: string) {
    return new BlockFormulaError(
      ErrorType.RuntimeError,
      code,
      `ParseError: ${message}`
    );
  }
}
