-- [[ ZERVXHUB - ULTIMATE MULTI-MODE FARM & RARITY AUTO-ROLLER SUITE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui") or PlayerGui

-- Clean up residual user interfaces to avoid clashing execution states
local systemGUIs = {"ZervxOceanMainHub", "ZervxFloatingIconGui", "ZervxRarityRoller"}
for _, uiName in pairs(systemGUIs) do
    if CoreGui:FindFirstChild(uiName) then pcall(function() CoreGui[uiName]:Destroy() end) end
end

-- Global Operational Configurations Framework
getgenv().ZervxHub = {
    -- In-Match Combat Features
    AutoFarm = false,
    SafeMode = true,
    HitboxSize = 14.0,
    AutoRefill = true,
    InstantKill = true,
    
    -- Lobby Customization Features
    IsRolling = false,
    RollEpic = false,       -- If true, automatically spins past Epic families
    RollLegendary = false,  -- If true, automatically spins past Legendary families
    RollMythic = false      -- If true, spins past Mythics (Keep false to lock Fritz/Helos)
}

-- ============================================================== --
-- 🛡️ SAFETY & NETWORK INJECTIONS (ANTI-AFK & TARGET SCANNER)
-- ============================================================== --
pcall(function()
    local VirtualUser = game:GetService("VirtualUser")
    LocalPlayer.Idled:Connect(function()
        VirtualUser:CaptureController()
        VirtualUser:ClickButton2(Vector2.new(0, 0))
        print("[+] Anti-AFK cycle pushed to maintain link integrity.")
    end)
end)

local function GetClosestTitanTarget()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    local folders = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies") or workspace:FindFirstChild("TitanFolder")
    if not folders then return nil end
    
    local closest, shortestDistance = nil, math.huge
    for _, titan in pairs(folders:GetChildren()) do
        local targetPart = titan:FindFirstChild("Nape") or titan:FindFirstChild("Neck")
        local humanoid = titan:FindFirstChildOfClass("Humanoid")
        if targetPart and humanoid and humanoid.Health > 0 then
            local dist = (char.HumanoidRootPart.Position - targetPart.Position).Magnitude
            if dist < shortestDistance then
                shortestDistance = dist
                closest = titan
            end
        end
    end
    return closest
end

-- ============================================================== --
-- ⚔️ COMBAT THREAD POOLS (AUTO-FARM, INSTANT 1-STRIKE KILL & REFILL)
-- ============================================================== --
task.spawn(function()
    while true do
        task.wait(0.02) -- Precision framerate timing profile
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then return end
                
                local titan = GetClosestTitanTarget()
                if titan then
                    local hrp = char.HumanoidRootPart
                    local nape = titan:FindFirstChild("Nape") or titan:FindFirstChild("Neck")
                    local humanoid = titan:FindFirstChildOfClass("Humanoid")
                    
                    if nape and humanoid and humanoid.Health > 0 then
                        local randomX = getgenv().ZervxHub.SafeMode and (math.random(-6, 6) / 10) or 0
                        local randomY = getgenv().ZervxHub.SafeMode and (math.random(-3, 8) / 10) or 0
                        local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 2.2)
                        
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        if getgenv().ZervxHub.InstantKill then humanoid.Health = 0 end -- 1-Strike Down
                        hrp.CFrame = targetCFrame
                        
                        if nape:IsA("Part") then
                            nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                            nape.CanCollide = false
                        end
                        
                        local tool = char:FindFirstChildOfClass("Tool") or LocalPlayer.Backpack:FindFirstChildOfClass("Tool")
                        if tool then
                            if tool.Parent ~= char then tool.Parent = char end
                            tool:Activate()
                        end
                    end
                end
            end)
        end
    end
end)

task.spawn(function()
    while true do
        task.wait(0.2)
        if getgenv().ZervxHub.AutoRefill then
            pcall(function()
                local char = LocalPlayer.Character
                local stats = char and (char:FindFirstChild("Variables") or char:FindFirstChild("Stats")) or LocalPlayer:FindFirstChild("Stats")
                if stats then
                    for _, name in pairs({"Gas", "Blades", "FullRefill"}) do
                        local val = stats:FindFirstChild(name)
                        if val and val:IsA("ValueBase") then val.Value = 100 end
                    end
                end
            end)
        end
    end
end)

-- ============================================================== --
-- 🎰 LOBBY SPIN AUTOMATION CONTROLLER (GUI SCREEN SCANNER)
-- ============================================================== --
local function GetCurrentRarity()
    local menu = PlayerGui:FindFirstChild("Customization") or PlayerGui:FindFirstChild("Lobby")
    if menu then
        for _, textLabel in pairs(menu:GetDescendants()) do
            if textLabel:IsA("TextLabel") and string.find(textLabel.Text, "%(") and string.find(textLabel.Text, "%)") then
                local txt = textLabel.Text
                if string.find(txt, "Common") then return "Common"
                elseif string.find(txt, "Rare") then return "Rare"
                elseif string.find(txt, "Epic") then return "Epic"
                elseif string.find(txt, "Legendary") then return "Legendary"
                elseif string.find(txt, "Mythic") then return "Mythic"
                end
            end
        end
    end
    return "Unknown"
end

local function TriggerPhysicalRollClick()
    local menu = PlayerGui:FindFirstChild("Customization") or PlayerGui:FindFirstChild("Lobby")
    if not menu then return false end
    for _, btn in pairs(menu:GetDescendants()) do
        if btn:IsA("TextButton") and (string.find(string.lower(btn.Name), "roll") or string.find(string.lower(btn.Text), "roll")) then
            pcall(function()
                local pos, size = btn.AbsolutePosition, btn.AbsoluteSize
                game:GetService("VirtualInputManager"):SendMouseButtonEvent(pos.X + (size.X / 2), pos.Y + (size.Y / 2) + 50, 0, true, game, 1)
                task.wait(0.05)
                game:GetService("VirtualInputManager"):SendMouseButtonEvent(pos.X + (size.X / 2), pos.Y + (size.Y / 2) + 50, 0, false, game, 1)
            end)
            return true
        end
    end
    return false
end

task.spawn(function()
    while true do
        task.wait(0.5)
        if getgenv().ZervxHub.IsRolling then
            local currentRarity = GetCurrentRarity()
            local shouldRoll = false
            
            if currentRarity == "Common" or currentRarity == "Rare" or currentRarity == "Unknown" then
                shouldRoll = true
            elseif currentRarity == "Epic" and getgenv().ZervxHub.RollEpic then
                shouldRoll = true
            elseif currentRarity == "Legendary" and getgenv().ZervxHub.RollLegendary then
                shouldRoll = true
            elseif currentRarity == "Mythic" and getgenv().ZervxHub.RollMythic then
                shouldRoll = true
            end
            
            if shouldRoll then
                TriggerPhysicalRollClick()
                task.wait(0.4)
            else
                getgenv().ZervxHub.IsRolling = false
            end
        end
    end
end)

-- ============================================================== --
-- 🌊 ADVANCED METROPOLITAN OCEAN CONTROL PANEL UI BUILDER
-- ============================================================== --
local function BuildZervxInterface()
    local MainGui = Instance.new("ScreenGui")
    MainGui.Name = "ZervxOceanMainHub"
    MainGui.Parent = CoreGui
    MainGui.ResetOnSpawn = false
    MainGui.Enabled = false
    
    local BaseFrame = Instance.new("Frame")
    BaseFrame.Name = "BaseFrame"
    BaseFrame.Parent = MainGui
    BaseFrame.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
    BaseFrame.Position = UDim2.new(0.5, -100, 0.4, -135)
    BaseFrame.Size = UDim2.new(0, 200, 0, 275)
    BaseFrame.Active = true
    BaseFrame.BorderSizePixel = 0
    
    local FrameCorner = Instance.new("UICorner")
    FrameCorner.CornerRadius = UDim.new(0, 14)
    FrameCorner.Parent = BaseFrame
    
    local FrameStroke = Instance.new("UIStroke")
    FrameStroke.Thickness = 2
    FrameStroke.Color = Color3.fromRGB(0, 210, 255)
    FrameStroke.Parent = BaseFrame
    
    local FrameGradient = Instance.new("UIGradient")
    FrameGradient.Color = ColorSequence.new{
        ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 220, 255)),
        ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 80, 200))
    }
    FrameGradient.Parent = FrameStroke
    
    local Title = Instance.new("TextLabel")
    Title.Name = "Title"
    Title.Parent = BaseFrame
    Title.BackgroundTransparency = 1
    Title.Size = UDim2.new(1, 0, 0, 35)
