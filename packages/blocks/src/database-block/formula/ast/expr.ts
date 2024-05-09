import type { SrcSpan } from '../span.js';

export enum ExpressionKind {
  Literal,
  TemplateLiteral,
  Name,
  Array,
  Object,
  Property,
  Unary,
  Binary,
  Condition,
  Assignment,
  Call,
  MemberExpression,
  Range,
}

export interface Expression {
  kind: ExpressionKind;
  span: SrcSpan;
}

export class Literal implements Expression {
  readonly kind = ExpressionKind.Literal;

  constructor(
    public value: number | string | boolean,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is Literal {
    return expr.kind === ExpressionKind.Literal;
  }
}

export class TemplateLiteral implements Expression {
  readonly kind = ExpressionKind.TemplateLiteral;

  constructor(
    public value: string,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is TemplateLiteral {
    return expr.kind === ExpressionKind.TemplateLiteral;
  }
}

export class Name implements Expression {
  readonly kind = ExpressionKind.Name;

  constructor(
    public name: string,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is Name {
    return expr.kind === ExpressionKind.Name;
  }
}

export enum BinaryOp {
  Add,
  Mul,
  IntDiv,
  Div,
  Sub,
  Exp,
  Eq,
  NotEq,
  GtEq,
  LtEq,
  Gt,
  Lt,
}

export enum UnaryOp {
  Not,
  Negate,
}

export class UnaryExpression implements Expression {
  readonly kind = ExpressionKind.Unary;
  constructor(
    public op: UnaryOp,
    public arg: Expression,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is UnaryExpression {
    return expr.kind === ExpressionKind.Unary;
  }
}

export class BinaryExpression implements Expression {
  readonly kind = ExpressionKind.Binary;
  constructor(
    public left: Expression,
    public op: UnaryOp,
    public right: Expression,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is BinaryExpression {
    return expr.kind === ExpressionKind.Binary;
  }
}

export class ConditionalExpression implements Expression {
  readonly kind = ExpressionKind.Condition;
  constructor(
    public test: Expression,
    public consequent: Expression,
    public alternate: Expression,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is ConditionalExpression {
    return expr.kind === ExpressionKind.Condition;
  }
}

export class AssignmentExpression implements Expression {
  readonly kind = ExpressionKind.Assignment;
  constructor(
    public left: Expression,
    public right: Expression,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is AssignmentExpression {
    return expr.kind === ExpressionKind.Assignment;
  }
}

export class CallExpression implements Expression {
  readonly kind = ExpressionKind.Call;
  constructor(
    public callee: Expression,
    public args: Expression[],
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is CallExpression {
    return expr.kind === ExpressionKind.Call;
  }
}

export class MemberExpression implements Expression {
  readonly kind = ExpressionKind.MemberExpression;
  constructor(
    public object: Expression,
    public prop: Name,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is MemberExpression {
    return expr.kind === ExpressionKind.MemberExpression;
  }
}

export class RangeExpression implements Expression {
  readonly kind = ExpressionKind.Range;
  constructor(
    public start: number,
    public end: number,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is RangeExpression {
    return expr.kind === ExpressionKind.Range;
  }
}

export class ArrayExpression implements Expression {
  readonly kind = ExpressionKind.Array;
  constructor(
    public elements: Expression[],
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is ArrayExpression {
    return expr.kind === ExpressionKind.Array;
  }
}

export class Property implements Expression {
  readonly kind = ExpressionKind.Property;
  constructor(
    public key: Expression,
    public value: Expression,
    public shorthand: boolean,
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is Property {
    return expr.kind === ExpressionKind.Property;
  }
}

export class ObjectExpression implements Expression {
  readonly kind = ExpressionKind.Object;
  constructor(
    public props: Property[],
    public span: SrcSpan
  ) {}

  static is(expr: Expression): expr is ObjectExpression {
    return expr.kind === ExpressionKind.Object;
  }
}
