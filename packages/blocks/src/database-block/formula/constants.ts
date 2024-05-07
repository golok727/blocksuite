export const EOF_CHAR: string = '\0';

export const ESCAPE_CHARACTER_MAP: Record<string, string> = {
  n: '\n',
  f: '\f',
  t: '\t',
  r: '',
  "'": "'",
  '"': '"',
  '`': '`',
  '\\': '\\',
};
