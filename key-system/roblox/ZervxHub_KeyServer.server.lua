-- ZervxHub key validation adapter.
-- Install as a Script in ServerScriptService in an experience you own.
-- Replace the two configuration values locally in Studio; never put this file in a LocalScript.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local API_URL = "https://YOUR-WORKER-DOMAIN/v1/keys/verify"
local SERVER_TOKEN = "SET_THIS_IN_SERVER_SCRIPT_ONLY"

local remote = ReplicatedStorage:FindFirstChild("ZervxHub_VerifyKey")
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "ZervxHub_VerifyKey"
    remote.Parent = ReplicatedStorage
end

local attempts = {}
local function verify(player, submittedKey)
    if typeof(submittedKey) ~= "string" or #submittedKey < 10 or #submittedKey > 80 then
        return false, "Invalid key format."
    end
    local now = os.clock()
    local record = attempts[player.UserId]
    if not record or now - record.startedAt >= 60 then
        record = { startedAt = now, count = 0 }
        attempts[player.UserId] = record
    end
    record.count += 1
    if record.count > 6 then return false, "Too many attempts. Wait one minute." end

    local ok, response = pcall(function()
        return HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["Authorization"] = "Bearer " .. SERVER_TOKEN,
            },
            Body = HttpService:JSONEncode({
                key = submittedKey,
                robloxUserId = tostring(player.UserId),
            }),
        })
    end)
    if not ok or not response.Success then
        warn("[ZervxHub] Key API unavailable.")
        return false, "Key service unavailable. Try again later."
    end
    local decodedOk, data = pcall(function() return HttpService:JSONDecode(response.Body) end)
    if not decodedOk or typeof(data) ~= "table" then return false, "Invalid key service response." end
    return data.valid == true, data.message or "Key rejected."
end

remote.OnServerInvoke = verify
Players.PlayerRemoving:Connect(function(player) attempts[player.UserId] = nil end)
