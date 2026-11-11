-- [[ ZERVXHUB - AUTOMATED OCEAN PREMIUM SUITE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- Multi-Layer Workspace Engine Destroyer Safeguard
local uiElements = {"ZervxOceanMainHub", "ZervxFloatingIconGui"}
for _, uiName in pairs(uiElements) do
    if CoreGui:FindFirstChild(uiName) then CoreGui[uiName]:Destroy() end
end

-- Global Operational Automation Configurations
getgenv().ZervxHub = {
    AutoFarm = false,
    SafeMode = true,
    HitboxSize = 12.0,
    AutoRefill = true,
    InstantKill = true
}

-- Target Scanning Engine Geometry Parser
local function GetClosestTitan()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    
    local Titans = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies") or workspace:FindFirstChild("TitanFolder")
    if not Titans then return nil end
    
    local closest = nil
    local shortestDistance = math.huge
    
    for _, titan in pairs(Titans:GetChildren()) do
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

-- Thread Core 1: 1-Strike Instant Kill & Teleport Engine Loop
task.spawn(function()
    while true do
        task.wait(0.05) -- High speed response refresh rate
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then return end
                
                local titan = GetClosestTitan()
                if titan then
                    local hrp = char.HumanoidRootPart
                    local nape = titan:FindFirstChild("Nape") or titan:FindFirstChild("Neck")
                    local humanoid = titan:FindFirstChildOfClass("Humanoid")
                    
                    if nape and humanoid and humanoid.Health > 0 then
                        -- Position offset mechanics
                        local randomX = getgenv().ZervxHub.SafeMode and (math.random(-8, 8) / 10) or 0
                        local randomY = getgenv().ZervxHub.SafeMode and (math.random(-4, 10) / 10) or 0
                        local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 2.5)
                        
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        
                        -- Instant 1-Strike Kill Implementation
                        if getgenv().ZervxHub.InstantKill then
                            humanoid.Health = 0
                        end
                        
                        -- Seamless Teleport Position Snap
                        hrp.CFrame = targetCFrame
                        
                        -- Hitbox Matrix Deployment
                        if nape:IsA("Part") then
                            nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                            nape.CanCollide = false
                        end
                        
                        -- Auto Tool Slasher Activation
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

-- Thread Core 2: Continuous Resource Auto-Refill Loop
task.spawn(function()
    while true do
        task.wait(0.2)
        if getgenv().ZervxHub.AutoRefill then
            pcall(function()
                local char = LocalPlayer.Character
                if char then
                    local vars = char:FindFirstChild("Variables") or char:FindFirstChild("Stats") or LocalPlayer:FindFirstChild("Stats")
                    if vars then
                        for _, statName in pairs({"Gas", "Blades", "FullRefill"}) do
                            local stat = vars:FindFirstChild(statName)
                            if stat and stat:IsA("ValueBase") then stat.Value = 100 end
                        end
                    end
                end
            end)
        end
    end
end)

-- Core UI Constructor System
local function BuildZervxOceanInterface()
    -- Main Dashboard Display Configuration
    local MainGui = Instance.new("ScreenGui")
    MainGui.Name = "ZervxOceanMainHub"
    MainGui.Parent = CoreGui
    MainGui.ResetOnSpawn = false
    MainGui.Enabled = false -- Hidden by default until icon interaction triggers visibility
    
    local BaseFrame = Instance.new("Frame")
    BaseFrame.Name = "BaseFrame"
    BaseFrame.Parent = MainGui
    BaseFrame.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
    BaseFrame.Position = UDim2.new(0.5, -100, 0.4, -130)
    BaseFrame.Size = UDim2.new(0, 200, 0, 265)
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
    Title.Size = UDim2.new(1, 0, 0, 40)
    Title.Font = Enum.Font.GothamBold
    Title.Text = "🌊 ZERVXHUB ENGINE"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 12
    
    local Divider = Instance.new("Frame")
    Divider.Name = "Divider"
    Divider.Parent = BaseFrame
    Divider.BackgroundColor3 = Color3.fromRGB(0, 90, 220)
    Divider.BorderSizePixel = 0
    Divider.Position = UDim2.new(0.08, 0, 0, 40)
    Divider.Size = UDim2.new(0.84, 0, 0, 1)

    -- Mobile Draggable Layer Wrapper Logic
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

    local function AddToggle(text, order, propertyName)
        local Button = Instance.new("TextButton")
        Button.Name = text .. "Toggle"
        Button.Parent = BaseFrame
        Button.BackgroundColor3 = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
        Button.Position = UDim2.new(0.08, 0, 0, 50 + (order * 44))
        Button.Size = UDim2.new(0.84, 0, 0, 36)
        Button.Font = Enum.Font.GothamBold
        Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
        Button.TextColor3 = Color3.fromRGB(255, 255, 255)
        Button.TextSize = 9
        Button.ZIndex = 12
        
        local ButtonCorner = Instance.new("UICorner")
        ButtonCorner.CornerRadius = UDim.new(0, 8)
        ButtonCorner.Parent = Button
        
        local ButtonStroke = Instance.new("UIStroke")
        ButtonStroke.Thickness = 1
        ButtonStroke.Color = Color3.fromRGB(12, 32, 52)
        ButtonStroke.Parent = Button

        Button.MouseButton1Click:Connect(function()
            getgenv().ZervxHub[propertyName] = not getgenv().ZervxHub[propertyName]
            Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
            local targetColor = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 140, 210) or Color3.fromRGB(4, 8, 14)
            TweenService:Create(Button, TweenInfo.new(0.2, Enum.EasingStyle.Quad), {BackgroundColor3 = targetColor}):Play()
        end)
    end

    AddToggle("AUTOMATED FARM", 0, "AutoFarm")
    AddToggle("ANTI-CHEAT BYPASS", 1, "SafeMode")
    AddToggle("AUTO REFILL UTILITY", 2, "AutoRefill")
    AddToggle("INSTANT 1-STRIKE KILL", 3, "InstantKill")

    -- Floating Icon View Setup
    local IconGui = Instance.new("ScreenGui")
    IconGui.Name = "ZervxFloatingIconGui"
    IconGui.Parent = CoreGui
    IconGui.ResetOnSpawn = false

