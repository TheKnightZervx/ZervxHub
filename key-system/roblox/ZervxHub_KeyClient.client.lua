-- Minimal client adapter for a LocalScript in StarterPlayerScripts.
-- Connect this function to the key-entry UI in your own Roblox experience.
-- This file contains no API token or trusted key data.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local verifyRemote = ReplicatedStorage:WaitForChild("ZervxHub_VerifyKey")

local function verifyZervxHubKey(keyText)
    local ok, valid, message = pcall(function()
        return verifyRemote:InvokeServer(keyText)
    end)
    if not ok then return false, "Could not reach the key service." end
    return valid == true, message or "Key rejected."
end

-- Example:
-- local valid, message = verifyZervxHubKey(keyTextBox.Text)
-- statusLabel.Text = message
-- if valid then showAuthorizedFeatures() end

return verifyZervxHubKey
