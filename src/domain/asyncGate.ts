export class LatestRequestGate {
  private current = 0;
  next(): number {
    this.current += 1;
    return this.current;
  }
  isCurrent(requestId: number): boolean {
    return requestId === this.current;
  }
  invalidate(): void {
    this.current += 1;
  }
}
