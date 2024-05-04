export interface Peekable<Item> {
  peekable: () => PeekableIterator<Item>;
}

/**
 * Adds a peekable method to the given iterable
 */
export function Peekable<T, Item>(iterable: T & Iterable<Item>) {
  return Object.assign(iterable, {
    peekable: function (this) {
      return new PeekableIterator(iterable);
    },
  } as Peekable<Item>);
}

/**
 * An iterator with a `peek()` method which returns a reference to the next element without advancing the iterator
 */
export class PeekableIterator<Item> {
  static readonly symbol = Symbol('peekable');

  private iterator: Iterator<Item>;
  private peeked: IteratorResult<Item>;
  private remaining;

  constructor(iterable: Iterable<Item>) {
    this.remaining = Array.from(iterable).length;
    this.iterator = iterable[Symbol.iterator]();
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
    if (!peeked.done) this.remaining--;
    return peeked.value;
  }

  /**
   * Skips a n number of items
   */
  skip(n: number) {
    while (n !== 0 && !!this.peeked.done) {
      n--;
      this.next();
    }
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
  get length() {
    return this.remaining;
  }

  /**
   * Calls a defined callback function on the remaining items of the peekable, and returns a new peekable based on the new result.
   */
  map<R>(mapper: (value: Item, index: number) => R): PeekableIterator<R> {
    return new PeekableIterator(this.toArray().map(mapper));
  }

  /**
   * Returns the new Peekable with items that meet the condition specified in a callback function.
   */
  filter(f: (value: Item, index: number) => boolean): PeekableIterator<Item> {
    return new PeekableIterator(this.toArray().filter(f));
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
  clone(): PeekableIterator<Item> {
    const peekable = new PeekableIterator<Item>([]);
    peekable.remaining = this.remaining;
    peekable.peeked = { ...this.peeked };

    const iterator: Iterator<Item> = {
      next: () => this.iterator.next(),
    };
    peekable.iterator = iterator;
    return peekable;
  }

  /**
   * Returns an array of remaining items in the iterator
   */
  toArray() {
    const arr: Item[] = [];
    const clone = this.clone();
    while (!clone.peeked.done) {
      arr.push(clone.next()!);
    }
    return arr;
  }
}
