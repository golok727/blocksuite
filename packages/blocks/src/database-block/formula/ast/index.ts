import type { SrcSpan } from '../span.js';
import type { Statement } from './statement.js';

export * from './expr.js';
export * from './statement.js';

export interface Formula {
  type: 'formula' | 'script'; // Should we do it ?
  body: Statement[];
  span: SrcSpan;
}
