# Security policy

Luma Music is a local-first desktop application. The renderer should remain isolated from Node.js and must not receive generic filesystem, shell, or IPC access.

## Reporting a vulnerability

Please report suspected security issues privately to the project maintainer before public disclosure. Include the affected version, Linux distribution, reproduction steps, and any logs that do not contain private file paths or personal information.

## Security design notes

- Keep `nodeIntegration` disabled, `contextIsolation` enabled, and renderer sandboxing enabled.
- Expose narrowly scoped operations through `src/preload.cjs` only.
- Do not add remote JavaScript, remote CSS, telemetry, or external network requests without an explicit privacy review.
- Keep `luma-audio://` bound to scanned track IDs and validate every filesystem path in the main process.
- Do not accept arbitrary renderer-supplied paths for file reads.
