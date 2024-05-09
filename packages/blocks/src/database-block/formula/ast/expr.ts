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

interface BaseExpression {
  kind: ExpressionKind;
  span: SrcSpan;
}

export interface Literal extends BaseExpression {
  kind: ExpressionKind.Literal;
  value: number | string | boolean;
}

export interface TemplateLiteral extends BaseExpression {
  kind: ExpressionKind.TemplateLiteral;
  value: string;
  // need to expand this
  // expressions
  // placeholders etc.. will be made in future ~)
}

// a b c ... any name
export interface Name extends BaseExpression {
  kind: ExpressionKind.Name;
  name: string;
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

// -a -1 !a !false
export enum UnaryOp {
  Not,
  Negate,
}

export interface UnaryExpression extends BaseExpression {
  kind: ExpressionKind.Unary;
  op: UnaryOp;
  arg: Expression;
}

export interface BinaryExpression extends BaseExpression {
  kind: ExpressionKind.Binary;
  op: BinaryOp;
  left: Expression;
  right: Expression;
}

// 10 > a ? a : b
export interface ConditionalExpression extends BaseExpression {
  kind: ExpressionKind.Condition;
  test: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface AssignmentExpression extends BaseExpression {
  kind: ExpressionKind.Assignment;
  left: Expression;
  right: Expression;
}

/*
  thing()

  CallExpression {
    callee: Name(thing)
    args: []
  }

  thing(10, a)

  CallExpression {
    callee: Name(thing)
    args: [Literal(10), Name(a)]
  }

  cat.meow()
  CallExpression {
    callee: MemberExpression {
      object: Name(cat), 
      prop: Name(meow)
    },
    args: []
  }

 
 */
export interface CallExpression extends BaseExpression {
  kind: ExpressionKind.Call;
  callee: Expression;
  args: Expression[];
}

/* 
Example
 let a =  unit.a.b
          ^^^^^^^^
  MemberExpression {
    object: MemberExpression {
      object: MemberExpression {
        object: Name(unit)
        prop: Name(a)
      }
    },
    prop: Name(b)
  }
 */
export interface MemberExpression extends BaseExpression {
  kind: ExpressionKind.MemberExpression;
  object: Expression;
  prop: Name;
}

/* 
  1..9
  RangeExpression {
    start: 1, 
    end: 8
  }

  1.=9
  RangeExpression { 
    start: 1
    end: 9
  }
*/
export interface RangeExpression extends BaseExpression {
  // todo change this to the thing in your mind
  kind: ExpressionKind.Range;
  start: number;
  end: number;
}

export interface ArrayExpression extends BaseExpression {
  type: ExpressionKind.Array;
  elements: Expression[];
}

export interface Property extends BaseExpression {
  type: ExpressionKind.Property;
  key: Expression;
  value: Expression;
  shorthand: boolean;
}

/*  
{
  name: "Blocksuite", 
  age, 
}
  ObjectExpression {
    props: [
      { key: Name(name), value: Lit("Blocksuite"), shorthand: false}
      { key: Name(age), value: Name(age), shorthand: true} where &key !== &value
    ]
  }
*/
export interface ObjectExpression extends BaseExpression {
  type: ExpressionKind.Object;
  props: Property[];
}

export type Expression =
  | Literal
  | Name
  | TemplateLiteral
  | UnaryExpression
  | BinaryExpression
  | ConditionalExpression
  | AssignmentExpression
  | CallExpression
  | MemberExpression
  | RangeExpression;
