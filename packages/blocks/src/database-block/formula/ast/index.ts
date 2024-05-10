import type { SrcSpan } from '../span.js';
import type { Stmt } from './stmt.js';

export * from './expr.js';
export * from './stmt.js';

export interface Formula {
  type: 'formula' | 'script'; // Should we do it ?
  body: Stmt[];
  span: SrcSpan;
}
