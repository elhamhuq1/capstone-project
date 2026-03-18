# Knowledge Base

## create-next-app rejects directory names with capital letters
**Discovered:** 2026-03-17 (T01)
**Context:** `npx create-next-app@latest .` fails in a directory with capital letters (e.g., `M001`) because npm package naming disallows capitals.
**Workaround:** Scaffold in a temp directory (`/tmp/nextapp-scaffold`), then copy files back to the working directory.
**Impact:** ~30 seconds extra, no functional difference.

## Next.js 16 uses Turbopack by default for builds
**Discovered:** 2026-03-17 (T01)
**Context:** `create-next-app@latest` (v16.1.7) generates a project that uses Turbopack for production builds. The `--no-turbopack` flag only affects `next dev`, not `next build`.
**Impact:** Build output shows "Turbopack" instead of "Webpack". `serverExternalPackages` still works correctly with Turbopack.

## Ollama install requires sudo; user-local install via tar.zst works
**Discovered:** 2026-03-17 (T02)
**Context:** The official `curl | sh` install script requires sudo to write to `/usr/local`. Without sudo, download `https://ollama.com/download/ollama-linux-amd64.tar.zst` and extract to `~/.local/`. The `.tgz` URL returns 404 — current releases use zstd compression only.
**Workaround:** `curl -fsSL -o /tmp/ollama.tar.zst "https://ollama.com/download/ollama-linux-amd64.tar.zst" && cd ~/.local && tar --zstd -xf /tmp/ollama.tar.zst`
**Impact:** Ollama binary at `~/.local/bin/ollama`, must start manually with `~/.local/bin/ollama serve` (no systemd service).

## ReadableStream controller.close() aborts pending async work in finally block
**Discovered:** 2026-03-17 (S03/T03)
**Context:** In Next.js streaming routes, calling `controller.close()` before an async DB write in the `finally` block causes the write to silently fail — connection teardown aborts pending promises.
**Fix:** Complete DB writes BEFORE calling `controller.close()`.

## curl -w "%{http_code}" unreliable with streaming responses
**Discovered:** 2026-03-17 (S03/T03)
**Context:** `-o file -w "%{http_code}"` on streaming endpoints produces garbled codes (e.g. "200000"). Use `-D headerfile` and parse status from first line instead.

## sqlite3 CLI may not be installed — use better-sqlite3 via node
**Discovered:** 2026-03-17 (S03/T03)
**Context:** Verification scripts can use `node -e "const Database = require('better-sqlite3'); ..."` for DB queries instead of requiring `sqlite3` CLI.
