# Badges

The badge endpoint of Aiviarium. It draws a badge with a project's icon and colour, and takes the text from [shields.io](https://shields.io). Every badge shields.io offers works here.

```text
https://aiviarium-badges.helight.workers.dev/<project>/<shields.io path>
```

`<project>` is `aiviarium`, `rookery`, `parrot`, `crow` or `hatchery`. The rest is the address of a shields.io badge without `https://img.shields.io/`.

| Badge | Address after the host |
| --- | --- |
| The project's name | `/hatchery` |
| The project's name as its wordmark | `/hatchery?facet` |
| Fixed text | `/hatchery/badge/state-in%20development-x` |
| Latest release | `/hatchery/github/v/release/aiviarium/hatchery` |
| CI | `/hatchery/github/actions/workflow/status/aiviarium/hatchery/ci.yml?label=CI` |
| License | `/hatchery/github/license/aiviarium/hatchery` |
| A value on another project's colour | `/aiviarium/badge/Aiviarium-Hatchery-x?tone=hatchery` |

In Markdown:

```markdown
[![Release](https://aiviarium-badges.helight.workers.dev/hatchery/github/v/release/aiviarium/hatchery)](https://github.com/aiviarium/hatchery/releases)
```

## Requests

The worker asks shields.io for the JSON form of the badge and draws its label and value. The query string goes to shields.io unchanged, so `label=` and the other shields.io settings work. `tone=<project>` is the exception. It is read here and sets the colour behind the value.

Colours from shields.io are ignored. A value is on the project's colour, or on grey when it reports a failure, such as a repository that was not found or a failing workflow.

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

The code is under either of [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT), at your option. Inter is under the [SIL Open Font License](assets/inter-OFL.txt). The wordmarks are outlines of Bricolage Grotesque, which is under [the same license](assets/bricolage-grotesque-OFL.txt).
