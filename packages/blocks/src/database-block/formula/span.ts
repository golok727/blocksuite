export class SrcSpan {
  constructor(
    public readonly start: number,
    public readonly end: number
  ) {}

  contains(index: number): boolean {
    return index >= this.start && index <= this.end;
  }
}
