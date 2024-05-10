import type { SrcSpan } from '../span.js';
import type { Item } from './item.js';

export * from './expr.js';
export * from './item.js';

export interface Formula {
  type: 'formula' | 'script'; // Should we do it ?
  body: Item[];
  span: SrcSpan;
}
