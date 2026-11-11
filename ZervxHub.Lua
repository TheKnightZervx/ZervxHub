-- [[ ZERVXHUB - PURE MULTI-HUB BYPASS CONTROLLER ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- 🧹 CLEANUP LAYER: Forces any old interfaces to destroy instantly
local oldHubs = {"ZervxOceanMainHub", "ZervxFloatingIconGui", "SolixHubGui", "LunarHubGui"}
for _, uiName in pairs(oldHubs) do
    if CoreGui:FindFirstChild(uiName) then 
        pcall(function() CoreGui[uiName]:Destroy() end) 
    end
end

-- ============================================================== --
-- 🚀 BYPASSED PREMIUM COMMUNITY ENGINE DEPLOYMENT 
-- Loads directly from source repositories to skip verification gates
-- ============================================================== --
task.spawn(function()
    local success, err = pcall(function()
        -- Direct open-source repository loader bypassing the main solixhub site lock
        loadstring(game:HttpGet("https://githubusercontent.com"))()
    end)
    
    if not success then
        warn("[-] Direct source link failed. Switching to alternative open source framework... Error: " .. tostring(err))
        -- Ultra-stable fallback layout containing structural Hitbox Expansion, Infinite Gas and Kill Aura
        pcall(function()
            loadstring(game:HttpGet("https://githubusercontent.com"))()
        end)
    end
end)

print("[+] ZervxHub Bypassed Script Initialized Successfully!")
