# Developer Studio: snippet library

## Phase 1

The static Developer Studio page is available at `website/snippets.html`.

- Search by title, language, description, tags, or code text.
- Filter by JavaScript, Python, Lua, Roblox Lua, HTML, CSS, and Discord.js.
- Copy snippets through the browser clipboard API when available.
- Render code with `textContent`, not HTML interpolation.
- Do not evaluate or execute snippet contents.
- No snippet content is uploaded to a server.

## Current scope and limitations

This is the first small, static library foundation. It is not yet a full code editor, debugger, API client, AI assistant, or security scanner. Those tools must be added separately with safe execution boundaries and explicit user control.

## Verification

The source has been reviewed for safe DOM insertion and non-execution. Browser interaction and clipboard behavior still require a real browser test; do not treat those as verified by source review alone.
