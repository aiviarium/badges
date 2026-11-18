# Working on Badges

A Cloudflare worker that draws badges in a project's style, with the text taken from shields.io.

| Path | What it is |
| --- | --- |
| `src/index.js` | Routes, the request to shields.io and the cache |
| `src/badge.js` | The drawing |
| `projects.json` | The projects |
| `src/data.json` | Written by `tools/build.py`. Never edit it by hand |
| `test/` | Tests, run with `npm test` |

- Run `npm test` and `npx cf deploy --dry-run` before a commit. After a change to `projects.json`, the assets or `tools/build.py`, run `tools/build.py` and commit `src/data.json` with it.
- Commits follow Conventional Commits.
- Credentials never go into the worker or the repository.
- The README has to pass Vale: `vale --output=line README.md` has to print an empty result.
