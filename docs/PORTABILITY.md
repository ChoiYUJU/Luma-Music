# Luma Music Max — installation and portability

This guide is written for people installing the app. Normal users should not need Node.js, npm, Git, or a terminal: download a **built installer** from [GitHub Releases](https://github.com/ChoiYuju/Luma-Music/releases/latest) and open it. The repository's source ZIP is for development, not normal installation.

## Recommended download by operating system

| Operating system | Recommended asset | GUI installation |
|---|---|---|
| Windows 10/11 x64 | `Luma-Music-Max-Setup-<version>-x64.exe` | Double-click and follow the installer. |
| Windows portable | `Luma-Music-Max-Portable-<version>-x64.exe` | Double-click; no installer wizard. |
| Linux Mint / Ubuntu / Debian x64 | `Luma-Music-Max-<version>-x64.deb` | Double-click to open Software Manager or the desktop package installer. |
| Fedora / RHEL / openSUSE x64 | `Luma-Music-Max-<version>-x64.rpm` | Open in the distribution's graphical software installer. |
| Most mainstream Linux x64 distros | `Luma-Music-Max-<version>-x64.AppImage` | Right-click → Properties → Permissions → allow executing, then double-click. |
| Linux manual fallback | `Luma-Music-Max-<version>-x64.tar.gz` | Extract with the archive manager, then run the application from the extracted folder. |

Exact filenames may vary slightly by electron-builder version. Use the format and platform in the asset name rather than guessing.

## Linux compatibility boundaries

- AppImage is the broadest single-file option, but still depends on a compatible x86_64 userspace, graphics/audio libraries, and FUSE or a supported runtime option. It is not guaranteed on every distro or release.
- DEB is for Debian-family distributions. Dependency package names vary by release, so use it on a compatible Debian, Ubuntu, or Mint release.
- RPM is for RPM-based distributions such as Fedora/openSUSE/RHEL-family systems, but dependencies still need testing on each family/version.
- Pacman and Flatpak remain experimental build targets and are not part of the default release workflow until their install, filesystem permissions, artwork, and audio have been tested.
- ARM64, Alpine/musl, and very old Linux releases are not included in the first tested target matrix.

## Build and release (maintainers only)

End users should skip this section.

Requires Node.js 22+:

```bash
npm install
npm test
npm run dist:linux:release
```

On Windows PowerShell:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run dist:win:release
```

Artifacts appear in `release/`. The release workflow builds on native Windows/Linux GitHub-hosted runners for `v*` tags, assembles a draft GitHub Release, and includes `SHA256SUMS.txt`. A maintainer must test the generated packages through actual GUI installation and playback before publishing the draft.

## Trust and code signing

- Windows code signing is not configured. A SmartScreen warning may appear for an unsigned installer. Download only from the official repository release and compare the checksum.
- Linux package integrity should be checked against `SHA256SUMS.txt` before distribution.
- Do not publish a release as stable until the install, launch, audio, upgrade, and uninstall flows have been tested on real target systems.
