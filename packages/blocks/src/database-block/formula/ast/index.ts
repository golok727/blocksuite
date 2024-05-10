import type { SrcSpan } from '../span.js';
import type { Item } from './ast.js';

export * from './ast.js';

export interface Formula {
  type: 'formula' | 'script'; // Should we do it ?
  body: Item[];
  span: SrcSpan;
}
