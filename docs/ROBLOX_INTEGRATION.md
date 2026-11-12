# Roblox server integration

This guide is for an experience you own or are authorized to develop. The repository contains example scripts; no Roblox Studio verification is claimed here.

## Install

1. Deploy and configure your own Worker and D1 database by following [DEPLOYMENT.md](DEPLOYMENT.md).
2. Register the experience's Roblox Universe ID and have an administrator approve the game.
3. Copy `roblox/ZervxHubKeyServer.server.lua` into `ServerScriptService` as a server `Script`.
4. Replace the `API_BASE` placeholder with your own Worker base URL. Do not add any admin token, developer key, bot token, or key pepper to the script.
5. Enable HTTP requests in Roblox Studio's security settings for your test experience.
6. Copy `roblox/ZervxHubKeyPrompt.client.lua` into `StarterPlayer/StarterPlayerScripts` as a `LocalScript`.
7. Gate protected actions in server-side code on the server-controlled `ZervxHubAuthorized` attribute. Never grant access based on a client-supplied attribute or UI state.

The LocalScript sends the entered key to the server through a `RemoteFunction`; the server validates it with the Worker using `game.GameId` and the player's Roblox user ID. Only the server should call the licensing API.

## Expected behavior

- An approved Universe ID, active developer, active unexpired license, and matching game allow verification.
- A license binds to the first Roblox account that successfully validates it; further attempts from another account are denied.
- Expired, revoked, unapproved, or cross-developer keys fail closed.
- The server clears the authorized attribute before every new attempt and when a player joins.
- Verification failures display a generic status to the player. Server-side warnings may contain request diagnostics; sanitize them before sharing logs.
- The current example limits each player to five attempts per minute. Worker-side limits are also per isolate; production operators must configure edge-level rate limiting.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| "Key service is not configured yet" | Replace the `YOUR-WORKER` placeholder in `API_BASE`. |
| Request cannot reach the API | Enable HTTP requests, confirm the URL is correct, and verify the Worker is available. |
| Game is not allowed | Confirm `game.GameId` is the approved Universe ID and the key was issued for that game. |
| Key is invalid or expired | Check that the key was copied correctly, is active, and has not passed its 24-hour expiry. |
| Too many attempts | Wait for the local per-player rate-limit window to expire; investigate repeated requests before raising limits. |
| Access does not unlock a feature | Ensure the feature checks the attribute on the server. The prompt does not automatically secure unrelated game remotes or content. |

Never put trusted authorization in a client script. `ReplicatedStorage` remotes and LocalScript UI are visible to clients; they are not secret storage or security boundaries.

Test valid, invalid, expired, revoked, and wrong-universe keys in a private test experience before release. Studio behavior and live service configuration must be verified by the operator.
