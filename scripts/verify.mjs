import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (npmCli === undefined || npmCli.length === 0) {
  throw new Error("npm run verify requires npm_execpath; invoke it with npm run verify.");
}

for (const args of [["test"], ["run", "typecheck"], ["run", "build"]]) {
  const code = await runNpm(args);
  if (code !== 0) process.exit(code);
}

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}
