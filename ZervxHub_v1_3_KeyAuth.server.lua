--[[
    ZervxHub v1.3.0 - KEYAUTH SERVER VALIDATOR
    Install as a Script in ServerScriptService.

    This version uses KeyAuth API 1.3 from the Roblox server.
    It does NOT place the application secret in this file or in the client.
    KeyAuth's official dashboard documentation says the application secret
    is used only for endpoints other than API 1.3.

    Before testing:
      1. Enable "Allow HTTP Requests" in Roblox Studio > Game Settings > Security.
      2. Keep this script in ServerScriptService.
      3. Keep the matching ZervxHub LocalScript in StarterPlayerScripts.
      4. Confirm the app name and Owner ID below match your KeyAuth dashboard.

    This is for a Roblox experience you own or are authorized to develop.
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local HttpService = game:GetService("HttpService")

-- KeyAuth application details supplied by the project owner.
-- The ID shown in the dashboard is used as Owner ID.
local KEYAUTH = {
    ApiBase = "https://keyauth.win/api/1.3/",
    AppName = "Krymb2235's Application",
    OwnerId = "z3L4A2s1Wj",
    Version = "1.0",
}

local MAX_ATTEMPTS_PER_WINDOW = 6
local WINDOW_SECONDS = 60
local attempts = {}
local sessionId = nil
local initialized = false
local initializationError = nil

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

local function makeUrl(parameters)
    local parts = {}
    for key, value in pairs(parameters) do
        table.insert(parts, HttpService:UrlEncode(key) .. "=" .. HttpService:UrlEncode(tostring(value)))
    end
    return KEYAUTH.ApiBase .. "?" .. table.concat(parts, "&")
end

local function requestJson(parameters)
    local response = HttpService:RequestAsync({
        Url = makeUrl(parameters),
        Method = "GET",
        Headers = {
            ["Accept"] = "application/json",
        },
    })

    if not response.Success then
        error("KeyAuth HTTP request failed with status " .. tostring(response.StatusCode))
    end

    local decoded = HttpService:JSONDecode(response.Body)
    if typeof(decoded) ~= "table" then
        error("KeyAuth returned an invalid response.")
    end
    return decoded
end

local function initializeKeyAuth()
    local ok, result = pcall(function()
        return requestJson({
            type = "init",
            ver = KEYAUTH.Version,
            name = KEYAUTH.AppName,
            ownerid = KEYAUTH.OwnerId,
        })
    end)

    if not ok then
        initializationError = "Could not connect to KeyAuth. Check HTTP settings and try again."
        warn("[ZervxHub] KeyAuth initialization error: " .. tostring(result))
        return false
    end

    if result.success ~= true or typeof(result.sessionid) ~= "string" or result.sessionid == "" then
        initializationError = "KeyAuth initialization was rejected. Check the application details."
        warn("[ZervxHub] KeyAuth initialization rejected: " .. tostring(result.message))
        return false
    end

    sessionId = result.sessionid
    initialized = true
    print("[ZervxHub] KeyAuth API 1.3 initialized.")
    return true
end

-- Initialize once per running Roblox server.
initializeKeyAuth()

remote.OnServerInvoke = function(player, submittedKey)
    if typeof(submittedKey) ~= "string" or #submittedKey < 4 or #submittedKey > 100 then
        return false, "Invalid key format."
    end

    local now = os.clock()
    local record = attempts[player.UserId]
    if not record or now - record.startedAt >= WINDOW_SECONDS then
        record = {startedAt = now, count = 0}
        attempts[player.UserId] = record
    end

    record.count += 1
    if record.count > MAX_ATTEMPTS_PER_WINDOW then
        return false, "Too many attempts. Please wait a minute."
    end

    if not initialized then
        return false, initializationError or "Key verification is temporarily unavailable."
    end

    local normalizedKey = submittedKey:gsub("^%s+", ""):gsub("%s+$", "")
    local ok, result = pcall(function()
        return requestJson({
            type = "license",
            key = normalizedKey,
            sessionid = sessionId,
            name = KEYAUTH.AppName,
            ownerid = KEYAUTH.OwnerId,
            -- Roblox account ID is assigned by the server, not supplied by the client.
            hwid = tostring(player.UserId),
        })
    end)

    if not ok then
        warn("[ZervxHub] KeyAuth license request error: " .. tostring(result))
        return false, "Could not contact KeyAuth. Please try again later."
    end

    if result.success == true then
        return true, "Access granted. Welcome to ZervxHub Gold."
    end

    local message = typeof(result.message) == "string" and result.message or "Invalid or expired key."
    return false, message
end

Players.PlayerRemoving:Connect(function(player)
    attempts[player.UserId] = nil
end)
