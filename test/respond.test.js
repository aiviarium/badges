import assert from "node:assert/strict";
import { test } from "node:test";
import { respond } from "../src/index.js";

const upstream = (json, seen = []) => async (url) => {
  seen.push(url);
  return new Response(JSON.stringify(json));
};
const get = (path, fetcher) => respond(new Request(`https://badges.example.org${path}`), fetcher);

test("a project alone gives its name", async () => {
  const response = await get("/hatchery");
  assert.equal(response.headers.get("content-type"), "image/svg+xml; charset=utf-8");
  assert.match(await response.text(), /aria-label="Hatchery"/);
});

test("a shields.io path is read as JSON and drawn in the project colour", async () => {
  const seen = [];
  const fetcher = upstream({ label: "release", message: "v1.2.0", color: "blue" }, seen);
  const body = await (await get("/hatchery/github/v/release/example/demo?label=release", fetcher)).text();
  assert.deepEqual(seen, ["https://img.shields.io/github/v/release/example/demo.json?label=release"]);
  assert.match(body, /aria-label="release: v1.2.0"/);
  assert.match(body, /fill="#E879F9"/);
});

test("tone picks the colour of the value and is not sent on", async () => {
  const seen = [];
  const fetcher = upstream({ label: "Aiviarium", message: "Crow" }, seen);
  const body = await (await get("/aiviarium/badge/Aiviarium-Crow-x?tone=crow", fetcher)).text();
  assert.deepEqual(seen, ["https://img.shields.io/badge/Aiviarium-Crow-x.json"]);
  assert.match(body, /fill="#8F8FFA"/);
});

test("a state is drawn as a dot and a word in its colour", async () => {
  const passing = await (await get("/hatchery/github/actions/workflow/status/a/b/ci.yml",
    upstream({ label: "CI", message: "passing", color: "brightgreen" }))).text();
  assert.match(passing, /<circle [^>]*fill="#3FCF8E"/);
  assert.doesNotMatch(passing, /<rect [^>]*fill="#E879F9"/);
  const failing = await (await get("/hatchery/x", upstream({ label: "CI", message: "failing", color: "red" }))).text();
  assert.match(failing, /<circle [^>]*fill="#FF6369"/);
  const running = await (await get("/hatchery/x", upstream({ label: "CI", message: "in progress" }))).text();
  assert.match(running, /<animate /);
  const missing = await (await get("/parrot/x", upstream({ label: "release", message: "repo not found", color: "red" }))).text();
  assert.match(missing, /<circle [^>]*fill="#A1A1AA"/);
});

test("a coloured value that is not a state keeps the project colour", async () => {
  const license = await (await get("/hatchery/x", upstream({ label: "license", message: "Apache-2.0", color: "green" }))).text();
  assert.doesNotMatch(license, /<circle/);
  assert.match(license, /<rect [^>]*fill="#E879F9"/);
  const coverage = await (await get("/hatchery/x", upstream({ label: "coverage", message: "94%", color: "brightgreen" }))).text();
  assert.match(coverage, /<circle [^>]*fill="#3FCF8E"/);
});

test("a value without a state keeps the project colour, and state overrides", async () => {
  const fetcher = upstream({ label: "release", message: "v1.0.0", color: "blue" });
  assert.match(await (await get("/hatchery/x", fetcher)).text(), /<rect [^>]*fill="#E879F9"/);
  const forced = await (await get("/hatchery/badge/a-b-x?state=warning", upstream({ label: "a", message: "b" }))).text();
  assert.match(forced, /<circle [^>]*fill="#F2B33D"/);
  const none = await (await get("/hatchery/x?state=none", upstream({ label: "CI", message: "passing" }))).text();
  assert.doesNotMatch(none, /<circle/);
  assert.equal((await get("/hatchery/x?state=shiny", fetcher)).status, 400);
});

test("only the name badge has the project's icon by default", async () => {
  const fetcher = upstream({ label: "license", message: "MIT" });
  assert.match(await (await get("/crow")).text(), /<svg x=/);
  assert.doesNotMatch(await (await get("/crow/github/license/a/b", fetcher)).text(), /<svg x=/);
  assert.match(await (await get("/crow/github/license/a/b?icon=crow", fetcher)).text(), /<svg x=/);
});

test("icon picks another icon or none and is not sent on", async () => {
  const seen = [];
  const fetcher = upstream({ label: "license", message: "MIT" }, seen);
  const lucide = await (await get("/crow/github/license/a/b?icon=lucide:scale", fetcher)).text();
  assert.deepEqual(seen, ["https://img.shields.io/github/license/a/b.json"]);
  assert.match(lucide, /color="#8F8FFA" stroke="currentColor"/);
  const none = await (await get("/crow?icon=none")).text();
  assert.doesNotMatch(none, /<svg x=/);
  const other = await (await get("/crow?icon=hatchery")).text();
  assert.match(other, /#E879F9/);
  const logo = await get("/crow?icon=si:rust", async () => new Response('<svg viewBox="0 0 24 24"><path d="M1 1h22v22H1z"/></svg>'));
  assert.match(await logo.text(), /<path fill="#8F8FFA" d="M1 1h22v22H1z"/);
  assert.equal((await get("/crow?icon=lucide:nope")).status, 400);
  assert.equal((await get("/crow?icon=si:../x")).status, 400);
});

test("an unreachable shields.io gives a short-lived badge", async () => {
  const response = await get("/rookery/github/v/release/example/demo", async () => {
    throw new Error("down");
  });
  assert.equal(response.headers.get("cache-control"), "public, max-age=60, s-maxage=60");
  assert.match(await response.text(), /unavailable/);
});

test("text is escaped and cut", async () => {
  const fetcher = upstream({ label: '<b>"x"', message: "y".repeat(200) });
  const body = await (await get("/crow/badge/a-b-x", fetcher)).text();
  assert.match(body, /aria-label="&lt;b&gt;&quot;x&quot;: y{63}…"/);
});

test("an unknown project is refused", async () => {
  assert.equal((await get("/no-such-project")).status, 404);
  assert.equal((await get("/crow/badge/a-b-x?tone=no-such-project", upstream({}))).status, 400);
  assert.equal((await get("/constructor")).status, 404);
});

test("facet draws the name as the wordmark", async () => {
  const body = await (await get("/crow?facet")).text();
  assert.match(body, /aria-label="Crow"/);
  assert.match(body, /viewBox="0 0 254.4 105"/);
  assert.doesNotMatch(await (await get("/crow")).text(), /254.4/);
});

test("height and gap place the badge in a larger box and are not sent on", async () => {
  const seen = [];
  const fetcher = upstream({ label: "CI", message: "passing" }, seen);
  const body = await (await get("/hatchery/badge/a-b-x?height=56&gap=8&label=CI", fetcher)).text();
  assert.deepEqual(seen, ["https://img.shields.io/badge/a-b-x.json?label=CI"]);
  assert.match(body, /^<svg [^>]*height="56" viewBox="0 0 \d+ 56"><svg x="8" y="17" /);
  assert.equal((await get("/hatchery?height=10")).status, 400);
  assert.equal((await get("/hatchery?gap=x")).status, 400);
});
