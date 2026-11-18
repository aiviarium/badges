// Draws a badge as SVG. Text is drawn as outlines from data.json, so a badge
// looks the same wherever it is shown.
import data from "./data.json" with { type: "json" };

// The projects of projects.json, by slug.
export const PROJECTS = data.projects;

const FIELD = "#18181B"; // behind the label
const LINE = "#2A2A30"; // the outline, which keeps the badge visible on a dark page
const LABEL = "#EDEDEF";
const VALUE = "#0A0A0B";
const MUTED = "#3A3A42"; // behind a value that has no state and no colour

// The state colours of Nocturne on a dark ground. A state value is drawn as a
// dot and a word on a tint of its colour, the way Nocturne shows a state.
export const STATES = {
  success: { colour: "#3FCF8E", glow: true },
  running: { colour: "#5AA9FF", glow: true, pulse: true },
  warning: { colour: "#F2B33D" },
  danger: { colour: "#FF6369" },
  neutral: { colour: "#A1A1AA" },
};

const HEIGHT = 22;
const RADIUS = 5;
const PAD = 7;
const ICON = 14;
const BASELINE = 15.2;

const escape = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const fixed = (n) => String(Math.round(n * 100) / 100);

// The text as paths starting at x, and the x where it ends. A character the
// font table lacks is drawn as a question mark.
function outline(text, weight, x, colour) {
  const table = data.glyphs[weight];
  let paths = "";
  for (const char of text) {
    const [advance, d] = table[char] ?? table["?"];
    if (d) paths += `<path transform="translate(${fixed(x)} ${BASELINE})" d="${d}"/>`;
    x += advance;
  }
  return [`<g fill="${colour}">${paths}</g>`, x];
}

/** Lucide icons by name, for `icon=lucide:<name>`. */
export const LUCIDE = data.lucide;

// The icon at the left. `glyph` is one of:
//   { project }                 the project's icon in its own colours
//   { lucide, colour }          a Lucide icon drawn in a stroke of `colour`
//   { path, viewBox, colour }   a filled path, such as a Simple Icons logo
function icon(glyph) {
  const y = (HEIGHT - ICON) / 2;
  const at = `x="${PAD - 1}" y="${y}" width="${ICON}" height="${ICON}"`;
  if (glyph.project) {
    const { viewBox, body } = PROJECTS[glyph.project].icon;
    return `<svg ${at} viewBox="${viewBox}">${body}</svg>`;
  }
  if (glyph.lucide) {
    return (
      `<svg ${at} viewBox="0 0 24 24" fill="none" color="${glyph.colour}" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${LUCIDE[glyph.lucide]}</svg>`
    );
  }
  const small = 12;
  const inset = (ICON - small) / 2;
  return (
    `<svg x="${PAD - 1 + inset}" y="${(HEIGHT - small) / 2}" width="${small}" height="${small}" ` +
    `viewBox="${glyph.viewBox}"><path fill="${glyph.colour}" d="${glyph.path}"/></svg>`
  );
}

// A state's dot at x on the middle line: a glow behind it for the states that
// glow, pulsing while something runs.
function dot(state, x) {
  const { colour, glow, pulse } = STATES[state];
  const cy = HEIGHT / 2;
  const animate = pulse
    ? '<animate attributeName="opacity" values="1;.25;1" dur="1.6s" repeatCount="indefinite"/>'
    : "";
  const halo = glow
    ? `<circle cx="${fixed(x)}" cy="${cy}" r="6" fill="${colour}" opacity=".22">${animate}</circle>`
    : "";
  return `${halo}<circle cx="${fixed(x)}" cy="${cy}" r="3" fill="${colour}">${pulse ? animate : ""}</circle>`;
}

// The size of a wordmark's type. Its outlines are on a 100-unit em in a box
// 105 high, with the baseline 80 below the top.
const WORDMARK = 12.5;

// The project's wordmark, with its lit facets, starting at x.
function wordmark(project, x) {
  const { width, body } = PROJECTS[project].wordmark;
  const scale = WORDMARK / 100;
  const y = BASELINE - 80 * scale;
  return [
    `<svg x="${fixed(x)}" y="${fixed(y)}" width="${fixed(width * scale)}" height="${fixed(105 * scale)}" viewBox="0 0 ${width} 105">${body}</svg>`,
    x + width * scale,
  ];
}

/**
 * A badge with an icon and a label on a dark field. The icon is the project's
 * unless `glyph` names another one (see `icon`), or none when `glyph` is null.
 *
 * A value is drawn in one of three ways:
 * - with a `state` (see `STATES`), as a dot and the value in the state's
 *   colour on a tint of it,
 * - with `muted`, on grey,
 * - otherwise on the colour of `tone`.
 *
 * With `facet`, a badge of the project's name alone shows its wordmark, when
 * the project has one.
 */
export function badge({
  project,
  label,
  value = null,
  tone = project,
  muted = false,
  facet = false,
  glyph = { project },
  state = null,
}) {
  const alone = value === null;
  let x = glyph === null ? PAD : PAD - 1 + ICON + 5;
  let labelPath;
  [labelPath, x] =
    alone && facet && PROJECTS[project].wordmark
      ? wordmark(project, x)
      : outline(label, 600, x, alone ? PROJECTS[project].colour : LABEL);
  const split = x + PAD;
  const parts = [`<rect width="${fixed(split)}" height="${HEIGHT}" fill="${FIELD}"/>`];
  let width = split;
  if (!alone && state) {
    const { colour } = STATES[state];
    const [valuePath, end] = outline(value, 650, split + PAD + 12, colour);
    width = end + PAD;
    const w = fixed(width - split);
    parts.push(
      `<rect x="${fixed(split)}" width="${w}" height="${HEIGHT}" fill="${FIELD}"/>`,
      `<rect x="${fixed(split)}" width="${w}" height="${HEIGHT}" fill="${colour}" opacity=".14"/>`,
      dot(state, split + PAD + 3),
      valuePath,
    );
  } else if (!alone) {
    const [valuePath, end] = outline(value, 650, split + PAD, muted ? LABEL : VALUE);
    width = end + PAD;
    parts.push(
      `<rect x="${fixed(split)}" width="${fixed(width - split)}" height="${HEIGHT}" fill="${muted ? MUTED : PROJECTS[tone].colour}"/>`,
      valuePath,
    );
  }
  if (glyph !== null) parts.push(icon(glyph));
  parts.push(labelPath);
  width = Math.ceil(width);
  const title = escape(alone ? label : `${label}: ${value}`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}" ` +
    `width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}">` +
    `<title>${title}</title>` +
    `<clipPath id="r"><rect width="${width}" height="${HEIGHT}" rx="${RADIUS}"/></clipPath>` +
    `<g clip-path="url(#r)">${parts.join("")}</g>` +
    `<rect x=".5" y=".5" width="${width - 1}" height="${HEIGHT - 1}" rx="${RADIUS - 0.5}" fill="none" stroke="${LINE}"/>` +
    "</svg>\n"
  );
}
