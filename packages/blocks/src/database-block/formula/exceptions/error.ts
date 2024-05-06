import type {
  LexErrorCode,
  ParseErrorCode,
  RuntimeErrorCode,
} from './codes.js';

export enum ErrorType {
  LexError,
  ParseError,
  RuntimeError,
}

export class BlockScriptError extends Error {
  constructor(
    public readonly type: ErrorType,
    public readonly code: LexErrorCode | ParseErrorCode | RuntimeErrorCode,
    message?: string
  ) {
    super(message);
  }

  static LexError(code: LexErrorCode, message?: string) {
    return new BlockScriptError(
      ErrorType.LexError,
      code,
      `LexError: ${message}`
    );
  }

  static ParseError(code: LexErrorCode, message?: string) {
    return new BlockScriptError(
      ErrorType.ParseError,
      code,
      `ParseError: ${message}`
    );
  }

  static RuntimeError(code: LexErrorCode, message?: string) {
    return new BlockScriptError(
      ErrorType.RuntimeError,
      code,
      `ParseError: ${message}`
    );
  }
}
