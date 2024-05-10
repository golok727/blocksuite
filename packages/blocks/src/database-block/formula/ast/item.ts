import type { SrcSpan } from '../span.js';
import type { Expr, Ident } from './expr.js';

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

export interface Item {
  readonly kind: ItemKind;
  span: SrcSpan;
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

export class NameDeclarator implements Item {
  readonly kind = ItemKind.NameDeclarator;

  constructor(
    public name: Ident,
    public init: Expr | null,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is NameDeclarator {
    return stmt.kind === ItemKind.NameDeclarator;
  }
}

export class NameDeclaration implements Item {
  readonly kind = ItemKind.NameDeclaration;

  constructor(
    public declarations: NameDeclarator[],
    public type: NameDeclarationType,
    public span: SrcSpan
  ) {}

  static is(stmt: Item): stmt is NameDeclaration {
    return stmt.kind === ItemKind.NameDeclaration;
  }
}
