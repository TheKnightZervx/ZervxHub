-- [[ ZERVXHUB PREMIUM OVERHAUL - PRO-OPTIMIZED EDITION ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local VirtualInputManager = game:GetService("VirtualInputManager")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local CoreGui = game:GetService("CoreGui") or PlayerGui

-- Clean up residual user interfaces to avoid clashing execution states
local systemGUIs = {"ZervxOceanMainHub", "ZervxFloatingIconGui", "ZervxRarityRoller"}
for _, uiName in pairs(systemGUIs) do
    if CoreGui:FindFirstChild(uiName) then 
        pcall(function() CoreGui[uiName]:Destroy() end) 
    end
end

-- Global Operational Configurations Framework
getgenv().ZervxHub = {
    AutoFarm = false,
    SafeMode = true,
    HitboxSize = 25.0, 
    AutoRefill = true,
    InstantKill = true,
    IsRolling = false,
    RollEpic = false,       
    RollLegendary = false,  
    RollMythic = false      
}

-- Optimized Anti-AFK Core Engine
pcall(function()
    local VirtualUser = game:GetService("VirtualUser")
    LocalPlayer.Idled:Connect(function()
        VirtualUser:CaptureController()
        VirtualUser:ClickButton2(Vector2.new(0, 0))
    end)
end)

-- Deep Workspace Scanner to Locate Target Weakpoints
local function GetClosestTitanTarget()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    
    local closest, shortestDistance = nil, math.huge
    local myPos = char.HumanoidRootPart.Position
    
    for _, obj in pairs(workspace:GetChildren()) do
        if obj:IsA("Model") and (obj.Name == "Titan" or obj:FindFirstChild("Nape") or string.find(string.lower(obj.Name), "titan")) then
            local nape = obj:FindFirstChild("Nape")
            local humanoid = obj:FindFirstChildOfClass("Humanoid")
            
            if nape and humanoid and humanoid.Health > 0 then
                local dist = (myPos - nape.Position).Magnitude
                if dist < shortestDistance then
                    shortestDistance = dist
                    closest = obj
                end
            end
        end
    end
    return closest
end

-- Combat Auto-Farm Engine (RunService Native Throttling)
RunService.Heartbeat:Connect(function()
    if not getgenv().ZervxHub.AutoFarm then return end
    
    pcall(function()
        local char = LocalPlayer.Character
        if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then return end
        
        local titan = GetClosestTitanTarget()
        if titan then
            local hrp = char.HumanoidRootPart
            local nape = titan:FindFirstChild("Nape")
            local humanoid = titan:FindFirstChildOfClass("Humanoid")
            
            if nape and humanoid and humanoid.Health > 0 then
                local randomX = getgenv().ZervxHub.SafeMode and (math.random(-4, 4) / 10) or 0
                local randomY = getgenv().ZervxHub.SafeMode and (math.random(-2, 5) / 10) or 0
                local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 1.8)
                
                hrp.Velocity = Vector3.zero
                hrp.RotVelocity = Vector3.zero
                hrp.CFrame = targetCFrame
                
                if getgenv().ZervxHub.InstantKill then 
                    humanoid.Health = 0 
                end
                
                if nape:IsA("Part") and nape.Size.X ~= getgenv().ZervxHub.HitboxSize then
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
end)

-- Auto Gauge Refill Modulator
task.spawn(function()
    while true do
        task.wait(0.2)
        if getgenv().ZervxHub.AutoRefill then
            pcall(function()
                local char = LocalPlayer.Character
                local targets = {LocalPlayer:GetDescendants()}
                if char then table.insert(targets, char:GetDescendants()) end
                
                for _, folder in pairs(targets) do
                    for _, stat in pairs(folder) do
                        if (stat.Name == "Gas" or stat.Name == "Blades" or stat.Name == "Durability") and stat:IsA("ValueBase") then
                            stat.Value = 100
                        end
                    end
                end
            end)
        end
    end
end)

-- Auto-Roller Infrastructure Context Elements
local function GetCurrentRarity()
    local menu = PlayerGui:FindFirstChild("Customization") or PlayerGui:FindFirstChild("Lobby")
    if menu then
        for _, textLabel in pairs(menu:GetDescendants()) do
            if textLabel:IsA("TextLabel") and string.find(textLabel.Text, "%(") and string.find(textLabel.Text, "%)") then
                local txt = textLabel.Text
                for _, rarity in pairs({"Common", "Rare", "Epic", "Legendary", "Mythic"}) do
                    if string.find(txt, rarity) then return rarity end
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
                -- Delta Executor-compatible structural event bypass configuration
                local pos, size = btn.AbsolutePosition, btn.AbsoluteSize
                local targetX = pos.X + (size.X / 2)
                local targetY = pos.Y + (size.Y / 2) + 50
                VirtualInputManager:SendMouseButtonEvent(targetX, targetY, 0, true, game, 1)
                task.wait(0.05)
                VirtualInputManager:SendMouseButtonEvent(targetX, targetY, 0, false, game, 1)
            end)
            return true
        end
    end
    return false
end

task.spawn(function()
    while true do
        task.wait(0.4)
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
                task.wait(0.35)
            else
                getgenv().ZervxHub.IsRolling = false
            end
        end
    end
end)

-- UI Interface Factory Implementation
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
    
    local FrameCorner = Instance.new("UICorner", BaseFrame)
    FrameCorner.CornerRadius = UDim.new(0, 14)
    
    local FrameStroke = Instance.new("UIStroke", BaseFrame)
    FrameStroke.Thickness = 2
    FrameStroke.Color = Color3.fromRGB(0, 210, 255)
    
    local FrameGradient = Instance.new("UIGradient", FrameStroke)
    FrameGradient.Color = ColorSequence.new{
        ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 220, 255)),
        ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 80, 200))
    }
    
    local Title = Instance.new("TextLabel", BaseFrame)
    Title.Name = "Title"
    Title.BackgroundTransparency = 1
    Title.Size = UDim2.new(1, 0, 0, 35)
    Title.Font = Enum.Font.GothamBold
    Title.Text = "🌊 ZERVXHUB ENGINE v5"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 11
    
    local Divider = Instance.new("Frame", BaseFrame)
    Divider.Name = "Divider"
    Divider.BackgroundColor3 = Color3.fromRGB(0, 90, 220)
    Divider.BorderSizePixel = 0
    Divider.Position = UDim2.new(0.08, 0, 0, 35)
    Divider.Size = UDim2.new(0.84, 0, 0, 1)

    -- Dynamic UI Dragging Architecture (Delta UI Fix)
    local dragging, dragInput, dragStart, startPos
    BaseFrame.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            dragging = true
            dragStart = input.Position
            startPos = BaseFrame.Position
            input.Changed:Connect(function()
                if input.UserInputState == Enum.UserInputState.End then dragging = false end
            end)
        end
    end)
    BaseFrame.InputChanged:Connect(function(input)
if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then dragInput = input end
end)
UserInputService.InputChanged:Connect(function(input)
if input == dragInput and dragging then
local delta = input.Position - dragStart
BaseFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
end
end)
local function AddToggle(text, order, propertyName, isRarity)
local Button = Instance.new("TextButton", BaseFrame)
Button.Name = text .. "Toggle"
Button.BackgroundColor3 = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
Button.Position = UDim2.new(0.08, 0, 0, 42 + (order * 32))
Button.Size = UDim2.new(0.84, 0, 0, 26)
Button.Font = Enum.Font.GothamBold
Button.Text = text .. (getgenv().ZervxHub[propertyName] and (isRarity and " : SKIP IT" or " : ON") or (isRarity and " : KEEP IT" or " : OFF"))
Button.TextColor3 = Color3.fromRGB(255, 255, 255)
Button.TextSize = 8
Instance.new("UICorner", Button).CornerRadius = UDim.new(0, 6)
local ButtonStroke = Instance.new("UIStroke", Button)
ButtonStroke.Thickness = 1
ButtonStroke.Color = Color3.fromRGB(15, 35, 55)
Button.MouseButton1Click:Connect(function()
getgenv().ZervxHub[propertyName] = not getgenv().ZervxHub[propertyName]
Button.Text = text .. (getgenv().ZervxHub[propertyName] and (isRarity and " : SKIP IT" or " : ON") or (isRarity and " : KEEP IT" or " : OFF"))
local targetColor = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
TweenService:Create(Button, TweenInfo.new(0.15), {BackgroundColor3 = targetColor}):Play()
end)
end
AddToggle("AUTOMATED FARM", 0, "AutoFarm", false)
AddToggle("AUTO REFILL GAUGES", 1, "AutoRefill", false)
AddToggle("1-STRIKE INSTANT KILL", 2, "InstantKill", false)
AddToggle("SKIP ROLLED EPICS", 3, "RollEpic", true)
AddToggle("SKIP LEGENDARIES", 4, "RollLegendary", true)
local MasterButton = Instance.new("TextButton", BaseFrame)
MasterButton.Name = "MasterButton"
MasterButton.BackgroundColor3 = Color3.fromRGB(15, 35, 15)
MasterButton.Position = UDim2.new(0.08, 0, 0, 215)
MasterButton.Size = UDim2.new(0.84, 0, 0, 44)
MasterButton.Font = Enum.Font.GothamBold
MasterButton.Text = "▶️ START AUTO-SPIN"
MasterButton.TextColor3 = Color3.fromRGB(255, 255, 255)
MasterButton.TextSize = 10
Instance.new("UICorner", MasterButton).CornerRadius = UDim.new(0, 8)
MasterButton.MouseButton1Click:Connect(function()
getgenv().ZervxHub.IsRolling = not getgenv().ZervxHub.IsRolling
if getgenv().ZervxHub.IsRolling then
MasterButton.Text = "🛑 STOP AUTOMATION"
MasterButton.BackgroundColor3 = Color3.fromRGB(120, 25, 25)
else
MasterButton.Text = "▶️ START AUTO-SPIN"
MasterButton.BackgroundColor3 = Color3.fromRGB(15, 35, 15)
end
end)
local IconGui = Instance.new("ScreenGui")
IconGui.Name = "ZervxFloatingIconGui"
IconGui.Parent = CoreGui
IconGui.ResetOnSpawn = false
local IconButton = Instance.new("TextButton", IconGui)
IconButton.Name = "IconButton"
IconButton.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
IconButton.Position = UDim2.new(0.02, 0, 0.15, 0)
IconButton.Size = UDim2.new(0, 44, 0, 44)
IconButton.Font = Enum.Font.GothamBold
IconButton.Text = "🌊"
IconButton.TextSize = 18
IconButton.ZIndex = 20
Instance.new("UICorner", IconButton).CornerRadius = UDim.new(1, 0)
local IconStroke = Instance.new("UIStroke", IconButton)
IconStroke.Thickness = 2
IconStroke.Color = Color3.fromRGB(0, 210, 255)
local iconDragging, iconDragInput, iconDragStart, iconStartPos
IconButton.InputBegan:Connect(function(input)
if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
iconDragging = true
iconDragStart = input.Position
iconStartPos = IconButton.Position
input.Changed:Connect(function()
if input.UserInputState == Enum.UserInputState.End then iconDragging = false end
end)
end
end)
IconButton.InputChanged:Connect(function(input)
if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then iconDragInput = input end
end)
UserInputService.InputChanged:Connect(function(input)
if input == iconDragInput and iconDragging then
local delta = input.Position - iconDragStart
IconButton.Position = UDim2.new(iconStartPos.X.Scale, iconStartPos.X.Offset + delta.X, iconStartPos.Y.Scale, iconStartPos.Y.Offset + delta.Y)
end
end)
IconButton.MouseButton1Click:Connect(function()
MainGui.Enabled = not MainGui.Enabled
end)
end
task.spawn(BuildZervxInterface)
