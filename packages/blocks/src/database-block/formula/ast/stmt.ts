import type { Spannable, SrcSpan } from '../span.js';
import type { Expr, ExprLocalAssignment } from './expr.js';

export enum StmtKind {
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
