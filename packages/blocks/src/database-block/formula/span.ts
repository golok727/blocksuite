export class SrcSpan {
  constructor(
    public readonly start: number,
    public readonly end: number
  ) {}

  get length() {
    return this.end - this.start;
  }

  merge(other: SrcSpan) {
    return new SrcSpan(
      Math.min(this.start, other.start),
      Math.max(this.end, other.end)
    );
  }

  sourceText(source: string) {
    return source.slice(this.start, this.end);
  }

  contains(index: number): boolean {
    return index >= this.start && index <= this.end;
  }

  toString() {
    return `[[ Start: ${this.start} , End: ${this.end} ]]`;
  }
}
