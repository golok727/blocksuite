import type { Spannable, SrcSpan } from '../span.js';

export enum ItemKind {
  If,
  Fn,
  ArrowFn,
  Block,
  While,
  For,
  NameDeclaration,
  NameDeclarator,
}

export enum ExprKind {
  Literal,
  TemplateLiteral,
  Ident,
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

export interface Item extends Spannable {
  readonly kind: ItemKind;
}

export interface Expr extends Spannable {
  kind: ExprKind;
}

export class Block implements Item {
  readonly kind = ItemKind.Block;

  constructor(
    public statements: Item[],
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is Block {
    return stmt.kind === ItemKind.Block;
  }
}

export class ItemFn implements Item {
  readonly kind = ItemKind.Fn;

  constructor(
    public name: Ident,
    public params: Expr[],
    public body: Block,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemFn {
    return stmt.kind === ItemKind.Fn;
  }
}

export class ItemArrowFn implements Item {
  readonly kind = ItemKind.ArrowFn;

  constructor(
    public params: Expr[],
    public expression: boolean,
    public body: Expr | Block,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemArrowFn {
    return stmt.kind === ItemKind.ArrowFn;
  }
}

export class ItemIF implements Item {
  readonly kind = ItemKind.If;

  constructor(
    public test: Expr,
    public consequent: Expr | Block,
    public alternate: Expr | Block | null,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemIF {
    return stmt.kind === ItemKind.If;
  }
}

export class ItemWhile implements Item {
  readonly kind = ItemKind.While;

  constructor(
    public test: Expr,
    public body: Expr | Block,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemWhile {
    return stmt.kind === ItemKind.While;
  }
}

export class ItemFor implements Item {
  readonly kind = ItemKind.For;

  constructor(
    public each: Expr,
    public range: Expr,
    public body: Expr | Block,
    public span: SrcSpan
  ) {}

  static is(item: Item): item is ItemFor {
    return item.kind === ItemKind.For;
  }
}

export enum NameDeclarationType {
  Let = 'let',
  Const = 'const',
}

export class ItemNameDeclarator implements Item {
  readonly kind = ItemKind.NameDeclarator;

  constructor(
    public name: Ident,
    public init: Expr | null,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemNameDeclarator {
    return stmt.kind === ItemKind.NameDeclarator;
  }
}

export class ItemNameDeclaration implements Item {
  readonly kind = ItemKind.NameDeclaration;

  constructor(
    public declarations: ItemNameDeclarator[],
    public type: NameDeclarationType,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is ItemNameDeclaration {
    return stmt.kind === ItemKind.NameDeclaration;
  }
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

export enum OpBin {
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

export enum OpUnary {
  Not,
  Negate,
}

export class ExprUnary implements Expr {
  readonly kind = ExprKind.Unary;
  constructor(
    public op: OpUnary,
    public arg: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprUnary {
    return expr.kind === ExprKind.Unary;
  }
}

export class ExprBin implements Expr {
  readonly kind = ExprKind.Binary;
  constructor(
    public left: Expr,
    public op: OpUnary,
    public right: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprBin {
    return expr.kind === ExprKind.Binary;
  }
}

// a > b ? "big" : "small"
export class ExprCondition implements Expr {
  readonly kind = ExprKind.Condition;
  constructor(
    public test: Expr,
    public consequent: Expr,
    public alternate: Expr,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprCondition {
    return expr.kind === ExprKind.Condition;
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
    public start: number,
    public end: number,
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

export class ObjProp implements Expr {
  readonly kind = ExprKind.Property;
  constructor(
    public key: Expr,
    public value: Expr,
    public shorthand: boolean,
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ObjProp {
    return expr.kind === ExprKind.Property;
  }
}

export class ExprObject implements Expr {
  readonly kind = ExprKind.Object;
  constructor(
    public props: ObjProp[],
    public span: SrcSpan
  ) {}

  static is(expr: Expr): expr is ExprObject {
    return expr.kind === ExprKind.Object;
  }
}
