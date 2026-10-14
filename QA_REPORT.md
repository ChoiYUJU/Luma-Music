# QA Report — Luma Music Max 3.3.1

## Source/config checks

- [x] Package JSON parses and version is 3.3.1.
- [x] Application ID remains `org.lumamusic.player` to preserve existing per-user data location.
- [x] Primary Linux release targets are AppImage, DEB, RPM, and tar.gz.
- [x] Windows x64 release targets are NSIS Setup installer, portable EXE, and ZIP.
- [x] Source CI exists for Ubuntu and Windows.
- [x] Packaging workflow builds on version tags or manual GitHub Actions dispatch; optional `release_tag` creates a draft release plus SHA-256 checksums.
- [x] End-user GUI install guide and maintainer release checklist are present.
- [x] Experimental package formats (Pacman/Flatpak) are not required for the primary release build.
- [x] Original mint equalizer logo assets retained byte-for-byte.
- [ ] Build AppImage, DEB, RPM, Windows Setup and portable EXE in GitHub Actions.
- [ ] Install via GUI on Linux Mint/Ubuntu and Windows 10/11.
- [ ] Test clean launch, relaunch, upgrade from previous release, import music, artwork, play/pause, seek, volume, queue, playlists, fullscreen, Light/Dark/System.
- [ ] Test Fedora/RPM and a non-Ubuntu AppImage host, and X11/Wayland where practical.
- [ ] Publish only after the draft release is tested.

## Honest status

Local source/configuration tests are the only checks that have been observed in this authoring environment. No installer was built here because the npm dependency registry timed out. The GitHub Actions workflow has not yet been observed running in the user's repository. Do not describe this preview as installed, signed, universal, or bug-free. Windows code signing is not configured.
