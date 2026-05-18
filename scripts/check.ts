import { spawn } from "node:child_process";

const commands = ["build", "lint:markers", "lint:bundle", "lint:extension", "lint:drive", "lint:markdown"];

for (const command of commands) {
  await run("pnpm", [command]);
}

console.log("All MarkDrive checks passed.");

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = process.platform === "win32"
      ? spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", [command, ...args].join(" ")], { stdio: "inherit" })
      : spawn(command, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}
