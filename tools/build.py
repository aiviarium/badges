#!/usr/bin/env python3
"""Write src/data.json: the projects of projects.json and the outlines of Inter.

The worker has no font at run time. This script reads assets/inter.woff2 and
stores each character as a path at the size of the badge text, with its
advance. It also reads each project's colour, icon and wordmark. Run it after
a change to projects.json, the assets or the constants here. Needs fonttools
and brotli.
"""
import json
import re
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
SIZE = 11.5
# Label, value.
WEIGHTS = (600, 650)
CHARS = [chr(c) for c in range(32, 127)] + [chr(c) for c in range(161, 256)] + list("–—…·•↑↓→✓✗€")


def number(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def glyphs(weight):
    font = instantiateVariableFont(TTFont(ROOT / "assets" / "inter.woff2"), {"wght": weight})
    scale = SIZE / font["head"].unitsPerEm
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    table = {}
    for char in CHARS:
        name = cmap.get(ord(char))
        if name is None:
            continue
        pen = SVGPathPen(glyph_set, ntos=number)
        glyph_set[name].draw(TransformPen(pen, (scale, 0, 0, -scale, 0, 0)))
        table[char] = [round(font["hmtx"][name][0] * scale, 3), pen.getCommands()]
    return table


def icon(path):
    source = (ROOT / path).read_text()
    body = source.split(">", 1)[1].rsplit("</svg>", 1)[0]
    return {
        "viewBox": re.search(r'viewBox="([^"]+)"', source).group(1),
        "body": re.sub(r">\s+<", "><", body).strip(),
    }


def wordmark(path):
    """A wordmark on a 100-unit em: a viewBox 105 high with the baseline at 80."""
    source = (ROOT / path).read_text()
    return {
        "width": float(re.search(r'viewBox="0 0 ([\d.]+) 105"', source).group(1)),
        "body": source.split(">", 1)[1].rsplit("</svg>", 1)[0].strip(),
    }


def project(slug, entry):
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", slug):
        raise SystemExit(f"projects.json: {slug!r} is not a lowercase slug")
    if not re.fullmatch(r"#[0-9A-Fa-f]{6}", entry["colour"]):
        raise SystemExit(f"projects.json: the colour of {slug} is not #RRGGBB")
    out = {"name": entry["name"], "colour": entry["colour"], "icon": icon(entry["icon"])}
    if entry.get("wordmark"):
        out["wordmark"] = wordmark(entry["wordmark"])
    return out


def lucide():
    """The inner markup of every Lucide icon, by name, from the lucide-static package."""
    folder = ROOT / "node_modules" / "lucide-static" / "icons"
    if not folder.is_dir():
        raise SystemExit("run npm install first: tools/build.py reads node_modules/lucide-static")
    icons = {}
    for path in sorted(folder.glob("*.svg")):
        source = path.read_text()
        body = source.split(">", 2)[2] if source.startswith("<!--") else source.split(">", 1)[1]
        body = body.rsplit("</svg>", 1)[0]
        icons[path.stem] = re.sub(r"\s*/>", "/>", re.sub(r">\s+<", "><", body)).strip()
    return icons


projects = json.loads((ROOT / "projects.json").read_text())
data = {
    "glyphs": {str(weight): glyphs(weight) for weight in WEIGHTS},
    "projects": {slug: project(slug, entry) for slug, entry in projects.items()},
    "lucide": lucide(),
}
(ROOT / "src" / "data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
