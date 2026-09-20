import { runPaperPath } from "../src/lib/desk/paper-path";

const result = runPaperPath();
for (const line of result.report) console.log(line);
if (!result.ok) {
  for (const fail of result.failures) console.error("FAIL", fail);
  process.exit(1);
}
console.log("paper path ok");
