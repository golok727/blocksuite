export class SrcSpan {
  constructor(
    public start: number,
    public end: number
  ) {}

  get length() {
    return this.end - this.start;
  }

  // we will be merging quite a lot so don't use math.min and math.max
  /** @must   */
  merge(other: SrcSpan) {
    let start = this.start;
    let end = this.end;

    if (other.start < this.start) {
      start = other.start;
    }
    if (other.end > this.end) {
      end = other.end;
    }
    return new SrcSpan(start, end);
  }

  mergeMut(other: SrcSpan) {
    if (other.start < this.start) {
      this.start = other.start;
    }
    if (other.end > this.end) {
      this.end = other.end;
    }
    return this;
  }

  clone() {
    return new SrcSpan(this.start, this.end);
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

export interface Spannable {
  span: SrcSpan;
}
