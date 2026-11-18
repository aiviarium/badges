// Draws a badge as SVG. Text is drawn as outlines from data.json, so a badge
// looks the same wherever it is shown.
import data from "./data.json" with { type: "json" };

// The base colour of each project on a dark background.
export const COLOURS = {
  aiviarium: "#3FCF8E",
  rookery: "#F2B33D",
  parrot: "#FF6369",
  crow: "#8F8FFA",
  hatchery: "#E879F9",
};

const FIELD = "#18181B"; // behind the label
const LINE = "#2A2A30"; // the outline, which keeps the badge visible on a dark page
const LABEL = "#EDEDEF";
const VALUE = "#0A0A0B";
const MUTED = "#3A3A42"; // behind a value that reports a failure

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

function icon(project) {
  const { viewBox, body } = data.icons[project];
  const y = (HEIGHT - ICON) / 2;
  return `<svg x="${PAD - 1}" y="${y}" width="${ICON}" height="${ICON}" viewBox="${viewBox}">${body}</svg>`;
}

/**
 * A badge with the project's icon and a label on a dark field. With a value,
 * the value is on the colour of `tone`, or on grey when `muted` is set.
 */
export function badge({ project, label, value = null, tone = project, muted = false }) {
  const alone = value === null;
  let x = PAD - 1 + ICON + 5;
  let labelPath;
  [labelPath, x] = outline(label, 600, x, alone ? COLOURS[project] : LABEL);
  const split = x + PAD;
  const parts = [`<rect width="${fixed(split)}" height="${HEIGHT}" fill="${FIELD}"/>`];
  let width = split;
  if (!alone) {
    const [valuePath, end] = outline(value, 650, split + PAD, muted ? LABEL : VALUE);
    width = end + PAD;
    parts.push(
      `<rect x="${fixed(split)}" width="${fixed(width - split)}" height="${HEIGHT}" fill="${muted ? MUTED : COLOURS[tone]}"/>`,
      valuePath,
    );
  }
  parts.push(icon(project), labelPath);
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
