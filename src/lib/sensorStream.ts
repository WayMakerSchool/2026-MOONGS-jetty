// Keep incomplete USB/BLE chunks until a line delimiter or an idle boundary.
export class SensorTextBuffer {
  private pending = '';
  constructor(private emit: (line: string) => void) {}
  pushNotification(chunk: string) {
    // BLE firmware may frame samples by notifications instead of newlines.
    const sample = this.pending + chunk;
    if (!/[\r\n]/.test(sample)) {
      const parts = sample.trim().split(',');
      if ([4, 6, 7, 8].includes(parts.length) && parts.every(p => /^\s*-?\d+(?:\.\d+)?\s*$/.test(p))) {
        this.pending = '';
        this.emit(sample.trim());
        return;
      }
    }
    this.push(chunk);
  }
  push(chunk: string) {
    const lines = (this.pending + chunk).split(/\r\n|\r|\n/);
    this.pending = lines.pop() || '';
    lines.forEach(line => { if (line.trim()) this.emit(line.trim()); });
  }
  flush() {
    if (this.pending.trim()) this.emit(this.pending.trim());
    this.pending = '';
  }
}
