-- [[ ZERVXHUB - PREMIUM SECURE KEY SYSTEM ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")
local TweenService = game:GetService("TweenService")

-- 🔑 Secret Key
local MySecretKey = "KEYAUTH-R1zzYl-P5bPy4-BUPD7t-fyXtpy-V8BwKp-BSL7t4" 

-- Modern ScreenGui Setup
local KeyGui = Instance.new("ScreenGui")
KeyGui.Name = "ZervxHub_KeySystem"
KeyGui.Parent = TargetGuiContainer
KeyGui.ResetOnSpawn = false
KeyGui.DisplayOrder = 999999
KeyGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Main Frame (Fancy & Modern Shape)
local KeyFrame = Instance.new("Frame")
KeyFrame.Name = "KeyFrame"
KeyFrame.Parent = KeyGui
KeyFrame.BackgroundColor3 = Color3.fromRGB(15, 15, 20) -- Sleek Dark Accent
KeyFrame.Position = UDim2.new(0.5, -165, 0.5, -100) -- Perfectly Centered
KeyFrame.Size = UDim2.new(0, 330, 0, 200)
KeyFrame.Active = true
KeyFrame.ZIndex = 10
KeyFrame.BorderSizePixel = 0

-- UI Styling Elements (Rounded Corners & Subtle Strokes)
local FrameCorner = Instance.new("UICorner")
FrameCorner.CornerRadius = UDim.new(0, 12)
FrameCorner.Parent = KeyFrame

local FrameStroke = Instance.new("UIStroke")
FrameStroke.Thickness = 1.5
FrameStroke.Color = Color3.fromRGB(255, 100, 0) -- Neon Orange Border
FrameStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
FrameStroke.Parent = KeyFrame

-- Smooth Mobile/PC Dragging System
local UserInputService = game:GetService("UserInputService")
local dragging, dragInput, dragStart, startPos
KeyFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPos = KeyFrame.Position
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then dragging = false end
        end)
    end
end)
KeyFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then dragInput = input end
end)
UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        local delta = input.Position - dragStart
        KeyFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    end
end)

-- Title Banner
local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Parent = KeyFrame
Title.BackgroundColor3 = Color3.fromRGB(25, 25, 35)
Title.Size = UDim2.new(1, 0, 0, 45)
Title.Font = Enum.Font.GothamBold
Title.Text = "✨ ZERVXHUB | SECURE ACCESS"
Title.TextColor3 = Color3.fromRGB(255, 140, 0)
Title.TextSize = 14
Title.ZIndex = 11

local TitleCorner = Instance.new("UICorner")
TitleCorner.CornerRadius = UDim.new(0, 12)
TitleCorner.Parent = Title

-- Fancy Input Textbox
local TextBox = Instance.new("TextBox")
TextBox.Name = "TextBox"
TextBox.Parent = KeyFrame
TextBox.BackgroundColor3 = Color3.fromRGB(10, 10, 12)
TextBox.Position = UDim2.new(0.06, 0, 0.35, 0)
TextBox.Size = UDim2.new(0.88, 0, 0, 38)
TextBox.Font = Enum.Font.Gotham
TextBox.PlaceholderText = "Enter premium access key..."
TextBox.Text = ""
TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox.TextSize = 13
TextBox.ZIndex = 11

local TextCorner = Instance.new("UICorner")
TextCorner.CornerRadius = UDim.new(0, 8)
TextCorner.Parent = TextBox

local TextStroke = Instance.new("UIStroke")
TextStroke.Thickness = 1
TextStroke.Color = Color3.fromRGB(45, 45, 55)
TextStroke.Parent = TextBox

-- Interactive Key Check Button
local CheckButton = Instance.new("TextButton")
CheckButton.Name = "CheckButton"
CheckButton.Parent = KeyFrame
CheckButton.BackgroundColor3 = Color3.fromRGB(255, 110, 0)
CheckButton.Position = UDim2.new(0.06, 0, 0.65, 0)
CheckButton.Size = UDim2.new(0.88, 0, 0, 40)
CheckButton.Font = Enum.Font.GothamBold
CheckButton.Text = "VERIFY KEY"
CheckButton.TextColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.TextSize = 13
CheckButton.ZIndex = 11

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 8)
ButtonCorner.Parent = CheckButton

-- Smooth Hover & Click Animations
CheckButton.MouseEnter:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(255, 140, 20)}):Play()
end)
CheckButton.MouseLeave:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(255, 110, 0)}):Play()
end)

-- Validation Scripting Logic with UI Feedback
CheckButton.MouseButton1Click:Connect(function()
    local enteredKey = string.gsub(TextBox.Text, "^%s*(.-)%s*$", "%1") --
    
    if enteredKey == "" then
        CheckButton.Text = "❌ PLEASE ENTER A KEY!"
        TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(220, 40, 40)}):Play()
        task.wait(1.5)
        CheckButton.Text = "VERIFY KEY"
        TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(255, 110, 0)}):Play()
        return
    end

    CheckButton.Text = "⚡ CHECKING AUTHENTICATION..."
    TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(200, 90, 0)}):Play()
    task.wait(0.6) -- Simulated check latency

    if enteredKey == MySecretKey then
        CheckButton.Text = "✅ ACCESS GRANTED! WELCOME"
        TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(35, 185, 95)}):Play()
        task.wait(1.2)
        
        -- Smooth Fade Out Window
        TweenService:Create(KeyFrame, TweenInfo.new(0.4), {Size = UDim2.new(0, 0, 0, 0), Position = UDim2.new(0.5, 0, 0.5, 0)}):Play()
        task.wait(0.4)
        KeyGui:Destroy() --
        
        -- Load main hub script safely
        loadstring(game:HttpGet("https://githubusercontent.com"))() --
    else
        CheckButton.Text = "❌ INVALID ACCESS KEY!"
        TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(220, 40, 40)}):Play()
        task.wait(2)
        CheckButton.Text = "VERIFY KEY"
        TweenService:Create(CheckButton, TweenInfo.new(0.2), {BackgroundColor3 = Color3.fromRGB(255, 110, 0)}):Play()
    end
end)
