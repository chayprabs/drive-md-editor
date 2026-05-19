import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const failures: string[] = [];
const conventionalHeader = /^(feat|fix|docs|test|chore|refactor|perf)(\([a-z0-9-]+\))?: .+/;
const requiredScopeCoverage: Record<string, string[]> = {
  app: ["core", "editor", "errors", "export", "frontmatter", "preview", "theme", "ui"],
  background: ["core", "drive", "errors", "release"],
  branding: ["branding", "release"],
  content: ["drive"],
  docs: ["docs", "privacy", "store"],
  drive: ["drive", "sync", "conflict"],
  editor: ["editor"],
  options: ["options"],
  release: ["release", "ci", "perf"]
};
const requiredModuleTags = [
  "module/app",
  "module/background",
  "module/branding",
  "module/content",
  "module/docs",
  "module/drive",
  "module/editor",
  "module/export",
  "module/options",
  "module/preview",
  "module/release",
  "module/theme",
  "module/ui"
];

const log = await git(["log", "--reverse", "--format=%H%x09%s"]);
const commits = log.trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const [hash, ...subjectParts] = line.split("\t");
  return { hash, subject: subjectParts.join("\t") };
});
const implementationCommits = commits.filter((commit) => commit.subject !== "first commit");

expect(implementationCommits.length >= 30 && implementationCommits.length <= 120, `Expected 30-120 MarkDrive implementation commits, found ${implementationCommits.length}.`);

for (const commit of implementationCommits) {
  expect(conventionalHeader.test(commit.subject), `Commit ${commit.hash.slice(0, 7)} is not Conventional Commit formatted: ${commit.subject}`);
}

const scopes = new Set(
  implementationCommits
    .map((commit) => commit.subject.match(/^[a-z]+(?:\(([a-z0-9-]+)\))?: /)?.[1])
    .filter((scope): scope is string => Boolean(scope))
);

for (const [moduleName, acceptedScopes] of Object.entries(requiredScopeCoverage)) {
  expect(acceptedScopes.some((scope) => scopes.has(scope)), `Git history is missing module coverage for: ${moduleName}`);
}

const tags = new Set((await git(["tag", "--list"])).trim().split(/\r?\n/).filter(Boolean));
for (const tag of requiredModuleTags) {
  expect(tags.has(tag), `Git history is missing required module tag: ${tag}`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Git history invariants passed.");

async function git(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { encoding: "utf8" });
  return stdout;
}

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
