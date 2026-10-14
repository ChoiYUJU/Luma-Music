# Changelog — Luma Music Max

## 3.3.1 — End-user install preview

- Made GUI-first installation guidance prominent in README and added a dedicated user install guide for Windows and major Linux package families.
- Added a maintainer release checklist that requires real OS/audio/upgrade smoke tests before publishing downloads.
- Changed the default Linux release build to stable primary formats: AppImage, DEB, RPM, and tar.gz. Pacman and Flatpak remain explicit experimental targets so they cannot block the primary installers.
- Added clearer per-platform artifact names for Windows Setup EXE, portable EXE, Windows ZIP, and Linux packages.
- Simplified GitHub Actions package workflow: native Ubuntu and Windows runners build user-facing artifacts for version tags; a draft release and SHA-256 manifest are assembled for manual maintainer review.
- Preserved the stable app ID `org.lumamusic.player` and the user's exact mint equalizer logo.
- Important: this authoring environment could not download npm dependencies, so installers have not yet been built or runtime-tested here. This is not a stable release until CI artifacts are tested and published by a maintainer.

## 3.3.0 — Cross-platform Packaging Preview

- Added Linux AppImage, DEB, RPM, Pacman, Flatpak bundle, and tar.gz packaging configuration.
- Added Windows NSIS installer, portable EXE, and ZIP targets.
- Added cross-platform build workflow and SHA-256 draft release pipeline.
- Added portability tests and support documentation.
- Preserved stable app ID `org.lumamusic.player` and the user-provided mint equalizer logo.
- First automated target: Linux x86_64 and Windows x64. ARM64 remains separate until built and runtime-validated. Alpine/musl is not supported in this preview.

## 3.2.0 — Cover-forward UI & Light Theme Preview

- Added Dark / Light / System theme modes.
- Reworked All Songs and recent sections into responsive cover grids with a list alternative.
- Added visible colored fills for seek/volume controls.
- Expanded embedded art support and local sidecar artwork discovery; added fallback artwork when files cannot load.
- Preserved local-first playback, original Luma logo, stable app ID, and Glass/Solid switch.

## 3.1.0 — Glass UI Preview

- Reworked the main visual system with frosted-glass surfaces, refined spacing, artwork-led content, consistent playback controls, and immersive Now Playing.
- Added responsive layout refinements for laptop and narrow-window sizes.
- Kept local-first playback and the original Luma logo.
