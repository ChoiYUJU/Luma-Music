# Install Luma Music Max (no terminal needed)

When a tested release is published, end users should download an installer from the GitHub Releases page:

**[Download Luma Music Max](https://github.com/ChoiYuju/Luma-Music/releases/latest)**

Choose the file that matches your operating system. Do not download the source-code ZIP unless you want to develop the app.

## Windows 10/11 (x64)

**Recommended: `Luma-Music-Max-Setup-<version>-x64.exe`**

1. Open the GitHub Releases page and download the `Setup` `.exe`.
2. Double-click the downloaded file.
3. Follow the installer steps. The default installer is per-user and should not require administrator access unless Windows policy says otherwise.
4. Launch **Luma Music Max** from the Start menu or desktop shortcut.

For no-install use, download `Luma-Music-Max-Portable-<version>-x64.exe` and double-click it.

Windows builds may be unsigned. If SmartScreen warns that the publisher is unknown, do not bypass it unless the file came from the official repository/release and its checksum matches the published `SHA256SUMS.txt`.

## Linux Mint / Ubuntu / Debian

**Simplest install: the `.deb` package**

1. Download `Luma-Music-Max-<version>-x64.deb` from Releases.
2. Double-click the `.deb` in the file manager.
3. Install it using Software Manager or the package installer.
4. Open **Luma Music Max** from the application menu.

If your desktop does not offer a graphical `.deb` installer, use the AppImage below or consult your distribution's software installer. Terminal commands are not required by this guide.

**Portable option: AppImage**

1. Download the `.AppImage` file.
2. Right-click it → **Properties** → **Permissions**.
3. Enable **Allow executing file as a program** (wording may differ by desktop).
4. Close Properties and double-click the AppImage.

Some distributions may lack compatible FUSE support or may be too old for the bundled Electron runtime. If it does not start, use a native package where available and report the distro/version in an issue.

## Fedora / RHEL / openSUSE

Download the `.rpm` package and open it with the graphical software installer. Use a package intended for your distribution family; package dependency names can vary by release.

## Other Linux distributions

Try the AppImage first if the distribution provides a compatible glibc and desktop/audio stack. A `.tar.gz` package is a manual-unpack fallback, not a graphical installer. Alpine/musl, ARM64, and very old Linux releases are not covered by the first x64 release until separately built and tested.

## Where do I get the installers?

The source repository does not itself contain built installers. Maintainers trigger the packaging workflow from a version tag. GitHub Actions builds packages on Windows/Linux runners and opens a **draft release**; a maintainer must test the artifacts and publish the release. Until this step has finished, the Releases page may not contain installers.
