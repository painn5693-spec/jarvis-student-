import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../public/app.js", import.meta.url), "utf8");
const vault = readFileSync(new URL("../public/vault.js", import.meta.url), "utf8");
const serviceWorker = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

test("all static id selectors in browser modules exist in the HTML", () => {
  const selectors = [app, vault]
    .flatMap((source) => [...source.matchAll(/querySelector\("#([^"]+)"\)/g)].map((match) => match[1]));
  const uniqueIds = [...new Set(selectors)];
  const missing = uniqueIds.filter((id) => !html.includes('id="' + id + '"'));
  assert.deepEqual(missing, []);
});

test("Knowledge Vault navigation points to an existing view", () => {
  assert.match(app, /vault:\s*\[/);
  assert.match(html, /id="view-vault"/);
  assert.match(html, /data-view="vault"/);
});

test("offline app shell caches the shared study logic module", () => {
  assert.match(serviceWorker, /study-core\.js/);
  assert.match(serviceWorker, /pathname\.startsWith\("\/api\/"\)/);
});
