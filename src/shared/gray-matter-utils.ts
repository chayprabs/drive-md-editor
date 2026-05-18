export function define(obj: object, key: string, val: unknown): void {
  Reflect.defineProperty(obj, key, {
    enumerable: false,
    configurable: true,
    writable: true,
    value: val
  });
}

export function isBuffer(): false {
  return false;
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toBuffer(input: unknown): unknown {
  return input;
}

export function toString(input: unknown): string {
  if (typeof input !== "string") {
    throw new TypeError("expected input to be a string");
  }
  return input.replace(/^\uFEFF/, "");
}

export function arrayify<T>(value: T | T[] | null | undefined): T[] {
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

export function startsWith(str: string, substr: string, len = substr.length): boolean {
  return str.slice(0, len) === substr;
}
