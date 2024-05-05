import { Cursor } from './cursor.js';

export enum TokenKind {}

export function tokenize(source: string) {
  const cursor = new Cursor(source);
  () => cursor;
}
