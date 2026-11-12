# Developer Studio workspace

The Developer Studio page is available at `website/snippets.html`.

## Personal code workspace

- Save up to 200 code files locally in the current browser profile.
- Assign every saved file to a named game/project or leave it unassigned.
- Search/filter the saved library by text and game/project.
- Edit and reuse files, delete files, and retain up to 10 prior versions per file.
- Import/export a JSON backup. Backups are local files; they are not synced to ZervxHub accounts or other devices.
- A 1 MB workspace safety limit prevents uncontrolled browser storage growth.

## Execution boundary

- The built-in runner executes plain JavaScript in a temporary Web Worker, without a DOM, with a 2.5 second timeout.
- The page declares a restrictive Content Security Policy, including no network connections. Browser support and policy enforcement must still be tested in a real browser.
- Python, Lua, Roblox Lua, HTML, CSS, and Discord.js are stored as source only in this phase; they are not executed by this page.
- Roblox scripts must be tested in Roblox Studio / the correct server-client context. A game/project label is an organizational tag, not a connection to or deployment into that game.
- Review imported or pasted code before running it. Never run code from an untrusted source.

## Privacy and limitations

- Workspace content is stored in browser localStorage on this device/profile. Clearing browser site data can erase it.
- There is no cloud sync, account-level storage, server upload, or multi-device sync yet.
- Export a backup regularly and before changing browser/device.
- This is not yet a full IDE, debugger, AI assistant, API client, or code security scanner.

## Verification still required

Run browser tests for save/reload, project assignment, search/filter, import/export, version restore, mobile layout, worker output, worker timeout, and CSP/network blocking. Source-level checks alone do not prove browser behavior.
