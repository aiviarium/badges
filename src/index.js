// The badge endpoint.
//
//   /<project>                     the project's name, as its wordmark with
//                                  ?facet
//   /<project>/<shields.io path>   any shields.io badge, drawn in the
//                                  project's style
//
// The label and the value come from the JSON form of the shields.io badge, so
// every badge shields.io offers works and no credentials are stored here.
import { badge, COLOURS } from "./badge.js";

const SHIELDS = "https://img.shields.io";
const README = "https://github.com/aiviarium/badges#readme";
// Text longer than this is cut, so that a request cannot ask for a huge image.
const LONGEST = 64;
// shields.io reports a failure with one of these colours.
const FAILURE = new Set(["red", "critical", "lightgrey", "lightgray", "inactive"]);

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

/** Answers one request. `fetcher` is replaced in tests. */
export async function respond(request, fetcher = fetch) {
  if (request.method !== "GET" && request.method !== "HEAD") return text("Method not allowed", 405);
  const url = new URL(request.url);
  const [project, ...rest] = url.pathname.split("/").filter(Boolean);
  if (project === undefined) return Response.redirect(README, 302);
  if (!Object.hasOwn(COLOURS, project)) {
    return text(`Unknown project. Use one of: ${Object.keys(COLOURS).join(", ")}`, 404);
  }
  const name = project[0].toUpperCase() + project.slice(1);
  if (rest.length === 0) {
    return svg(badge({ project, label: name, facet: url.searchParams.has("facet") }), 86400);
  }

  // `tone` is ours. shields.io reads the rest of the query, such as `label`.
  const tone = url.searchParams.get("tone") ?? project;
  if (!Object.hasOwn(COLOURS, tone)) return text("Unknown project in tone", 400);
  url.searchParams.delete("tone");
  const query = url.searchParams.size ? `?${url.searchParams}` : "";
  const path = rest.join("/").replace(/\.(svg|json|png)$/, "");

  const found = await shields(path, query, fetcher);
  if (found === null) {
    return svg(badge({ project, label: cut(rest[0]), value: "unavailable", muted: true }), 60);
  }
  const fixedText = rest[0] === "badge" || rest[0] === "static";
  return svg(
    badge({
      project,
      label: cut(found.label || name),
      value: cut(found.message),
      tone,
      muted: FAILURE.has(found.color),
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
