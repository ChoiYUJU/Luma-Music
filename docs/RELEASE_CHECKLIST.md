# Maintainer release checklist

This checklist is for maintainers; normal users should not need a terminal.

1. Verify `package.json` version and update `CHANGELOG.md`, `README.md`, and `QA_REPORT.md`.
2. Run `npm test` on a clean checkout.
3. Push the changes to `main`.
4. Start the **Build user installers** workflow from GitHub Actions → Run workflow. Use the current `main` branch, and enter a `release_tag` that matches the package version (example: `v3.3.1`) if you want the workflow to create the draft release automatically. Leave the field blank to build temporary test artifacts only. Alternatively, push a matching `v*` tag.
5. Confirm the Linux and Windows jobs both pass.
6. Open the automatically-created draft Release. Download all primary artifacts and test on at least Windows 10/11 and a current Linux Mint/Ubuntu installation; test Fedora/RPM where available.
7. Verify `SHA256SUMS.txt`, logos, app launch, import music folder, artwork, play/pause, seek, volume, next/previous, playlists, fullscreen, Light/Dark/System and upgrade from previous version.
8. Publish the draft only after checks pass. If any package fails, fix workflow/config and rebuild; do not publish partial artifacts as a stable release.
9. Confirm the public Releases page contains a Windows Setup installer, Windows portable app, Linux AppImage, `.deb`, `.rpm`, and checksums.

Code-signing certificates are not included. Windows SmartScreen and Linux desktop/FUSE behavior must be documented honestly until signing and cross-distro tests are in place.
