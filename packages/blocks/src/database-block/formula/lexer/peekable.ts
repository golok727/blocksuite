/**
 * An iterator with a `peek()` method which returns a reference to the next element without advancing the iterator
 */
export class Peekable<Item> implements Iterable<Item> {
  [Symbol.iterator]!: () => Iterator<Item>;

  static readonly symbol = Symbol('peekable');

  private iterator: Iterator<Item>;
  private peeked: IteratorResult<Item>;

  private _length: number;
  private _remaining: number;

  constructor(iterable: Iterable<Item>) {
    this[Symbol.iterator] = iterable[Symbol.iterator].bind(iterable);

    this._remaining = this._length = getIterableLength(iterable);

    this.iterator = this[Symbol.iterator]();
    this.peeked = this.iterator.next();
  }

  /**
   * Returns next() value without advancing the iterator.
   */
  peek(): Item | undefined {
    return this.peeked.value;
  }

  /**
   * Advances the iterator and returns the next value
   */
  next(): Item | undefined {
    const peeked = this.peeked;
    this.peeked = this.iterator.next();
    if (!peeked.done) this._remaining--;
    return peeked.value;
  }

  /**
   * Skips a n number of items
   */
  skip(n: number) {
    while (n-- > 0 && !this.done()) this.next();

    return this;
  }

  /**
   * Returns if all items are consumed or not
   */
  done(): boolean {
    return !!this.peeked.done;
  }

  /**
   * Returns the number of remaining items
   */
  get remaining() {
    return this._remaining;
  }

  /**
   * Calls a defined callback function on the remaining items of the peekable, and returns a new peekable based on the new result.
   */
  map<R>(mapper: (value: Item, index: number) => R): Peekable<R> {
    return new Peekable(this.toArray().map(mapper));
  }

  /**
   * Returns the new Peekable with items that meet the condition specified in a callback function.
   */
  filter(f: (value: Item, index: number) => boolean): Peekable<Item> {
    return new Peekable(this.toArray().filter(f));
  }

  /**
   *Calls the specified callback function for all the remaining items in the peekable. The return value of the callback function is the accumulated result, and is provided as an argument in the next call to the callback function.
   */
  fold<Folded>(f: (acc: Folded, value: Item) => Folded, init: Folded): Folded {
    return this.toArray().reduce(f, init);
  }

  /**
   * Return a new iterator from the remaining items in the iterator
   */
  clone(): Peekable<Item> {
    // not using array.from to avoid unnecessary clones
    let n = this._length - this.remaining;
    const peek = new Peekable<Item>(this);
    peek._remaining = this._remaining;
    peek._length = this._remaining;
    while (n--) {
      peek.next();
    }
    return peek;
  }

  /**
   * Returns an array of remaining items in the iterator
   */
  toArray() {
    const res: Item[] = [];
    const clone = this.clone();
    while (!clone.done()) {
      res.push(clone.next()!);
    }
    return res;
  }
}

function getIterableLength(iterable: Iterable<unknown>) {
  let len = 0;
  for (const _ of iterable) len++;
  return len;
}
