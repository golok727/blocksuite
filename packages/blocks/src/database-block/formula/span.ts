export class SrcSpan {
  constructor(
    public readonly start: number,
    public readonly end: number
  ) {}

  contains(index: number): boolean {
    return index >= this.start && index <= this.end;
  }

  toString() {
    return `[[ Start: ${this.start} , End: ${this.end} ]]`;
  }
}

export function Span(start: number, end: number) {
  return new SrcSpan(start, end);
}
