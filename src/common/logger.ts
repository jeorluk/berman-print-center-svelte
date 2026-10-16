export class Logger {
  private static isEnabled: boolean = import.meta.env.DEV;

  static log(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isEnabled) {
      console.log(`[GAS]:`, message, ...optionalParams);
    }
  }

  static warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isEnabled) {
      console.warn(`[GAS ⚠️]:`, message, ...optionalParams);
    }
  }

  static error(message?: unknown, ...optionalParams: unknown[]): void {
    if (this.isEnabled) {
      console.error(`[GAS ❌]:`, message, ...optionalParams);
    }
  }

  static enable(): void {
    this.isEnabled = true;
  }

  static disable(): void {
    this.isEnabled = false;
  }

  static reset(): void {
    this.isEnabled = import.meta.env.DEV;
  }

  static time(label: string): void {
    if (this.isEnabled) {
      console.time(`[GAS ⏱️]: ${label}`);
    }
  }

  static timeEnd(label: string) {
    if (this.isEnabled) {
      console.timeEnd(`[GAS ⏱️]: ${label}`);
    }
  }
}
