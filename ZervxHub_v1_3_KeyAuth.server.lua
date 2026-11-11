-- ZervxHub key validator for an experience you own or are authorized to develop.
-- Install as a Script in ServerScriptService and enable HTTP requests in Studio.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

local API_URL = "https://REPLACE_WITH_YOUR_WORKER.workers.dev/v1/keys/validate"
local MAX_ATTEMPTS_PER_WINDOW = 6
local WINDOW_SECONDS = 60
local attempts = {}

local remote = ReplicatedStorage:FindFirstChild("ZervxHub_VerifyKey")
if remote and not remote:IsA("RemoteFunction") then remote:Destroy(); remote = nil end
if not remote then
    remote = Instance.new("RemoteFunction")
    remote.Name = "ZervxHub_VerifyKey"
    remote.Parent = ReplicatedStorage
end

remote.OnServerInvoke = function(player, submittedKey)
    if typeof(submittedKey) ~= "string" or #submittedKey < 10 or #submittedKey > 64 then
        return false, "Invalid key format."
    end
    local now = os.clock()
    local record = attempts[player.UserId]
    if not record or now - record.startedAt >= WINDOW_SECONDS then
        record = {startedAt = now, count = 0}
        attempts[player.UserId] = record
    end
    record.count += 1
    if record.count > MAX_ATTEMPTS_PER_WINDOW then return false, "Too many attempts. Please wait a minute." end

    local ok, response = pcall(function()
        return HttpService:RequestAsync({
            Url = API_URL,
            Method = "POST",
            Headers = { ["Content-Type"] = "application/json", ["Accept"] = "application/json" },
            Body = HttpService:JSONEncode({
                key = submittedKey,
                robloxUserId = tostring(player.UserId),
                experienceId = tostring(game.GameId),
            }),
        })
    end)
    if not ok or not response.Success then
        warn("[ZervxHub] Key API unavailable.")
        return false, "Key verification is temporarily unavailable. Please try again."
    end
    local decodedOk, result = pcall(function() return HttpService:JSONDecode(response.Body) end)
    if not decodedOk or typeof(result) ~= "table" then return false, "Invalid response from key service." end
    return result.valid == true, typeof(result.message) == "string" and result.message or "Invalid or expired key."
end

Players.PlayerRemoving:Connect(function(player) attempts[player.UserId] = nil end)
print("[ZervxHub] Cloud key validator ready.")
