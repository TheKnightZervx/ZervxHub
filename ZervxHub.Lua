-- [[ ZERVXHUB - PART 1: CORE CONFIGURATION ]] --
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
    HitboxSize = 25.0, -- Increased for perfect strike recognition
    AutoRefill = true,
    InstantKill = true,
    
    -- Lobby Customization Features
    IsRolling = false,
    RollEpic = false,       
    RollLegendary = false,  
    RollMythic = false      
}

-- Anti-AFK Bypasser
pcall(function()
    local VirtualUser = game:GetService("VirtualUser")
    LocalPlayer.Idled:Connect(function()
        VirtualUser:CaptureController()
        VirtualUser:ClickButton2(Vector2.new(0, 0))
    end)
end)
-- [[ ZERVXHUB - PART 2: AUTOMATION ENGINES ]] --
-- Deep Workspace Scanner to Locate Titan Weakpoints
local function GetClosestTitanTarget()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    local closest, shortestDistance = nil, math.huge
    
    for _, obj in pairs(workspace:GetDescendants()) do
        if obj:IsA("Model") and (obj.Name == "Titan" or obj:FindFirstChild("Nape") or string.find(string.lower(obj.Name), "titan")) then
            local nape = obj:FindFirstChild("Nape")
            local humanoid = obj:FindFirstChildOfClass("Humanoid")
            
            if nape and humanoid and humanoid.Health > 0 then
                local dist = (char.HumanoidRootPart.Position - nape.Position).Magnitude
                if dist < shortestDistance then
                    shortestDistance = dist
                    closest = obj
                end
            end
        end
    end
    return closest
end

-- Combat Auto-Farm Mechanics
task.spawn(function()
    while true do
        task.wait(0.01)
        if getgenv().ZervxHub.AutoFarm then
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
                        
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        hrp.RotVelocity = Vector3.new(0, 0, 0)
                        hrp.CFrame = targetCFrame
                        
                        if getgenv().ZervxHub.InstantKill then humanoid.Health = 0 end
                        
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

-- Auto Refill System
task.spawn(function()
    while true do
        task.wait(0.2)
        if getgenv().ZervxHub.AutoRefill then
            pcall(function()
                local char = LocalPlayer.Character
                for _, stat in pairs(LocalPlayer:GetDescendants()) do
                    if (stat.Name == "Gas" or stat.Name == "Blades" or stat.Name == "Durability") and stat:IsA("ValueBase") then
                        stat.Value = 100
                    end
                end
                if char then
                    for _, stat in pairs(char:GetDescendants()) do
                        if (stat.Name == "Gas" or stat.Name == "Blades" or stat.Name == "Durability") and stat:IsA("ValueBase") then
                            stat.Value = 100
                        end
                    end
                end
            end)
        end
    end
end)-- [[ ZERVXHUB - PART 3: OCEAN UI & AUTO-ROLLER ]] --
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
    Title.Font = Enum.Font.GothamBold
    Title.Text = "🌊 ZERVXHUB ENGINE v5"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 11
    
    local Divider = Instance.new("Frame")
    Divider.Name = "Divider"
    Divider.Parent = BaseFrame
    Divider.BackgroundColor3 = Color3.fromRGB(0, 90, 220)
    Divider.BorderSizePixel = 0
    Divider.Position = UDim2.new(0.08, 0, 0, 35)
    Divider.Size = UDim2.new(0.84, 0, 0, 1)

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
        local Button = Instance.new("TextButton")
        Button.Name = text .. "Toggle"
        Button.Parent = BaseFrame
        Button.BackgroundColor3 = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
        Button.Position = UDim2.new(0.08, 0, 0, 42 + (order * 32))
        Button.Size = UDim2.new(0.84, 0, 0, 26)
        Button.Font = Enum.Font.GothamBold
        
        if isRarity then
            Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : SKIP IT" or " : KEEP IT")
        else
            Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
        end
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
            getgenv().ZervxHub[propertyName] = not getgenv().ZervxHub[propertyName]
            if isRarity then
                Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : SKIP IT" or " : KEEP IT")
            else
                Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
            end
            local targetColor = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
            TweenService:Create(Button, TweenInfo.new(0.15), {BackgroundColor3 = targetColor}):Play()
        end)
    end

    AddToggle("AUTOMATED FARM", 0, "AutoFarm", false)
    AddToggle("AUTO REFILL GAUGES", 1, "AutoRefill", false)
    AddToggle("1-STRIKE INSTANT KILL", 2, "InstantKill", false)
    AddToggle("SKIP ROLLED EPICS", 3, "RollEpic", true)
    AddToggle("SKIP LEGENDARIES", 4, "RollLegendary", true)

    local MasterButton = Instance.new("TextButton")
    MasterButton.Name = "MasterButton"
    MasterButton.Parent = BaseFrame
    MasterButton.BackgroundColor3 = Color3.fromRGB(15, 35, 15)
    MasterButton.Position = UDim2.new(0.08, 0, 0, 215)
    MasterButton.Size = UDim2.new(0.84, 0, 0, 44)
    MasterButton.Font = Enum.Font.GothamBold
    MasterButton.Text = "▶️ START AUTO-SPIN"
    MasterButton.TextColor3 = Color3.fromRGB(255, 255, 255)
    MasterButton.TextSize = 10

    local MasterCorner = Instance.new("UICorner")
    MasterCorner.CornerRadius = UDim.new(0, 8)
    MasterCorner.Parent = MasterButton

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
    
    local IconButton = Instance.new("TextButton")
    IconButton.Name = "IconButton"
    IconButton.Parent = IconGui
    IconButton.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
    IconButton.Position = UDim2.new(0.02, 0, 0.15, 0)
    IconButton.Size = UDim2.new(0, 44, 0, 44)
    IconButton.Font = Enum.Font.GothamBold
    IconButton.Text = "🌊"
    IconButton.TextSize = 18
    IconButton.ZIndex = 20

    local IconCorner = Instance.new("UICorner")
    IconCorner.CornerRadius = UDim.new(1, 0)
    IconCorner.Parent = IconButton

    local IconStroke = Instance.new("UIStroke")
    IconStroke.Thickness = 2
    IconStroke.Color = Color3.fromRGB(0, 210, 255)
    IconStroke.Parent = IconButton

    local iconDragging, iconDragStart, iconStartPos
    IconButton.InputBegan:Connect(function(input)
        if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
            iconDragging = true
            iconDragStart = input.Position
            iconStartPos = IconButton.Position
            input.Changed:Connect(function()
if input.UserInputState == Enum.UserInputState.End then iconDragging = false end
end)
end
end)    -- Dragging Logic for the Floating Icon (FIXED CLOSING SYNTAX)
    local iconDragging, iconDragStart, iconStartPos
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
        if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then
            if iconDragging then
                local delta = input.Position - iconDragStart
                IconButton.Position = UDim2.new(iconStartPos.X.Scale, iconStartPos.X.Offset + delta.X, iconStartPos.Y.Scale, iconStartPos.Y.Offset + delta.Y)
            end
        end
    end)
    
    IconButton.MouseButton1Click:Connect(function()
        MainGui.Enabled = not MainGui.Enabled
    end)
end

task.spawn(BuildZervxInterface)

