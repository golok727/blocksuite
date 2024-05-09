import type { SrcSpan } from '../span.js';
import type { Expression, Name, NameDeclarator } from './expr.js';

export enum StatementKind {
  If,
  Fn,
  Lambda,
  Block,
  While,
  For,
  NameDecl,
}

interface BaseStatement {
  kind: StatementKind;
  span: SrcSpan;
}

export interface BlockStatement extends BaseStatement {
  kind: StatementKind.Block;
  statements: Statement[];
}

export interface NamedFunctionStatement extends BaseStatement {
  kind: StatementKind.Fn;
  name: Name;
  params: Expression[];
  body: BlockStatement;
}

// () => { } or () => 123
export interface LambdaStatement extends BaseStatement {
  kind: StatementKind.Lambda;
  params: Expression[];
  expression: boolean; // () => 112
  body: Expression | BlockStatement;
}

export interface IfStatement extends BaseStatement {
  kind: StatementKind.If;
  test: Expression;
  consequent: Expression | BlockStatement;
  alternate: Expression | BlockStatement | null;
}

export interface WhileStatement extends BaseStatement {
  kind: StatementKind.While;
  test: Expression;
  body: Expression | BlockStatement;
}

export interface ForStatement extends BaseStatement {
  kind: StatementKind.For;
  each: Expression;
  range: Expression; // can be a range expr of something that evaluates to a iterator
  body: Expression | BlockStatement;
}

export enum NameDeclarationType {
  Let = 'let',
  Const = 'const',
}

export interface NameDeclaration extends BaseStatement {
  kind: StatementKind.NameDecl;
  declarations: NameDeclarator[];
  type: NameDeclarationType;
}

export type Statement =
  | NamedFunctionStatement
  | LambdaStatement
  | NameDeclaration
  | WhileStatement
  | ForStatement
  | IfStatement
  | BlockStatement;
