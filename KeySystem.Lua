-- [[ ZERVXHUB - EXTREME ULTRAMODERN KEY SYSTEM ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")
local TweenService = game:GetService("TweenService")

-- 🔑 Secret Key
local MySecretKey = "KEYAUTH-R1zzYl-P5bPy4-BUPD7t-fyXtpy-V8BwKp-BSL7t4" 

-- Premium ScreenGui Setup
local KeyGui = Instance.new("ScreenGui")
KeyGui.Name = "ZervxHub_KeySystem"
KeyGui.Parent = TargetGuiContainer
KeyGui.ResetOnSpawn = false
KeyGui.DisplayOrder = 999999
KeyGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Main Premium Card Shadow/Glow (To give depth)
local ShadowFrame = Instance.new("Frame")
ShadowFrame.Name = "ShadowFrame"
ShadowFrame.Parent = KeyGui
ShadowFrame.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
ShadowFrame.BackgroundTransparency = 0.4
ShadowFrame.Position = UDim2.new(0.5, -170, 0.5, -105)
ShadowFrame.Size = UDim2.new(0, 340, 0, 210)
ShadowFrame.ZIndex = 9

local ShadowCorner = Instance.new("UICorner")
ShadowCorner.CornerRadius = UDim.new(0, 16)
ShadowCorner.Parent = ShadowFrame

-- Main Frame (Fancy Cyberpunk Curved Design)
local KeyFrame = Instance.new("Frame")
KeyFrame.Name = "KeyFrame"
KeyFrame.Parent = KeyGui
KeyFrame.BackgroundColor3 = Color3.fromRGB(11, 11, 14) -- Deep Matte Obsidian
KeyFrame.Position = UDim2.new(0.5, -165, 0.5, -100)
KeyFrame.Size = UDim2.new(0, 330, 0, 200)
KeyFrame.Active = true
KeyFrame.ZIndex = 10
KeyFrame.BorderSizePixel = 0

local FrameCorner = Instance.new("UICorner")
FrameCorner.CornerRadius = UDim.new(0, 14) -- Aggressive Premium Curves
FrameCorner.Parent = KeyFrame

-- Premium Gradient Border (Makes the frame shape pop out instantly)
local BorderGlow = Instance.new("UIStroke")
BorderGlow.Thickness = 2
BorderGlow.Transparency = 0.1
BorderGlow.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
BorderGlow.Parent = KeyFrame

local BorderGradient = Instance.new("UIGradient")
BorderGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 132, 0)),   -- Electric Neon Orange
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 40, 0)),  -- Fire Crimson
    ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 132, 0))
}
BorderGradient.Parent = BorderGlow

-- Smooth Mobile/PC Dragging System
local UserInputService = game:GetService("UserInputService")
local dragging, dragInput, dragStart, startPos
local function updateDrag(input)
    local delta = input.Position - dragStart
    local newPos = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    KeyFrame.Position = newPos
    ShadowFrame.Position = UDim2.new(newPos.X.Scale, newPos.X.Offset - 5, newPos.Y.Scale, newPos.Y.Offset - 5)
end

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
    if input == dragInput and dragging then updateDrag(input) end
end)

-- Top Accent Header Line
local HeaderLine = Instance.new("Frame")
HeaderLine.Name = "HeaderLine"
HeaderLine.Parent = KeyFrame
HeaderLine.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
HeaderLine.BorderSizePixel = 0
HeaderLine.Position = UDim2.new(0.1, 0, 0, 42)
HeaderLine.Size = UDim2.new(0.8, 0, 0, 1)
HeaderLine.ZIndex = 11

local LineGradient = Instance.new("UIGradient")
LineGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 40, 0)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(255, 132, 0)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(255, 40, 0))
}
LineGradient.Parent = HeaderLine

-- Modernized Title Branding
local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Parent = KeyFrame
Title.BackgroundTransparency = 1
Title.Position = UDim2.new(0, 0, 0, 8)
Title.Size = UDim2.new(1, 0, 0, 30)
Title.Font = Enum.Font.GothamBold
Title.Text = "⚡ ZERVXHUB SYSTEM"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.TextSize = 14
Title.ZIndex = 11

-- Custom Glassmorphism Input Field
local TextBox = Instance.new("TextBox")
TextBox.Name = "TextBox"
TextBox.Parent = KeyFrame
TextBox.BackgroundColor3 = Color3.fromRGB(18, 18, 24)
TextBox.Position = UDim2.new(0.08, 0, 0.35, 0)
TextBox.Size = UDim2.new(0.84, 0, 0, 42)
TextBox.Font = Enum.Font.Gotham
TextBox.PlaceholderText = "Paste access token here..."
TextBox.PlaceholderColor3 = Color3.fromRGB(100, 100, 110)
TextBox.Text = ""
TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox.TextSize = 12
TextBox.ZIndex = 11

local TextCorner = Instance.new("UICorner")
TextCorner.CornerRadius = UDim.new(0, 10)
TextCorner.Parent = TextBox

local TextStroke = Instance.new("UIStroke")
TextStroke.Thickness = 1
TextStroke.Color = Color3.fromRGB(35, 35, 45)
TextStroke.Parent = TextBox

-- Dynamic Neon Interface Control Button
local CheckButton = Instance.new("TextButton")
CheckButton.Name = "CheckButton"
CheckButton.Parent = KeyFrame
CheckButton.BackgroundColor3 = Color3.fromRGB(255, 110, 0)
CheckButton.Position = UDim2.new(0.08, 0, 0.65, 0)
CheckButton.Size = UDim2.new(0.84, 0, 0, 44)
CheckButton.Font = Enum.Font.GothamBold
CheckButton.Text = "AUTHENTICATE KEY"
CheckButton.TextColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.TextSize = 12
CheckButton.ZIndex = 11

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 10)
ButtonCorner.Parent = CheckButton

local ButtonGradient = Instance.new("UIGradient")
ButtonGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(255, 120, 0)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(220, 50, 0))
}
ButtonGradient.Parent = CheckButton

-- Hover Custom Transitions
CheckButton.MouseEnter:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.25, Enum.EasingStyle.Quad), {BackgroundTransparency = 0.15}):Play()
end)
CheckButton.MouseLeave:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.25, Enum.EasingStyle.Quad), {BackgroundTransparency = 0}):Play()
end)

-- Validation System Core Flow
CheckButton.MouseButton1Click:Connect(function()
    local enteredKey = string.gsub(TextBox.Text, "^%s*(.-)%s*$", "%1")
    
    if enteredKey == "" then
        CheckButton.Text = "⚠️ TOKEN REQUIREMENT EMPTY"
        ButtonGradient.Enabled = false
        CheckButton.BackgroundColor3 = Color3.fromRGB(210, 35, 35)
        task.wait(1.5)
        CheckButton.Text = "AUTHENTICATE KEY"
        ButtonGradient.Enabled = true
        return
    end

    CheckButton.Text = "🔄 VERIFYING SECURE PROTOCOLS..."
    ButtonGradient.Enabled = false
    CheckButton.BackgroundColor3 = Color3.fromRGB(180, 100, 0)
    task.wait(0.7)

    if enteredKey == MySecretKey then
        CheckButton.Text = "✔️ SYSTEM GRANTED! REDIRECTING..."
        CheckButton.BackgroundColor3 = Color3.fromRGB(30, 175, 85)
        task.wait(1)
        
        -- Micro Expansion Out Animation
        TweenService:Create(KeyFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        TweenService:Create(ShadowFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        task.wait(0.35)
        KeyGui:Destroy()
        
        loadstring(game:HttpGet("https://raw.githubusercontent.com/TheKnightZervx/ZervxHub/refs/heads/main/ZervxHub.Lua"))()
    else
        CheckButton.Text = "❌ ACCESS REJECTED! BAD TOKEN"
        CheckButton.BackgroundColor3 = Color3.fromRGB(210, 35, 35)
        task.wait(2)
        CheckButton.Text = "AUTHENTICATE KEY"
        ButtonGradient.Enabled = true
    end
end)
