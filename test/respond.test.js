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

test("a failure reported by shields.io is drawn on grey", async () => {
  const fetcher = upstream({ label: "release", message: "repo not found", color: "red" });
  const body = await (await get("/parrot/github/v/release/example/none", fetcher)).text();
  assert.match(body, /fill="#3A3A42"/);
  assert.doesNotMatch(body, /<rect[^>]*fill="#FF6369"/);
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
  assert.equal((await get("/heron")).status, 404);
  assert.equal((await get("/crow/badge/a-b-x?tone=heron", upstream({}))).status, 400);
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
