-- [[ ZERVXHUB - BACKGROUND WAIT MAIN AUTOMATION SUITE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- Shared Optimization Vectors Parameters Configuration
getgenv().ZervxHub = {
    AutoFarm = false,
    SafeMode = true,
    HitboxSize = 14.0,
    AutoRefill = true,
    InstantKill = true
}

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

-- Ultimate 1-Strike Instant Velocity Farm Core Thread Loop
task.spawn(function()
    while true do
        task.wait(0.02)
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
                        local randomX = getgenv().ZervxHub.SafeMode and (math.random(-6, 6) / 10) or 0
                        local randomY = getgenv().ZervxHub.SafeMode and (math.random(-3, 8) / 10) or 0
                        local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 2.2)
                        
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        
                        if getgenv().ZervxHub.InstantKill then
                            humanoid.Health = 0
                        end
                        
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

-- Continuous Supply Depot / Resource Loop
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

-- Ocean Control Room Layout Builder Panel
local function BuildZervxOceanInterface()
    -- Overlap Canvas Removals
    local uiElements = {"ZervxOceanMainHub", "ZervxFloatingIconGui"}
    for _, uiName in pairs(uiElements) do
        if CoreGui:FindFirstChild(uiName) then pcall(function() CoreGui[uiName]:Destroy() end) end
    end

    local MainGui = Instance.new("ScreenGui")
    MainGui.Name = "ZervxOceanMainHub"
    MainGui.Parent = CoreGui
    MainGui.ResetOnSpawn = false
    MainGui.Enabled = false
    
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

