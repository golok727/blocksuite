import type { SrcSpan } from '../span.js';
import type { Expression, Name } from './expr.js';

export enum StatementKind {
  If,
  Fn,
  ArrowFn,
  Block,
  While,
  For,
  NameDeclaration,
  NameDeclarator,
}

export interface Statement {
  readonly kind: StatementKind;
  span: SrcSpan;
}

export class BlockStatement implements Statement {
  readonly kind = StatementKind.Block;

  constructor(
    public statements: Statement[],
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is BlockStatement {
    return stmt.kind === StatementKind.Block;
  }
}

export class NamedFunctionStatement implements Statement {
  readonly kind = StatementKind.Fn;

  constructor(
    public name: Name,
    public params: Expression[],
    public body: BlockStatement,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is NamedFunctionStatement {
    return stmt.kind === StatementKind.Fn;
  }
}

export class ArrowFunctionStatement implements Statement {
  readonly kind = StatementKind.ArrowFn;

  constructor(
    public params: Expression[],
    public expression: boolean,
    public body: Expression | BlockStatement,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is ArrowFunctionStatement {
    return stmt.kind === StatementKind.ArrowFn;
  }
}

export class IfStatement implements Statement {
  readonly kind = StatementKind.If;

  constructor(
    public test: Expression,
    public consequent: Expression | BlockStatement,
    public alternate: Expression | BlockStatement | null,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is IfStatement {
    return stmt.kind === StatementKind.If;
  }
}

export class WhileStatement implements Statement {
  readonly kind = StatementKind.While;

  constructor(
    public test: Expression,
    public body: Expression | BlockStatement,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is WhileStatement {
    return stmt.kind === StatementKind.While;
  }
}

export class ForStatement implements Statement {
  readonly kind = StatementKind.For;

  constructor(
    public each: Expression,
    public range: Expression,
    public body: Expression | BlockStatement,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is ForStatement {
    return stmt.kind === StatementKind.For;
  }
}

export enum NameDeclarationType {
  Let = 'let',
  Const = 'const',
}

export class NameDeclarator implements Statement {
  readonly kind = StatementKind.NameDeclarator;

  constructor(
    public name: Name,
    public init: Expression | null,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is NameDeclarator {
    return stmt.kind === StatementKind.NameDeclarator;
  }
}

export class NameDeclaration implements Statement {
  readonly kind = StatementKind.NameDeclaration;

  constructor(
    public declarations: NameDeclarator[],
    public type: NameDeclarationType,
    public span: SrcSpan
  ) {}

  static is(stmt: Statement): stmt is NameDeclaration {
    return stmt.kind === StatementKind.NameDeclaration;
  }
}
