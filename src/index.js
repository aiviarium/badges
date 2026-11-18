// The badge endpoint.
//
//   /<project>                     the project's name, as its wordmark with
//                                  ?facet
//   /<project>/<shields.io path>   any shields.io badge, drawn in the
//                                  project's style
//
// Our own query parameters, which are not sent on to shields.io:
//   icon=<project>|lucide:<name>|si:<slug>|none   the icon at the left
//   state=auto|success|running|warning|danger|neutral|none
//   tone=<project>                 the colour behind a value without a state
//   height=<n>, gap=<n>            a larger transparent box around the badge
//
// The label and the value come from the JSON form of the shields.io badge, so
// every badge shields.io offers works and no credentials are stored here.
import { badge, LUCIDE, PROJECTS, STATES } from "./badge.js";

const SHIELDS = "https://img.shields.io";
const README = "https://github.com/aiviarium/badges#readme";
// Text longer than this is cut, so that a request cannot ask for a huge image.
const LONGEST = 64;
// Simple Icons, for `icon=si:<slug>`, at a fixed version.
const SIMPLE_ICONS = "https://cdn.jsdelivr.net/npm/simple-icons@16.38.0/icons";

// What a shields.io value says about a state. The words come first, since the
// colour of a value means different things on different badges.
const WORDS = [
  ["success", /^(passing|passed|success|succeeded|ok|up|healthy|online|operational|stable)$/],
  ["running", /^(pending|running|in progress|queued|waiting|building|started|requested)$/],
  ["danger", /^(failing|failed|failure|error|errored|broken|down|offline|critical|timed out)$/],
  ["neutral", /^(cancelled|canceled|skipped|no status|unknown|inactive|not found|neutral|stale)$/],
];
const COLOURS = {
  brightgreen: "success",
  green: "success",
  success: "success",
  yellowgreen: "warning",
  yellow: "warning",
  orange: "warning",
  important: "warning",
  red: "danger",
  critical: "danger",
};
// shields.io reports a badge it cannot fill with one of these colours.
const UNAVAILABLE = new Set(["lightgrey", "lightgray", "inactive"]);

function stateOf(found) {
  const message = found.message.trim().toLowerCase();
  for (const [state, words] of WORDS) if (words.test(message)) return state;
  if (/not found|no releases|invalid|inaccessible/.test(message)) return "neutral";
  return COLOURS[found.color] ?? null;
}

// The icon a request names, or undefined when it names none we know.
async function glyphOf(param, project, fetcher) {
  if (param === null) return { project };
  if (param === "none") return null;
  if (Object.hasOwn(PROJECTS, param)) return { project: param };
  const colour = PROJECTS[project].colour;
  const [kind, name] = param.split(":");
  if (kind === "lucide" && Object.hasOwn(LUCIDE, name)) return { lucide: name, colour };
  if (kind === "si" && /^[a-z0-9]+$/.test(name ?? "")) {
    try {
      const response = await fetcher(`${SIMPLE_ICONS}/${name}.svg`, {
        cf: { cacheTtl: 86400, cacheEverything: true },
      });
      if (!response.ok) return undefined;
      const source = await response.text();
      const path = source.match(/<path d="([^"]+)"/)?.[1];
      const viewBox = source.match(/viewBox="([^"]+)"/)?.[1];
      if (path && viewBox && /^[\d\s.eE+-]+$/.test(viewBox) && /^[\w\s.,+-]+$/.test(path)) {
        return { path, viewBox, colour };
      }
    } catch {}
  }
  return undefined;
}

const cut = (text) => {
  const chars = [...String(text)];
  return chars.length > LONGEST ? chars.slice(0, LONGEST - 1).join("") + "…" : chars.join("");
};

const text = (body, status) =>
  new Response(body + "\n", { status, headers: { "content-type": "text/plain; charset=utf-8" } });

const svg = (body, seconds) =>
  new Response(body, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": `public, max-age=${seconds}, s-maxage=${seconds}`,
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });

// What the shields.io badge at `path` says, or null when it cannot be read.
async function shields(path, query, fetcher) {
  try {
    const response = await fetcher(`${SHIELDS}/${path}.json${query}`, {
      headers: { accept: "application/json", "user-agent": "aiviarium-badges" },
    });
    if (!response.ok) return null;
    const json = await response.json();
    if (typeof json.label !== "string" || typeof json.message !== "string") return null;
    return json;
  } catch {
    return null;
  }
}

// Places a badge in a larger transparent box: `height` centres it vertically,
// `gap` adds space on its left. Both help line badges up beside other images
// where no CSS is allowed, such as a README heading on GitHub.
function frame(body, height, gap) {
  if (height === 22 && gap === 0) return body;
  const width = Number(body.match(/ width="(\d+)"/)[1]) + gap;
  const y = (height - 22) / 2;
  const label = body.match(/aria-label="([^"]*)"/)[1];
  const inner = body.replace("<svg ", `<svg x="${gap}" y="${y}" `);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}" ` +
    `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${inner.trimEnd()}</svg>\n`
  );
}

// A whole number from the query between `low` and `high`, or null when it is not.
function bounded(params, key, fallback, low, high) {
  if (!params.has(key)) return fallback;
  const n = Number(params.get(key));
  params.delete(key);
  return Number.isInteger(n) && n >= low && n <= high ? n : null;
}

/** Answers one request. `fetcher` is replaced in tests. */
export async function respond(request, fetcher = fetch) {
  if (request.method !== "GET" && request.method !== "HEAD") return text("Method not allowed", 405);
  const url = new URL(request.url);
  const [project, ...rest] = url.pathname.split("/").filter(Boolean);
  if (project === undefined) return Response.redirect(README, 302);
  if (!Object.hasOwn(PROJECTS, project)) {
    return text(`Unknown project. Use one of: ${Object.keys(PROJECTS).join(", ")}`, 404);
  }
  const name = PROJECTS[project].name;
  // `height`, `gap`, `facet` and `tone` are ours.
  const height = bounded(url.searchParams, "height", 22, 22, 200);
  const gap = bounded(url.searchParams, "gap", 0, 0, 64);
  if (height === null || gap === null) return text("height is 22 to 200 and gap 0 to 64", 400);
  const out = (body, seconds) => svg(frame(body, height, gap), seconds);
  const iconParam = url.searchParams.get("icon");
  url.searchParams.delete("icon");
  const glyph = await glyphOf(iconParam, project, fetcher);
  if (glyph === undefined) {
    return text("icon is a project, lucide:<name>, si:<slug> or none", 400);
  }
  const facet = url.searchParams.has("facet");
  url.searchParams.delete("facet");
  if (rest.length === 0) return out(badge({ project, label: name, facet, glyph }), 86400);

  const stateParam = url.searchParams.get("state") ?? "auto";
  url.searchParams.delete("state");
  if (!["auto", "none", ...Object.keys(STATES)].includes(stateParam)) {
    return text(`state is auto, none or one of: ${Object.keys(STATES).join(", ")}`, 400);
  }

  // `tone` is ours too. shields.io reads the rest of the query, such as `label`.
  const tone = url.searchParams.get("tone") ?? project;
  if (!Object.hasOwn(PROJECTS, tone)) return text("Unknown project in tone", 400);
  url.searchParams.delete("tone");
  const query = url.searchParams.size ? `?${url.searchParams}` : "";
  const path = rest.join("/").replace(/\.(svg|json|png)$/, "");

  const found = await shields(path, query, fetcher);
  if (found === null) {
    return out(
      badge({ project, label: cut(rest[0]), value: "unavailable", glyph, state: "neutral" }),
      60,
    );
  }
  const fixedText = rest[0] === "badge" || rest[0] === "static";
  return out(
    badge({
      project,
      label: cut(found.label || name),
      value: cut(found.message),
      tone,
      glyph,
      state: stateParam === "auto" ? stateOf(found) : stateParam === "none" ? null : stateParam,
      muted: UNAVAILABLE.has(found.color),
    }),
    fixedText ? 86400 : 300,
  );
}

export default {
  async fetch(request, env, context) {
    const cache = caches.default;
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await respond(request);
    if (request.method === "GET" && response.status === 200) {
      context.waitUntil(cache.put(request, response.clone()));
    }
    return response;
  },
};
