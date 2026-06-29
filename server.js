import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

loadEnvFile();

const [{ createApp }, { port }] = await Promise.all([
  import("./server/app.js"),
  import("./server/config.js"),
]);

const app = createApp();

app.listen(port, "0.0.0.0", () => {
  console.log(`Aération Ventilation listening on port ${port}`);
});

function loadEnvFile() {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), ".env");

  if (!fs.existsSync(envPath)) return;

  const envContent = fs.readFileSync(envPath, "utf8");

  for (const rawLine of envContent.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    process.env[key] = stripEnvQuotes(line.slice(separatorIndex + 1).trim());
  }
}

function stripEnvQuotes(value) {
  const startsAndEndsWithSingleQuote = value.startsWith("'") && value.endsWith("'");
  const startsAndEndsWithDoubleQuote = value.startsWith("\"") && value.endsWith("\"");

  if (value.length >= 2 && (startsAndEndsWithSingleQuote || startsAndEndsWithDoubleQuote)) {
    return value.slice(1, -1);
  }

  return value;
}
