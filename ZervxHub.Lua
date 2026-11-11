-- [[ ZERVXHUB - PURE ULTIMATE MOBILE FARM ENGINE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- Global Engine Configuration Parameters
getgenv().ZervxHub = {
    AutoFarm = false,       
    SafeMode = true,       
    HitboxSize = 8.5,      
    InfiniteGas = true,
    InstantKill = true
}

-- Target Parsing System (Nape Lock Mechanics)
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

-- Core Optimization Initialization
local function InitializeZervxEngine()
    if CoreGui:FindFirstChild("ZervxMainHub") then
        CoreGui:FindFirstChild("ZervxMainHub"):Destroy()
    end

    -- Active Multi-Threaded Automation Farming Loop
    task.spawn(function()
        while true do
            task.wait(0.1)
            if getgenv().ZervxHub.AutoFarm then
                pcall(function()
                    local char = LocalPlayer.Character
                    if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                        return
                    end
                    
                    local titan = GetClosestTitan()
                    if titan then
                        local hrp = char.HumanoidRootPart
                        local nape = titan:FindFirstChild("Nape") or titan:FindFirstChild("Neck")
                        local humanoid = titan:FindFirstChildOfClass("Humanoid")
                        
                        if nape and humanoid and humanoid.Health > 0 then
                            local randomX = getgenv().ZervxHub.SafeMode and (math.random(-10, 10) / 10) or 0
                            local randomY = getgenv().ZervxHub.SafeMode and (math.random(-5, 12) / 10) or 0
                            local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 2.8)
                            
                            local distance = (hrp.Position - targetCFrame.Position).Magnitude
                            local speed = getgenv().ZervxHub.SafeMode and math.random(120, 145) or 220
                            local duration = distance / speed
                            
                            hrp.Velocity = Vector3.new(0, 0, 0)
                            
                            local farmTween = TweenService:Create(hrp, TweenInfo.new(duration, Enum.EasingStyle.QuadOut), {CFrame = targetCFrame})
                            farmTween:Play()
                            farmTween.Completed:Wait()
                            
                            if getgenv().ZervxHub.InstantKill and humanoid.Health > 0 then
                                humanoid.Health = 0
                            end
                            
                            if nape:IsA("Part") and humanoid.Health > 0 then
                                nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                                nape.CanCollide = false
                            end
                            
                            local tool = char:FindFirstChildOfClass("Tool") or LocalPlayer.Backpack:FindFirstChildOfClass("Tool")
                            if tool then
                                if tool.Parent ~= char then tool.Parent = char end
                                tool:Activate()
                            end
                            
                            task.wait(getgenv().ZervxHub.SafeMode and (math.random(1, 3) / 10) or 0.05)
                        end
                    end
                end)
            end
        end
    end)

    -- Resource Allocation Daemon Loop (Infinite Gas & Utilites)
    task.spawn(function()
        while true do
            task.wait(0.4)
            if getgenv().ZervxHub.InfiniteGas then
                pcall(function()
                    local char = LocalPlayer.Character
                    if char then
                        local vars = char:FindFirstChild("Variables") or char:FindFirstChild("Stats") or LocalPlayer:FindFirstChild("Stats")
                        if vars then
                            local gas = vars:FindFirstChild("Gas") or vars:FindFirstChild("Blades")
                            if gas and gas:IsA("ValueBase") then gas.Value = 100 end
                        end
                    end
                end)
            end
        end
    end)

    -- ========================================== --
    --     PREMIUM OCEAN CONTROL PANEL UI LAYOUT   --
    -- ========================================== --
    local MainGui = Instance.new("ScreenGui")
    MainGui.Name = "ZervxMainHub"
    MainGui.Parent = CoreGui
    MainGui.ResetOnSpawn = false
    MainGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

    local BaseFrame = Instance.new("Frame")
    BaseFrame.Name = "BaseFrame"
    BaseFrame.Parent = MainGui
    BaseFrame.BackgroundColor3 = Color3.fromRGB(8, 14, 24) -- Re-Themed to Match Ocean Blue Key Window
    BaseFrame.Position = UDim2.new(0.05, 0, 0.25, 0)
    BaseFrame.Size = UDim2.new(0, 190, 0, 240)
    BaseFrame.Active = true
    BaseFrame.BorderSizePixel = 0

    local FrameCorner = Instance.new("UICorner")
    FrameCorner.CornerRadius = UDim.new(0, 10)
    FrameCorner.Parent = BaseFrame

    local FrameStroke = Instance.new("UIStroke")
    FrameStroke.Thickness = 1.5
    FrameStroke.Color = Color3.fromRGB(0, 210, 255) -- Aqua Blue Outline Accent
    FrameStroke.Parent = BaseFrame

    local Title = Instance.new("TextLabel")
    Title.Name = "Title"
    Title.Parent = BaseFrame
    Title.BackgroundTransparency = 1
    Title.Size = UDim2.new(1, 0, 0, 35)
    Title.Font = Enum.Font.GothamBold
    Title.Text = "🌊 ZERVXHUB ENGINE"
    Title.TextColor3 = Color3.fromRGB(255, 255, 255)
    Title.TextSize = 11

    local Divider = Instance.new("Frame")
    Divider.Name = "Divider"
    Divider.Parent = BaseFrame
    Divider.BackgroundColor3 = Color3.fromRGB(0, 90, 220)
    Divider.BorderSizePixel = 0
    Divider.Position = UDim2.new(0.05, 0, 0, 35)
    Divider.Size = UDim2.new(0.9, 0, 0, 1)

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
        Button.BackgroundColor3 = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 150, 220) or Color3.fromRGB(5, 9, 16)
        Button.Position = UDim2.new(0.08, 0, 0, 45 + (order * 46))
        Button.Size = UDim2.new(0.84, 0, 0, 36)
        Button.Font = Enum.Font.GothamBold
        Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
        Button.TextColor3 = Color3.fromRGB(255, 255, 255)
        Button.TextSize = 10
        Button.ZIndex = 12
        
        local ButtonCorner = Instance.new("UICorner")
        ButtonCorner.CornerRadius = UDim.new(0, 6)
        ButtonCorner.Parent = Button
        
        local ButtonStroke = Instance.new("UIStroke")
        ButtonStroke.Thickness = 1
        ButtonStroke.Color = Color3.fromRGB(15, 35, 55)
        ButtonStroke.Parent = Button

        Button.MouseButton1Click:Connect(function()
            getgenv().ZervxHub[propertyName] = not getgenv().ZervxHub[propertyName]
            Button.Text = text .. (getgenv().ZervxHub[propertyName] and " : ON" or " : OFF")
            local targetColor = getgenv().ZervxHub[propertyName] and Color3.fromRGB(0, 150, 220) or Color3.fromRGB(5, 9, 16)
            TweenService:Create(Button, TweenInfo.new(0.2, Enum.EasingStyle.Quad), {BackgroundColor3 = targetColor}):Play()
        end)
    end

    AddToggle("AUTOMATED FARM", 0, "AutoFarm")
    AddToggle("ANTI-CHEAT MODE", 1, "SafeMode")
