# Contributing to Luma Music

Thanks for helping make a small, privacy-first Linux music player better.

## Before opening an issue

- Include your Linux distribution/version, desktop environment, Node.js version and whether you ran from source or a packaged build.
- Describe the exact steps to reproduce the issue and the expected vs. actual result.
- For playback bugs, share the audio container/codec if known (for example FLAC, MP3, AAC) and relevant console output. Never attach copyrighted or private audio unless you have the right to share it.

## Development

```bash
npm install
npm run check
npm start
```

Keep the renderer isolated: do not enable Node integration, do not expose generic IPC channels, and do not add arbitrary file paths to the preload API. All audio should flow through the allow-listed local protocol. Any new filesystem feature must validate paths against the user-selected library and should avoid network access by default.

## Pull requests

- Keep changes focused and document user-facing behavior.
- Update `CHANGELOG.md` and `README.md` where relevant.
- Run `npm run check` before submitting.
- Test playback and seeking on Linux hardware if you can; note the exact distro and codecs tested.
- Respect the MIT license and avoid adding dependencies without a clear reason.

## Security reports

Please avoid publishing exploitable details before a fix can be prepared. Report the affected version and a minimal reproduction privately to the project maintainer.
