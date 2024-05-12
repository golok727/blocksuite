import type { Spannable, SrcSpan } from '../span.js';
import type { Expr, ExprLocalAssignment, Ident } from './expr.js';

export enum StmtKind {
  Fn,
  Block,
  Local,
  Expr,
}

export interface Stmt extends Spannable {
  readonly kind: StmtKind;
}

export class StmtExpr implements Stmt {
  readonly kind = StmtKind.Expr;
  constructor(
    public expr: Expr,
    public span: SrcSpan
  ) {}
}
export class Block implements Stmt {
  readonly kind = StmtKind.Block;

  constructor(
    public stmts: Stmt[],
    public span: SrcSpan
  ) {}

  static is(stmt: Stmt): stmt is Block {
    return stmt.kind === StmtKind.Block;
  }
}

export class StmtFn implements Stmt {
  readonly kind = StmtKind.Fn;

  constructor(
    public name: Ident,
    public params: Expr[],
    public body: Block,
    public span: SrcSpan
  ) {}

  static is(stmt: Stmt): stmt is StmtFn {
    return stmt.kind === StmtKind.Fn;
  }
}

export class StmtLocal implements Stmt {
  readonly kind = StmtKind.Local;

  constructor(
    public assignments: ExprLocalAssignment[],
    public span: SrcSpan
  ) {}

  static is(stmt: Stmt): stmt is StmtLocal {
    return stmt.kind === StmtKind.Local;
  }
}
