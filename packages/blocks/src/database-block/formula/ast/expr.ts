import type { SrcSpan } from '../span.js';
import { type Spannable } from '../span.js';
import type { Block } from './stmt.js';

// Todo patterns
export enum ExprKind {
  Literal,
  TemplateLiteral,

  Ident,

  Array,
  Object,
  Property,

  NegateBool, // !false !true
  NegateNumber, // -1 , -1.2
  Binary,

  Assignment, // a = b, c = b

  LocalAssignment, // let a = 10, b = 7

  Call, // foo() , foo.bar()
  MemberExpression, // foo.hello()
  Range, // 1..9, 1.=9
  Fn,

  If,
  While,
  ForLoop,
  Binding,
  Empty,
}

export enum BinOp {
  And = 'and',
  Or = 'or',

  Eq = '==',
  NotEq = '!=',

  Add = '+',
  Mul = '*',
  Div = '/',
  Sub = '-',
  Exp = '**',
  Rem = '%',

  GtEq = '>=',
  LtEq = '<=',
  Gt = '>',
  Lt = '<',
}
export interface Expr extends Spannable {
  kind: ExprKind;
}

export class ExprLit implements Expr {
  readonly kind = ExprKind.Literal;

  constructor(
    public value: number | string | boolean,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprLit {
    return expr.kind === ExprKind.Literal;
  }
}

export class ExprTemplateLit implements Expr {
  readonly kind = ExprKind.TemplateLiteral;

  constructor(
    public value: string,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprTemplateLit {
    return expr.kind === ExprKind.TemplateLiteral;
  }
}

export class Ident implements Expr {
  readonly kind = ExprKind.Ident;

  constructor(
    public name: string,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is Ident {
    return expr.kind === ExprKind.Ident;
  }
}

export class ExprNegateBool implements Expr {
  readonly kind = ExprKind.NegateBool;
  constructor(
    public arg: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprNegateBool {
    return expr.kind === ExprKind.NegateBool;
  }
}

export class ExprNegateNumber implements Expr {
  readonly kind = ExprKind.NegateNumber;
  constructor(
    public arg: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprNegateNumber {
    return expr.kind === ExprKind.NegateNumber;
  }
}

export class ExprBinary implements Expr {
  readonly kind = ExprKind.Binary;
  constructor(
    public left: Expr,
    public op: BinOp,
    public right: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprBinary {
    return expr.kind === ExprKind.Binary;
  }
}

export class ExprAssign implements Expr {
  readonly kind = ExprKind.Assignment;
  constructor(
    public left: Expr,
    public right: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprAssign {
    return expr.kind === ExprKind.Assignment;
  }
}

export class ExprLocalAssignment implements Expr {
  readonly kind = ExprKind.LocalAssignment;
  constructor(
    public name: Ident,
    public init: Expr | null,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprLocalAssignment {
    return expr.kind === ExprKind.LocalAssignment;
  }
}

export class ExprCall implements Expr {
  readonly kind = ExprKind.Call;
  constructor(
    public callee: Expr,
    public args: Expr[],
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprCall {
    return expr.kind === ExprKind.Call;
  }
}

export class ExprMember implements Expr {
  readonly kind = ExprKind.MemberExpression;
  constructor(
    public object: Expr,
    public prop: Ident,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprMember {
    return expr.kind === ExprKind.MemberExpression;
  }
}

export class ExprRange implements Expr {
  readonly kind = ExprKind.Range;
  constructor(
    public from: Expr,
    public to: Expr,
    public include: boolean, // whether to include the 'to' value
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprRange {
    return expr.kind === ExprKind.Range;
  }
}

export class ExprList implements Expr {
  readonly kind = ExprKind.Array;
  constructor(
    public elements: Expr[],
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprList {
    return expr.kind === ExprKind.Array;
  }
}

export class ObjectProp implements Expr {
  readonly kind = ExprKind.Property;
  constructor(
    public key: Expr,
    public value: Expr,
    public shorthand: boolean,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ObjectProp {
    return expr.kind === ExprKind.Property;
  }
}

export class ExprObject implements Expr {
  readonly kind = ExprKind.Object;
  constructor(
    public props: ObjectProp[],
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprObject {
    return expr.kind === ExprKind.Object;
  }
}

// () -> {}
export class ExprFn implements Expr {
  readonly kind = ExprKind.Fn;

  constructor(
    public params: Ident[],
    public body: Block | Expr,
    public span: SrcSpan
  ) {}

  static is(stmt: ExprFn): stmt is ExprFn {
    return stmt.kind === ExprKind.Fn;
  }
}
// export class ExprArrowFn implements Expr {
//   readonly kind = ExprKind.ArrowFn;

//   constructor(
//     public params: Expr[],
//     public expression: boolean, // body will be a expr else body will be a block
//     public body: Expr | Block,
//     public span: SrcSpan
//   ) {}

//   static is(expr: Expr): expr is ExprArrowFn {
//     return expr.kind === ExprKind.ArrowFn;
//   }
// }

export class ExprIf implements Expr {
  readonly kind = ExprKind.If;

  constructor(
    public test: Expr,
    public consequent: Expr | Block,
    public alternate: Expr | Block | null,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprIf {
    return expr.kind === ExprKind.If;
  }
}

export class ExprWhile implements Expr {
  readonly kind = ExprKind.While;

  constructor(
    public test: Expr,
    public body: Expr | Block,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprWhile {
    return expr.kind === ExprKind.While;
  }
}

export class ExprForLoop implements Expr {
  readonly kind = ExprKind.ForLoop;

  constructor(
    public each: Expr,
    public range: Expr,
    public body: Expr | Block,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprForLoop {
    return expr.kind === ExprKind.ForLoop;
  }
}

export function getOpPrecedence(op: BinOp): number {
  switch (op) {
    case BinOp.Or:
      return 1;

    case BinOp.And:
      return 2;

    case BinOp.Eq:
    case BinOp.NotEq:
      return 3;

    case BinOp.Lt:
    case BinOp.LtEq:
    case BinOp.Gt:
    case BinOp.GtEq:
      return 4;

    case BinOp.Add:
    case BinOp.Sub:
      return 5;

    case BinOp.Mul:
    case BinOp.Div:
    case BinOp.Rem:
      return 6;

    case BinOp.Exp:
      return 7;
  }
}
