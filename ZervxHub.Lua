-- [[ ZERVXHUB - STABLE MAIN CONSOLE & SPIN AUTO-ROLL ENGINE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CoreGui = game:GetService("CoreGui") or LocalPlayer:WaitForChild("PlayerGui")

-- Clear old instances to avoid GUI clashing on Delta Mobile
if CoreGui:FindFirstChild("ZervxManagementHub") then
    CoreGui:FindFirstChild("ZervxManagementHub"):Destroy()
end

-- Global Custom Tracking Parameters
getgenv().ZervxRollSettings = {
    TargetFritz = true,
    TargetHelos = true,
    IsRolling = false
}

-- Isolated Safe Remote Caller for Family Rerolls
local function AttemptFamilySpinnings()
    -- Updated to point directly to the current AOTR remote network architecture
    local remoteEvent = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("Server"):WaitForChild("Family") or 
                        ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("ServerEvent") or
                        ReplicatedStorage:WaitForChild("Assets"):WaitForChild("Remotes"):WaitForChild("GET")

    task.spawn(function()
        while getgenv().ZervxRollSettings.IsRolling do
            local success, rolledFamily = pcall(function()
                if remoteEvent:IsA("RemoteFunction") then
                    return remoteEvent:InvokeServer("Roll")
                elseif remoteEvent:IsA("RemoteEvent") then
                    remoteEvent:FireServer("Roll")
                    -- Listening directly to local data changes if using RemoteEvents
                    task.wait(0.2)
                    local data = LocalPlayer:FindFirstChild("Data") or LocalPlayer:FindFirstChild("Stats")
                    local currentFam = data and (data:FindFirstChild("Family") or data:FindFirstChild("CurrentFamily"))
                    return currentFam and currentFam.Value or nil
                end
            end)
            
            -- Fallback secondary method tracking the exact layout shown in the UI screen
            if not success or not rolledFamily then
                pcall(function()
                    local altRemote = ReplicatedStorage:WaitForChild("Remotes"):WaitForChild("Customization")
                    altRemote:FireServer("RollFamily")
                end)
            end

            -- Live scanner reading what family is currently equipped on your slot
            local playerMetadata = LocalPlayer:FindFirstChild("Data") or LocalPlayer:FindFirstChild("Stats")
            local activeFamily = playerMetadata and (playerMetadata:FindFirstChild("Family") or playerMetadata:FindFirstChild("CurrentFamily"))
            
            if activeFamily then
                local currentFamilyName = tostring(activeFamily.Value)
                if (getgenv().ZervxRollSettings.TargetFritz and currentFamilyName == "Fritz") or 
                   (getgenv().ZervxRollSettings.TargetHelos and currentFamilyName == "Helos") then
                    getgenv().ZervxRollSettings.IsRolling = false
                    break
                end
            end
            
            task.wait(0.4) -- Prevents mobile disconnection from rapid server requests
        end
    end)
end

-- Clean Ocean Management UI Board Layout
local MainGui = Instance.new("ScreenGui")
MainGui.Name = "ZervxManagementHub"
MainGui.Parent = CoreGui
MainGui.ResetOnSpawn = false

local BaseFrame = Instance.new("Frame")
BaseFrame.Name = "BaseFrame"
BaseFrame.Parent = MainGui
BaseFrame.BackgroundColor3 = Color3.fromRGB(6, 12, 22)
BaseFrame.Position = UDim2.new(0.5, -100, 0.4, -70)
BaseFrame.Size = UDim2.new(0, 200, 0, 140)
BaseFrame.Active = true
BaseFrame.BorderSizePixel = 0

local FrameCorner = Instance.new("UICorner")
FrameCorner.CornerRadius = UDim.new(0, 12)
FrameCorner.Parent = BaseFrame

local FrameStroke = Instance.new("UIStroke")
FrameStroke.Thickness = 2
FrameStroke.Color = Color3.fromRGB(0, 210, 255)
FrameStroke.Parent = BaseFrame

local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Parent = BaseFrame
Title.BackgroundTransparency = 1
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Font = Enum.Font.GothamBold
Title.Text = "🌊 ZERVXHUB | SPIN MANAGER"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.TextSize = 11

-- Smooth Dragging System Configuration for Mobile Layouts
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

-- Interactive Control Spin Toggle Button
local RollButton = Instance.new("TextButton")
RollButton.Name = "RollButton"
RollButton.Parent = BaseFrame
RollButton.BackgroundColor3 = Color3.fromRGB(4, 8, 14)
RollButton.Position = UDim2.new(0.08, 0, 0.45, 0)
RollButton.Size = UDim2.new(0.84, 0, 0, 44)
RollButton.Font = Enum.Font.GothamBold
RollButton.Text = "AUTO-ROLL MYTHICS: OFF"
RollButton.TextColor3 = Color3.fromRGB(255, 255, 255)
RollButton.TextSize = 10

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 8)
ButtonCorner.Parent = RollButton

local ButtonStroke = Instance.new("UIStroke")
ButtonStroke.Thickness = 1
ButtonStroke.Color = Color3.fromRGB(15, 35, 55)
ButtonStroke.Parent = RollButton

RollButton.MouseButton1Click:Connect(function()
    getgenv().ZervxRollSettings.IsRolling = not getgenv().ZervxRollSettings.IsRolling
    
    if getgenv().ZervxRollSettings.IsRolling then
        RollButton.Text = "⚡ ROLLING FOR MYTHICS..."
        TweenService:Create(RollButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(0, 140, 210)}):Play()
        AttemptFamilySpinnings()
    else
        RollButton.Text = "AUTO-ROLL MYTHICS: OFF"
        TweenService:Create(RollButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(4, 8, 14)}):Play()
    end
end)

print("[+] ZervxHub Spin Optimization Panel Ready.")
