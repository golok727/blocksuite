import type { SrcSpan } from '../span.js';
import type {
  ParseErrorCode,
  RuntimeErrorCode,
  SyntaxErrorCode,
} from './codes.js';

export enum ErrorType {
  ParseError = 'ParseError',
  SyntaxError = 'SyntaxError',
  RuntimeError = 'RuntimeError',
}

export class BlockFormulaError extends Error {
  public span?: SrcSpan;
  constructor(
    public readonly type: ErrorType,
    public readonly code: ParseErrorCode | SyntaxErrorCode | RuntimeErrorCode,
    cause?: string,
    span?: SrcSpan
  ) {
    super(`( ${type} ) -> ${cause}`);
    this.cause = cause;
    this.span = span;
  }

  static ParseError(code: ParseErrorCode, cause?: string, span?: SrcSpan) {
    return new BlockFormulaError(ErrorType.ParseError, code, cause, span);
  }

  static SyntaxError(code: SyntaxErrorCode, cause?: string, span?: SrcSpan) {
    return new BlockFormulaError(ErrorType.SyntaxError, code, cause, span);
  }

  static RuntimeError(code: RuntimeErrorCode, cause?: string, span?: SrcSpan) {
    return new BlockFormulaError(ErrorType.RuntimeError, code, cause, span);
  }
}
