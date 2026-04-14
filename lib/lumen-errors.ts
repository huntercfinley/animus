export class InsufficientLumenError extends Error {
  constructor(public current: number, public required: number) {
    super('insufficient_lumen');
    this.name = 'InsufficientLumenError';
  }
}
