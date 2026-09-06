import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { convertBusinessSettingToV2 } from "../shared/business-identity.ts";

const MAXIMUM_INPUT_BYTES = 65_536;
const arguments_ = process.argv.slice(2);

if (arguments_.length !== 1) {
  throw new Error("Usage: npm run business:convert-v2 -- <business-setting.json>");
}

try {
  const inputPath = path.resolve(arguments_[0]);
  const metadata = await stat(inputPath);
  if (!metadata.isFile() || metadata.size < 1 || metadata.size > MAXIMUM_INPUT_BYTES) throw new Error();
  const input = JSON.parse(await readFile(inputPath, "utf8"));
  const converted = convertBusinessSettingToV2(input);
  process.stdout.write(`${JSON.stringify(converted, null, 2)}\n`);
} catch {
  throw new Error("The Moving business Setting input is invalid and was not converted.");
}
