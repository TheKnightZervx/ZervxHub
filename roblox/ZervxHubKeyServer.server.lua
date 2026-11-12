-- ZervxHub Worker-backed license validator
-- Install as a Script in ServerScriptService for an experience you own.
-- Disable the older ZervxHub_v1_3_KeyAuth.server.lua while using this validator.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
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
            Headers = {["Content-Type"] = "application/json"},
            Body = HttpService:JSONEncode({
                key = key,
                universeId = tostring(game.GameId),
                robloxUserId = tostring(player.UserId),
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
        roblox_user_mismatch = "This key is already linked to another Roblox account.",
        developer_suspended = "ZervxHub access for this game is paused.",
        invalid_request = "Key request is invalid.",
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
