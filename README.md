# Badges

The badge endpoint of Aiviarium. It draws a badge in a project's colour, and takes the text from [shields.io](https://shields.io). Every badge shields.io offers works here.

```text
https://aiviarium-badges.helight.workers.dev/<project>/<shields.io path>
```

`<project>` is `aiviarium`, `rookery`, `parrot`, `crow`, `hatchery`, `heron`, `sparrow` or `nocturne`. The rest is the address of a shields.io badge without `https://img.shields.io/`.

| Badge | Address after the host |
| --- | --- |
| The project's name | `/rookery` |
| The project's name as its wordmark | `/rookery?facet` |
| Fixed text | `/rookery/badge/state-in%20development-x` |
| Latest release | `/rookery/github/v/release/aiviarium/rookery` |
| CI | `/rookery/github/actions/workflow/status/aiviarium/rookery/ci.yml?label=CI` |
| License | `/rookery/github/license/aiviarium/rookery` |
| A value on another project's colour | `/aiviarium/badge/Aiviarium-Rookery-x?tone=rookery` |
| A badge centred in a box 56 high, with 8 pixels of space on its left | `/rookery/github/license/aiviarium/rookery?height=56&gap=8` |
| A Lucide icon | `/rookery/github/license/aiviarium/rookery?icon=lucide:scale` |
| A brand logo from Simple Icons | `/rookery/badge/rust-1.95-x?icon=si:rust` |
| The name badge without its icon | `/rookery?icon=none` |
| A state chosen by hand | `/rookery/badge/hosts-4%20online-x?state=success` |

In Markdown:

```markdown
[![Release](https://aiviarium-badges.helight.workers.dev/rookery/github/v/release/aiviarium/rookery)](https://github.com/aiviarium/rookery/releases)
```

## Requests

The worker asks shields.io for the JSON form of the badge and draws its label and value. The query string goes to shields.io unchanged, so `label=` and the other shields.io settings work. The exceptions are read here: `icon`, `state`, `facet` and `tone`, described below, and `height` and `gap`. `height` and `gap` place the badge in a larger transparent box, which lines it up beside other images where CSS is not allowed, such as a README heading on GitHub.

A value that reports a state gets a dot and the word in the state's colour, on a tint of that colour, as in Nocturne. The worker reads the state from the value. For a share such as coverage, it also reads the colour shields.io gives it.

| State | Colour | Values |
| --- | --- | --- |
| `success` | green | passing, success, healthy, operational, and a high share such as coverage |
| `running` | blue, pulsing | pending, running, in progress, queued |
| `warning` | amber | a middling share, such as coverage |
| `danger` | red | failing, error, down, and a low share |
| `neutral` | grey | cancelled, skipped, no status, not found |

`state=<name>` sets the state by hand, and `state=none` draws the value without one. Any other value, such as a version or a license, is on the project's colour, or on `tone`.

`icon` sets the icon at the left. The name badge has the project's icon and the other badges have none unless `icon` names one. It takes another project's slug, `lucide:<name>` for any [Lucide](https://lucide.dev/icons) icon, `si:<slug>` for a logo from [Simple Icons](https://simpleicons.org), or `none`. Lucide icons and logos are drawn in the project's colour.

Answers are cached for five minutes, and badges with fixed text for a day. When shields.io cannot be reached, the value reads `unavailable` for a minute.

The text is drawn as outlines of Inter. A badge looks the same wherever it is shown. Where the worker has no outline for a character, it draws a question mark.

## Your own projects

The worker draws the projects listed in `projects.json`. To run it for other projects, fork this repository and:

1. List your projects in `projects.json`. Each one has a lowercase slug as its key, a `name`, a `colour` as `#RRGGBB` and an `icon`. A `wordmark` is optional, and without one `?facet` draws the name in Inter.
2. Put the icons and wordmarks under `assets/`. Icons are SVGs with a square viewBox. Wordmarks need a viewBox 105 high with the baseline at 80.
3. Run `tools/build.py` to write `src/data.json`.
4. Set your worker's name in `cloudflare.config.ts` and the address the root redirects to in `src/index.js`.
5. Deploy it with `npx cf deploy`. A free Cloudflare account is enough.

The icons and wordmarks in `assets/` belong to Aiviarium. Replace them in a fork.

## Work on it

```bash
npm install
npm test          # the tests, with Node
npx cf dev        # a local server
npx cf deploy     # needs a Cloudflare login: npx cf auth login
```

| Path | What it is |
| --- | --- |
| `src/index.js` | The routes, the request to shields.io and the cache |
| `src/badge.js` | The drawing |
| `projects.json` | The projects, with their names, colours, icons and wordmarks |
| `src/data.json` | The projects and the outlines of the characters. `tools/build.py` writes it |
| `assets/` | Inter with its license, the icons and the wordmarks |
| `cloudflare.config.ts` | The name and settings of the worker |

Run `tools/build.py` after a change to `projects.json`, an icon, a wordmark or the font. It needs Python with `fonttools` and `brotli`.

The worker doesn't use credentials, and this repository doesn't store any.

## License

The code is under either of [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT), at your option. Inter is under the [SIL Open Font License](assets/inter-OFL.txt). The Lucide icons are under the ISC license. The wordmarks are outlines of Bricolage Grotesque, which is under [the same license](assets/bricolage-grotesque-OFL.txt).
