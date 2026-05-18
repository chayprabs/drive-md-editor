import { dump, load } from "js-yaml";

type FrontmatterRecord = Record<string, unknown>;

function parseYaml(source: string): FrontmatterRecord {
  const parsed = load(source);
  return isRecord(parsed) ? parsed : {};
}

function stringifyYaml(data: FrontmatterRecord): string {
  return dump(data, { lineWidth: 100, noRefs: true, sortKeys: false });
}

function isRecord(value: unknown): value is FrontmatterRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const yaml = {
  parse: parseYaml,
  stringify: stringifyYaml
};

export const yml = yaml;

export const json = {
  parse(source: string): FrontmatterRecord {
    const parsed = JSON.parse(source);
    return isRecord(parsed) ? parsed : {};
  },
  stringify(data: FrontmatterRecord): string {
    return JSON.stringify(data, null, 2);
  }
};
