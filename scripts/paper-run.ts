import { demoAuthRequired, signDemoCookie, verifyDemoCookie } from "../src/lib/desk/demo-auth";
import { runPaperPath } from "../src/lib/desk/paper-path";
import { blobStoreEnabled, storeBackend } from "../src/lib/desk/store";

const result = runPaperPath();
for (const line of result.report) console.log(line);
if (!result.ok) {
  for (const fail of result.failures) console.error("FAIL", fail);
  process.exit(1);
}

const failures: string[] = [];
if (storeBackend() !== "json-file" && !blobStoreEnabled()) {
  failures.push("Store must be json-file unless blob is enabled.");
}

const prevCode = process.env.DEMO_ACCESS_CODE;
const prevSecret = process.env.AUTH_SECRET;
process.env.DEMO_ACCESS_CODE = "desk-code";
process.env.AUTH_SECRET = "paper-auth-secret";
if (!demoAuthRequired()) failures.push("DEMO_ACCESS_CODE must require auth.");
if (verifyDemoCookie(signDemoCookie(1_000_000))) failures.push("Expired demo cookie must fail.");
if (!verifyDemoCookie(signDemoCookie())) failures.push("Fresh signed demo cookie must verify.");
if (prevCode === undefined) delete process.env.DEMO_ACCESS_CODE;
else process.env.DEMO_ACCESS_CODE = prevCode;
if (prevSecret === undefined) delete process.env.AUTH_SECRET;
else process.env.AUTH_SECRET = prevSecret;
if (!process.env.DEMO_ACCESS_CODE?.trim() && demoAuthRequired()) {
  failures.push("Unset DEMO_ACCESS_CODE must stay open.");
}

if (failures.length) {
  for (const fail of failures) console.error("FAIL", fail);
  process.exit(1);
}

console.log("paper path ok");
