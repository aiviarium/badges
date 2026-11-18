# Badges

The badge endpoint of Aiviarium. It draws a badge with a project's icon and colour, and takes the text from [shields.io](https://shields.io). Every badge shields.io offers works here.

```text
https://aiviarium-badges.helight.workers.dev/<project>/<shields.io path>
```

`<project>` is `aiviarium`, `rookery`, `parrot`, `crow` or `hatchery`. The rest is the address of a shields.io badge without `https://img.shields.io/`.

| Badge | Address after the host |
| --- | --- |
| The project's name | `/hatchery` |
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
| `src/data.json` | The outlines of the characters and the icons. `tools/build.py` writes it |
| `assets/` | Inter with its license, and the icons |
| `cloudflare.config.ts` | The name and settings of the worker |

Run `tools/build.py` after a change to an icon or the font. It needs Python with `fonttools` and `brotli`.

The worker doesn't use credentials, and this repository doesn't store any.

## License

The code is under either of [Apache-2.0](LICENSE-APACHE) or [MIT](LICENSE-MIT), at your option. Inter is under the [SIL Open Font License](assets/inter-OFL.txt).
