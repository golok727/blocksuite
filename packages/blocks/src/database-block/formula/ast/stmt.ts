import type { Spannable, SrcSpan } from '../span.js';
import type { Expr, ExprLocalAssignment } from './expr.js';

export enum StmtKind {
  Local,
  Block,
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

export class Block implements Stmt {
  readonly kind = StmtKind.Block;

  constructor(
    public stmts: Stmt[],
    public span: SrcSpan
  ) {}

  static is(stmt: Block): stmt is Block {
    return stmt.kind === StmtKind.Block;
  }
}
