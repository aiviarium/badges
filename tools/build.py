#!/usr/bin/env python3
"""Write src/data.json: the outlines of Inter and the icons the worker draws.

The worker has no font at run time. This script reads assets/inter.woff2 and
stores each character as a path at the size of the badge text, with its
advance. Run it after a change to the font, the icons or the constants here.
Needs fonttools and brotli.
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
# Label beside a value, label alone, value.
WEIGHTS = (500, 600, 650)
CHARS = [chr(c) for c in range(32, 127)] + [chr(c) for c in range(161, 256)] + list("–—…·•↑↓→✓✗€")
PROJECTS = ("aiviarium", "rookery", "parrot", "crow", "hatchery")


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


def icon(project):
    source = (ROOT / "assets" / "icons" / f"{project}-icon.svg").read_text()
    body = source.split(">", 1)[1].rsplit("</svg>", 1)[0]
    return {
        "viewBox": re.search(r'viewBox="([^"]+)"', source).group(1),
        "body": re.sub(r">\s+<", "><", body).strip(),
    }


data = {
    "glyphs": {str(weight): glyphs(weight) for weight in WEIGHTS},
    "icons": {project: icon(project) for project in PROJECTS},
}
(ROOT / "src" / "data.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
