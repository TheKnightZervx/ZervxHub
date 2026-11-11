--[[
    ZervxHub v1.2.0 - SERVER KEY VALIDATOR (DEMO)
    Install as a Script in ServerScriptService.

    IMPORTANT:
    - This is a local allow-list demo, not a production payment/license service.
    - Keep real keys on the server or in a trusted backend, never in a LocalScript.
    - Replace demo keys below with keys you issue privately.
    - For a real store, validate licenses through your own trusted HTTPS backend
      using a secure server-side integration and rate limiting.
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")

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

-- DEMO ONLY: change these sample values before testing.
local VALID_KEYS = {
    ["ZERVX-DEMO-2026"] = true,
}

local attempts = {}
local MAX_ATTEMPTS_PER_WINDOW = 8
local WINDOW_SECONDS = 60

remote.OnServerInvoke = function(player, submittedKey)
    if typeof(submittedKey) ~= "string" or #submittedKey > 80 then
        return false, "Invalid key format."
    end

    local now = os.clock()
    local record = attempts[player.UserId]
    if not record or now - record.startedAt > WINDOW_SECONDS then
        record = {startedAt = now, count = 0}
        attempts[player.UserId] = record
    end

    record.count += 1
    if record.count > MAX_ATTEMPTS_PER_WINDOW then
        return false, "Too many attempts. Please wait a minute."
    end

    local normalized = submittedKey:upper():gsub("%s+", "")
    if VALID_KEYS[normalized] then
        return true, "Access granted. Welcome to ZervxHub Gold."
    end

    return false, "Invalid or expired key."
end

game:GetService("Players").PlayerRemoving:Connect(function(player)
    attempts[player.UserId] = nil
end)
