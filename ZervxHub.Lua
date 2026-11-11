-- [[ ZERVXHUB - MULTI-HUB HIGH PERFORMANCE ENGINE CONTROLLER ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- 🧹 CLEANUP LAYER: Wipes overlapping interfaces to ensure optimized frame rendering
local oldHubs = {"ZervxOceanMainHub", "ZervxFloatingIconGui", "SolixHubGui", "LunarHubGui"}
for _, uiName in pairs(oldHubs) do
    if CoreGui:FindFirstChild(uiName) then 
        pcall(function() CoreGui[uiName]:Destroy() end) 
    end
end

-- ============================================================== --
-- 🚀 PREMIUM COMMUNITY ENGINE DEPLOYMENT 
-- Features Loaded: Auto-Farm, Insta-Kill Aura, Auto-Raid, Auto-Mission
-- ============================================================== --
task.spawn(function()
    local success, err = pcall(function()
        -- Directly runs the top-performing multi-hub configuration framework
        loadstring(game:HttpGet("https://solixhub.com/loader"))()
    end)
    
    if not success then
        warn("[-] Target Framework Loading Interrupted. Falling back to secure multi-thread loader... Error: " .. tostring(err))
        -- Stable alternative fallback framework containing advanced Hitbox Extenders & Kill Aura configurations
        pcall(function()
            loadstring(game:HttpGet("https://raw.githubusercontent.com/raydjs/napoleonHub/refs/heads/main/src.lua"))()
        end)
    end
end)

print("[+] ZervxHub Premium Main Script Engine Initialized Successfully!")
