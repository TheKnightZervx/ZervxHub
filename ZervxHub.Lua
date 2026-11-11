-- [[ ZERVXHUB - AUTOMATED SELECTION ROLLER & ANTI-AFK INTERFACE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui") or PlayerGui

-- Clear any old management interfaces to prevent memory leaks
if CoreGui:FindFirstChild("ZervxRarityRoller") then
    CoreGui:FindFirstChild("ZervxRarityRoller"):Destroy()
end

-- Rarity Automation Configuration Setup
getgenv().ZervxRollerConfig = {
    IsRolling = false,
    RollEpic = false,       -- If true, it keeps rolling when it hits an Epic
    RollLegendary = false,  -- If true, it keeps rolling when it hits a Legendary
    RollMythic = false      -- If true, it keeps rolling when it hits a Mythic (Keep false to save Fritz/Helos)
}

-- 🛡️ ANTI-AFK INJECTION BLOCK: Bypasses the 20-minute disconnection timer
pcall(function()
    local VirtualUser = game:GetService("VirtualUser")
    LocalPlayer.Idled:Connect(function()
        VirtualUser:CaptureController()
        VirtualUser:ClickButton2(Vector2.new(0, 0))
        print("[+] ZervxHub Anti-AFK Triggered to maintain connection.")
    end)
end)

-- Parses current text strings to identify the rarity classification of your slot
local function GetCurrentRarity()
    local customMenu = PlayerGui:FindFirstChild("Customization") or PlayerGui:FindFirstChild("Lobby")
    if customMenu then
        -- Searches recursively down text elements matching the right-hand layout shown in your screenshot
        for _, textLabel in pairs(customMenu:GetDescendants()) do
            if textLabel:IsA("TextLabel") and string.find(textLabel.Text, "%(") and string.find(textLabel.Text, "%)") then
                local text = textLabel.Text
                if string.find(text, "Common") then return "Common"
                elseif string.find(text, "Rare") then return "Rare"
                elseif string.find(text, "Epic") then return "Epic"
                elseif string.find(text, "Legendary") then return "Legendary"
                elseif string.find(text, "Mythic") then return "Mythic"
                end
            end
        end
    end
    return "Unknown"
end

-- Core Interaction Automated Loop Handler
local function TriggerPhysicalRollClick()
    local customMenu = PlayerGui:FindFirstChild("Customization") or PlayerGui:FindFirstChild("Lobby")
    if not customMenu then return false end
    
    -- Scans for the Roll text button element visible in the bottom right corner
    for _, element in pairs(customMenu:GetDescendants()) do
        if element:IsA("TextButton") and (string.find(string.lower(element.Name), "roll") or string.find(string.lower(element.Text), "roll")) then
            pcall(function()
                -- Simulates a physical user touch connection activation input
                local pos = element.AbsolutePosition
                local size = element.AbsoluteSize
                game:GetService("VirtualInputManager"):SendMouseButtonEvent(pos.X + (size.X / 2), pos.Y + (size.Y / 2) + 50, 0, true, game, 1)
                task.wait(0.05)
                game:GetService("VirtualInputManager"):SendMouseButtonEvent(pos.X + (size.X / 2), pos.Y + (size.Y / 2) + 50, 0, false, game, 1)
            end)
            return true
        end
    end
    return false
end

-- Main Automated Process Daemon Thread
task.spawn(function()
    while true do
        task.wait(0.5) -- Mobile safe refresh step
        if getgenv().ZervxRollerConfig.IsRolling then
            local currentRarity = GetCurrentRarity()
            print("[*] ZervxHub current family bracket detected: " .. currentRarity)
            
            local shouldRoll = false
            
            if currentRarity == "Common" or currentRarity == "Rare" or currentRarity == "Unknown" then
                shouldRoll = true
            elseif currentRarity == "Epic" and getgenv().ZervxRollerConfig.RollEpic then
                shouldRoll = true
            elseif currentRarity == "Legendary" and getgenv().ZervxRollerConfig.RollLegendary then
                shouldRoll = true
            elseif currentRarity == "Mythic" and getgenv().ZervxRollerConfig.RollMythic then
                shouldRoll = true
            end
            
            if shouldRoll then
                local clicked = TriggerPhysicalRollClick()
                if not clicked then
                    warn("[-] Roll button frame could not be isolated visually on screen.")
                end
                task.wait(0.4) -- Interface reaction processing buffer delay
            else
                -- Target matched config restrictions; stop the loop immediately
                print("[!] Stopping automation: Stored family falls inside non-roll parameters.")
                getgenv().ZervxRollerConfig.IsRolling = false
            end
        end
    end
end)

-- ============================================================== --
-- 🌊 ADVANCED OCEAN CONFIGURATION DASHBOARD PANEL UI BUILDER
-- ============================================================== --
local MainGui = Instance.new("ScreenGui")
MainGui.Name = "ZervxRarityRoller"
MainGui.Parent = CoreGui
MainGui.ResetOnSpawn = false

local BaseFrame = Instance.new("Frame")
BaseFrame.Name = "BaseFrame"
BaseFrame.Parent = MainGui
BaseFrame.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
BaseFrame.Position = UDim2.new(0.4, 0, 0.25, 0)
BaseFrame.Size = UDim2.new(0, 185, 0, 215)
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
Title.Font = Enum.Font.GothamBold
Title.Text = "🌊 ZERVXHUB SPIN CONTROL"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.TextSize = 10

-- Responsive Dragging Handler System Integration
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

local function AddSelectionToggle(text, order, propertyName)
    local Button = Instance.new("TextButton")
    Button.Name = text .. "Toggle"
    Button.Parent = BaseFrame
    Button.BackgroundColor3 = getgenv().ZervxRollerConfig[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
    Button.Position = UDim2.new(0.08, 0, 0, 42 + (order * 34))
    Button.Size = UDim2.new(0.84, 0, 0, 28)
    Button.Font = Enum.Font.GothamBold
    Button.Text = text .. (getgenv().ZervxRollerConfig[propertyName] and " : ROLL IT" or " : KEEP IT")
    Button.TextColor3 = Color3.fromRGB(255, 255, 255)
    Button.TextSize = 8
    
    local ButtonCorner = Instance.new("UICorner")
    ButtonCorner.CornerRadius = UDim.new(0, 6)
    ButtonCorner.Parent = Button
    
    local ButtonStroke = Instance.new("UIStroke")
    ButtonStroke.Thickness = 1
    ButtonStroke.Color = Color3.fromRGB(15, 35, 55)
    ButtonStroke.Parent = Button

    Button.MouseButton1Click:Connect(function()
        getgenv().ZervxRollerConfig[propertyName] = not getgenv().ZervxRollerConfig[propertyName]
        Button.Text = text .. (getgenv().ZervxRollerConfig[propertyName] and " : ROLL IT" or " : KEEP IT")
        local targetColor = getgenv().ZervxRollerConfig[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
        TweenService:Create(Button, TweenInfo.new(0.15), {BackgroundColor3 = targetColor}):Play()
    end)
end

-- Render Target Rarity Options Stack (Set to "ROLL IT" if you want to skip it, or "KEEP IT" to save it)
AddSelectionToggle("IF EPIC", 0, "RollEpic")
AddSelectionToggle("IF LEGENDARY", 1, "RollLegendary")
AddSelectionToggle("IF MYTHIC", 2, "RollMythic")

-- Master Automation Master Activation Toggle Button
local MasterButton = Instance.new("TextButton")
MasterButton.Name = "MasterButton"
MasterButton.Parent = BaseFrame
MasterButton.BackgroundColor3 = Color3.fromRGB(15, 30, 15)
MasterButton.Position = UDim2.new(0.08, 0, 0, 155)
MasterButton.Size = UDim2.new(0.84, 0, 0, 44)
MasterButton.Font = Enum.Font.GothamBold
MasterButton.Text = "▶️ START AUTO-SPIN"
MasterButton.TextColor3 = Color3.fromRGB(255, 255, 255)
MasterButton.TextSize = 10

local MasterCorner = Instance.new("UICorner")
MasterCorner.CornerRadius = UDim.new(0, 8)
MasterCorner.Parent = MasterButton

local MasterStroke = Instance.new("UIStroke")
MasterStroke.Thickness = 1.2
MasterStroke.Color = Color3.fromRGB(30, 75, 30)
MasterStroke.Parent = MasterButton

