-- [[ ZERVXHUB - 4K OCEAN-THEMED GATEWAY SYSTEM ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")
local TweenService = game:GetService("TweenService")

-- Clear old instances to force re-render
if TargetGuiContainer:FindFirstChild("ZervxHub_KeySystem") then
    TargetGuiContainer:FindFirstChild("ZervxHub_KeySystem"):Destroy()
end

-- 🔑 Secret Key
local MySecretKey = "KEYAUTH-R1zzYl-P5bPy4-BUPD7t-fyXtpy-V8BwKp-BSL7t4" 

local KeyGui = Instance.new("ScreenGui")
KeyGui.Name = "ZervxHub_KeySystem"
KeyGui.Parent = TargetGuiContainer
KeyGui.ResetOnSpawn = false
KeyGui.DisplayOrder = 999999
KeyGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Bioluminescent Ocean Abyss Soft Glow Shadow
local ShadowFrame = Instance.new("Frame")
ShadowFrame.Name = "ShadowFrame"
ShadowFrame.Parent = KeyGui
ShadowFrame.BackgroundColor3 = Color3.fromRGB(0, 15, 30) -- Abyssal Blue Shadow
ShadowFrame.BackgroundTransparency = 0.5
ShadowFrame.Position = UDim2.new(0.5, -172, 0.5, -112)
ShadowFrame.Size = UDim2.new(0, 344, 0, 224)
ShadowFrame.ZIndex = 8

local ShadowCorner = Instance.new("UICorner")
ShadowCorner.CornerRadius = UDim.new(0, 24)
ShadowCorner.Parent = ShadowFrame

-- Main Panel Frame (Sleek Deep Sea Transparent Glassmorphism)
local KeyFrame = Instance.new("Frame")
KeyFrame.Name = "KeyFrame"
KeyFrame.Parent = KeyGui
KeyFrame.BackgroundColor3 = Color3.fromRGB(6, 12, 22) -- Oceanic Depth Panel Accent
KeyFrame.BackgroundTransparency = 0.05
KeyFrame.Position = UDim2.new(0.5, -165, 0.5, -105)
KeyFrame.Size = UDim2.new(0, 330, 0, 210)
KeyFrame.Active = true
KeyFrame.ZIndex = 10
KeyFrame.BorderSizePixel = 0

local FrameCorner = Instance.new("UICorner")
FrameCorner.CornerRadius = UDim.new(0, 20) -- Ultra smooth 4K curved geometry
FrameCorner.Parent = KeyFrame

-- Marine Bioluminescent Dual Gradient Outline Stroke
local BorderGlow = Instance.new("UIStroke")
BorderGlow.Thickness = 2.2
BorderGlow.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
BorderGlow.Parent = KeyFrame

local BorderGradient = Instance.new("UIGradient")
BorderGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 225, 255)),   -- Electric Coral Cyan
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 100, 255)),  -- Deep Ocean Blue
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 225, 255))
}
BorderGradient.Parent = BorderGlow

-- Responsive Touch/PC Dragging Engine
local UserInputService = game:GetService("UserInputService")
local dragging, dragInput, dragStart, startPos
local function updateDrag(input)
    local delta = input.Position - dragStart
    local newPos = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    KeyFrame.Position = newPos
    ShadowFrame.Position = UDim2.new(newPos.X.Scale, newPos.X.Offset - 7, newPos.Y.Scale, newPos.Y.Offset - 7)
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

-- Minimalist Centered Title
local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Parent = KeyFrame
Title.BackgroundTransparency = 1
Title.Position = UDim2.new(0, 0, 0, 16)
Title.Size = UDim2.new(1, 0, 0, 25)
Title.Font = Enum.Font.GothamBold
Title.Text = "🌊 ZERVXHUB | OCEAN GATEWAY"
Title.TextColor3 = Color3.fromRGB(240, 250, 255)
Title.TextSize = 13
Title.ZIndex = 11

-- Smooth Premium Ocean Wave Separator Bar
local TopDivider = Instance.new("Frame")
TopDivider.Name = "TopDivider"
TopDivider.Parent = KeyFrame
TopDivider.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
TopDivider.BorderSizePixel = 0
TopDivider.Position = UDim2.new(0.12, 0, 0, 48)
TopDivider.Size = UDim2.new(0.76, 0, 0, 1)
TopDivider.ZIndex = 11

local DividerGradient = Instance.new("UIGradient")
DividerGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 100, 255)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 225, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 100, 255))
}
DividerGradient.Parent = TopDivider

-- Seamless Recessed Input Field (Abyssal Core Input)
local TextBox = Instance.new("TextBox")
TextBox.Name = "TextBox"
TextBox.Parent = KeyFrame
TextBox.BackgroundColor3 = Color3.fromRGB(4, 8, 15)
TextBox.Position = UDim2.new(0.08, 0, 0.38, 0)
TextBox.Size = UDim2.new(0.84, 0, 0, 42)
TextBox.Font = Enum.Font.Gotham
TextBox.PlaceholderText = "Submerge access token code here..."
TextBox.PlaceholderColor3 = Color3.fromRGB(70, 95, 120)
TextBox.Text = ""
TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox.TextSize = 11
TextBox.ZIndex = 11

local TextCorner = Instance.new("UICorner")
TextCorner.CornerRadius = UDim.new(0, 12)
TextCorner.Parent = TextBox

local TextStroke = Instance.new("UIStroke")
TextStroke.Thickness = 1.2
TextStroke.Color = Color3.fromRGB(15, 35, 55)
TextStroke.Parent = TextBox

-- Dynamic Fluid Interaction Verification Button
local CheckButton = Instance.new("TextButton")
CheckButton.Name = "CheckButton"
CheckButton.Parent = KeyFrame
CheckButton.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.Position = UDim2.new(0.08, 0, 0.66, 0)
CheckButton.Size = UDim2.new(0.84, 0, 0, 44)
CheckButton.Font = Enum.Font.GothamBold
CheckButton.Text = "VERIFY MARINE KEY"
CheckButton.TextColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.TextSize = 11
CheckButton.ZIndex = 11

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 12)
ButtonCorner.Parent = CheckButton

local ButtonGradient = Instance.new("UIGradient")
ButtonGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 180, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 90, 220))
}
ButtonGradient.Parent = CheckButton

-- Smooth Hydro-Fluid Micro-Animations
CheckButton.MouseEnter:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.25, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {Size = UDim2.new(0.86, 0, 0, 46), Position = UDim2.new(0.07, 0, 0.655, 0)}):Play()
end)
CheckButton.MouseLeave:Connect(function()
    TweenService:Create(CheckButton, TweenInfo.new(0.25, Enum.EasingStyle.Cubic, Enum.EasingDirection.Out), {Size = UDim2.new(0.84, 0, 0, 44), Position = UDim2.new(0.08, 0, 0.66, 0)}):Play()
end)

-- Core Dynamic Interface Processing Code
CheckButton.MouseButton1Click:Connect(function()
    local enteredKey = string.gsub(TextBox.Text, "^%s*(.-)%s*$", "%1")
    
    if enteredKey == "" then
        CheckButton.Text = "❌ EMPTY DEPTHS: KEY REQUIRED"
        ButtonGradient.Enabled = false
        CheckButton.BackgroundColor3 = Color3.fromRGB(200, 35, 35)
        task.wait(1.5)
        CheckButton.Text = "VERIFY MARINE KEY"
        ButtonGradient.Enabled = true
        return
    end

    CheckButton.Text = "🌊 SCANNING CURRENTS..."
    ButtonGradient.Enabled = false
    CheckButton.BackgroundColor3 = Color3.fromRGB(0, 140, 160)
    task.wait(0.65)

    if enteredKey == MySecretKey then
        CheckButton.Text = "⚓ ANCHOR DROP • ACCESS GRANTED"
        CheckButton.BackgroundColor3 = Color3.fromRGB(30, 165, 100)
        task.wait(1)
        
        -- Smooth Immersive Deep-Sea Ripple Exit Fade
        TweenService:Create(KeyFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        TweenService:Create(ShadowFrame, TweenInfo.new(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        task.wait(0.35)
        KeyGui:Destroy()
        
        loadstring(game:HttpGet("https://raw.githubusercontent.com/TheKnightZervx/ZervxHub/refs/heads/main/ZervxHub.Lua"))()
    else
        CheckButton.Text = "⚠️ CORRUPTED RESPONSE WAVE SEQUENCE"
        CheckButton.BackgroundColor3 = Color3.fromRGB(200, 35, 35)
        task.wait(2)
        CheckButton.Text = "VERIFY MARINE KEY"
        ButtonGradient.Enabled = true
    end
end)
