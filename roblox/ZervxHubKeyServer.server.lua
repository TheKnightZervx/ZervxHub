-- ZervxHub Worker-backed license validator
-- Install as a Script in ServerScriptService for an experience you own.
-- Use only one ZervxHub validator for the ZervxHub_VerifyKey RemoteFunction.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local HttpService = game:GetService("HttpService")

local API_BASE = "https://YOUR-WORKER.workers.dev"
local MAX_ATTEMPTS = 5
local WINDOW_SECONDS = 60

local attempts = {}
local remote = ReplicatedStorage:FindFirstChild("ZervxHub_VerifyKey")
if remote and not remote:IsA("RemoteFunction") then
    remote:Destroy()
    remote = nil
end
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "ZervxHub_VerifyKey"
    remote.Parent = ReplicatedStorage
end

local function verify(player, submittedKey)
    -- Clear any previous authorization before every fresh verification attempt.
    player:SetAttribute("ZervxHubAuthorized", false)

    if typeof(submittedKey) ~= "string" then
        return false, "Enter a valid key."
    end
    local key = submittedKey:match("^%s*(.-)%s*$")
    if #key < 20 or #key > 100 then
        return false, "Key format is invalid."
    end
    if API_BASE:find("YOUR%-WORKER") then
        return false, "Key service is not configured yet."
    end
    local serverKey = ServerStorage:FindFirstChild("ZervxHubGameServerKey")
    if not serverKey or not serverKey:IsA("StringValue") or serverKey.Value == "" then
        return false, "Key service is not configured yet."
    end
    if game.GameId <= 0 then
        return false, "This experience has no valid Universe ID."
    end

    local now = os.clock()
    local record = attempts[player.UserId]
    if not record or now - record.startedAt >= WINDOW_SECONDS then
        record = {startedAt = now, count = 0}
        attempts[player.UserId] = record
    end
    record.count += 1
    if record.count > MAX_ATTEMPTS then
        return false, "Too many attempts. Wait one minute."
    end

    local ok, response = pcall(function()
        return HttpService:RequestAsync({
            Url = API_BASE .. "/v2/keys/validate",
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-game-server-key"] = serverKey.Value,
            },
            Body = HttpService:JSONEncode({
                key = key,
                universeId = tostring(game.GameId),
                robloxUserId = tostring(player.UserId),
                requestId = HttpService:GenerateGUID(false),
                timestamp = os.time(),
            }),
        })
    end)
    if not ok then
        warn("[ZervxHub] License API request failed: " .. tostring(response))
        return false, "Key service is temporarily unavailable."
    end
    if response.StatusCode >= 500 then
        return false, "Key service is temporarily unavailable."
    end

    local decodedOk, data = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)
    if not decodedOk or typeof(data) ~= "table" then
        return false, "Invalid response from key service."
    end
    if data.valid == true then
        player:SetAttribute("ZervxHubAuthorized", true)
        return true, "Key verified. Welcome to ZervxHub."
    end

    player:SetAttribute("ZervxHubAuthorized", false)
    local reasons = {
        invalid_or_revoked = "Key is invalid or revoked.",
        invalid_or_expired = "Key is invalid or expired.",
        expired = "Key has expired.",
        game_not_allowed = "This game is not authorized for ZervxHub.",
        license_bound_to_another_user = "This license is already bound to another Roblox account.",
        developer_suspended = "ZervxHub access for this game is paused.",
        invalid_request = "Key request is invalid.",
        server_credential_invalid = "Key service setup is incomplete. Contact the game developer.",
        request_replayed = "This key request has already been used. Try again.",
        rate_limited = "Too many attempts. Wait a minute.",
    }
    return false, reasons[data.reason] or "Key verification failed."
end

remote.OnServerInvoke = function(player, submittedKey)
    return verify(player, submittedKey)
end

Players.PlayerAdded:Connect(function(player)
    player:SetAttribute("ZervxHubAuthorized", false)
end)
Players.PlayerRemoving:Connect(function(player)
    attempts[player.UserId] = nil
end)

print("[ZervxHub] Worker key validator ready. Configure API_BASE before release.")
