-- [[ ZERVXHUB - ANTI-DUPLICATION OCEAN KEY SYSTEM ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")
local CoreGui = game:GetService("CoreGui") or TargetGuiContainer
local TweenService = game:GetService("TweenService")

-- 🧹 DESTRUCTIVE CLEANUP: FORCE-DELETE ALL PREVIOUS COPIES FROM PLAYERGUI & COREGUI
local systemName = "ZervxHub_KeySystem"
for _, container in pairs({TargetGuiContainer, CoreGui}) do
    for _, child in pairs(container:GetChildren()) do
        if child.Name == systemName or child: some "KeySystem" then
            pcall(function() child:Destroy() end)
        end
    end
end

-- 🔑 Secret Key
local MySecretKey = "KEYAUTH-R1zzYl-P5bPy4-BUPD7t-fyXtpy-V8BwKp-BSL7t4" 

-- Premium ScreenGui Setup
local KeyGui = Instance.new("ScreenGui")
KeyGui.Name = systemName
KeyGui.Parent = TargetGuiContainer
KeyGui.ResetOnSpawn = false
KeyGui.DisplayOrder = 999999
KeyGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Main Premium Glow Shadow Frame (Deep Sea Abyss Shadow)
local ShadowFrame = Instance.new("Frame")
ShadowFrame.Name = "ShadowFrame"
ShadowFrame.Parent = KeyGui
ShadowFrame.BackgroundColor3 = Color3.fromRGB(0, 10, 20)
ShadowFrame.BackgroundTransparency = 0.5
ShadowFrame.Position = UDim2.new(0.5, -165, 0.5, -105)
ShadowFrame.Size = UDim2.new(0, 330, 0, 210)
ShadowFrame.ZIndex = 8

local ShadowCorner = Instance.new("UICorner")
ShadowCorner.CornerRadius = UDim.new(0, 20)
ShadowCorner.Parent = ShadowFrame

-- Main Frame (Fancy Rounded Ocean Curved Design)
local KeyFrame = Instance.new("Frame")
KeyFrame.Name = "KeyFrame"
KeyFrame.Parent = KeyGui
KeyFrame.BackgroundColor3 = Color3.fromRGB(8, 14, 24) -- Deep Matte Oceanic Blue
KeyFrame.Position = UDim2.new(0.5, -160, 0.5, -100)
KeyFrame.Size = UDim2.new(0, 320, 0, 200)
KeyFrame.Active = true
KeyFrame.ZIndex = 10
KeyFrame.BorderSizePixel = 0

-- Premium Curved Edge Styling
local FrameCorner = Instance.new("UICorner")
FrameCorner.CornerRadius = UDim.new(0, 18)
FrameCorner.Parent = KeyFrame

-- Bioluminescent Aqua Border Glow Accent
local BorderGlow = Instance.new("UIStroke")
BorderGlow.Thickness = 2.5
BorderGlow.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
BorderGlow.Parent = KeyFrame

local BorderGradient = Instance.new("UIGradient")
BorderGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 210, 255)),  -- Glowing Cyan Reef
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 90, 220)), -- Royal Marine Blue
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 210, 255))
}
BorderGradient.Parent = BorderGlow

-- Smooth Mobile and PC Dragging Handler
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

-- Transparent Top Banner Header Line Separator
local HeaderLine = Instance.new("Frame")
HeaderLine.Name = "HeaderLine"
HeaderLine.Parent = KeyFrame
HeaderLine.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
HeaderLine.BorderSizePixel = 0
HeaderLine.Position = UDim2.new(0.1, 0, 0, 44)
HeaderLine.Size = UDim2.new(0.8, 0, 0, 1)
HeaderLine.ZIndex = 11

local LineGradient = Instance.new("UIGradient")
LineGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 90, 220)),
    ColorSequenceKeypoint.new(0.5, Color3.fromRGB(0, 210, 255)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 90, 220))
}
LineGradient.Parent = HeaderLine

-- Elegant Floating Title Text
local Title = Instance.new("TextLabel")
Title.Name = "Title"
Title.Parent = KeyFrame
Title.BackgroundTransparency = 1
Title.Position = UDim2.new(0, 0, 0, 10)
Title.Size = UDim2.new(1, 0, 0, 30)
Title.Font = Enum.Font.GothamBold
Title.Text = "🌊 ZERVXHUB | OCEAN GATEWAY"
Title.TextColor3 = Color3.fromRGB(245, 250, 255)
Title.TextSize = 13
Title.ZIndex = 11

-- Sleek Rounded Trench Input Box
local TextBox = Instance.new("TextBox")
TextBox.Name = "TextBox"
TextBox.Parent = KeyFrame
TextBox.BackgroundColor3 = Color3.fromRGB(5, 9, 16)
TextBox.Position = UDim2.new(0.08, 0, 0.36, 0)
TextBox.Size = UDim2.new(0.84, 0, 0, 40)
TextBox.Font = Enum.Font.Gotham
TextBox.PlaceholderText = "Submerge access token here..."
TextBox.PlaceholderColor3 = Color3.fromRGB(70, 95, 120)
TextBox.Text = ""
TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox.TextSize = 11
TextBox.ZIndex = 11

local TextCorner = Instance.new("UICorner")
TextCorner.CornerRadius = UDim.new(0, 10)
TextCorner.Parent = TextBox

local TextStroke = Instance.new("UIStroke")
TextStroke.Thickness = 1
TextStroke.Color = Color3.fromRGB(15, 35, 55)
TextStroke.Parent = TextBox

-- Interactive Aqua Marine Button
local CheckButton = Instance.new("TextButton")
CheckButton.Name = "CheckButton"
CheckButton.Parent = KeyFrame
CheckButton.BackgroundColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.Position = UDim2.new(0.08, 0, 0.65, 0)
CheckButton.Size = UDim2.new(0.84, 0, 0, 42)
CheckButton.Font = Enum.Font.GothamBold
CheckButton.Text = "VERIFY MARINE KEY"
CheckButton.TextColor3 = Color3.fromRGB(255, 255, 255)
CheckButton.TextSize = 12
CheckButton.ZIndex = 11

local ButtonCorner = Instance.new("UICorner")
ButtonCorner.CornerRadius = UDim.new(0, 10)
ButtonCorner.Parent = CheckButton

local ButtonGradient = Instance.new("UIGradient")
ButtonGradient.Color = ColorSequence.new{
    ColorSequenceKeypoint.new(0, Color3.fromRGB(0, 170, 245)),
    ColorSequenceKeypoint.new(1, Color3.fromRGB(0, 85, 210))
}
ButtonGradient.Parent = CheckButton

-- Script Key Verification Logic Flow
CheckButton.MouseButton1Click:Connect(function()
    local enteredKey = string.gsub(TextBox.Text, "^%s*(.-)%s*$", "%1")
    
    if enteredKey == "" then
        CheckButton.Text = "❌ EMPTY DEPTHS: KEY REQUIRED"
        ButtonGradient.Enabled = false
        CheckButton.BackgroundColor3 = Color3.fromRGB(210, 40, 40)
        task.wait(1.5)
        CheckButton.Text = "VERIFY MARINE KEY"
        ButtonGradient.Enabled = true
        return
    end

    CheckButton.Text = "🌊 SCANNING CURRENTS..."
    ButtonGradient.Enabled = false
    CheckButton.BackgroundColor3 = Color3.fromRGB(0, 135, 155)
    task.wait(0.6)

    if enteredKey == MySecretKey then
        CheckButton.Text = "⚓ ANCHOR DROP • ACCESS GRANTED"
        CheckButton.BackgroundColor3 = Color3.fromRGB(30, 165, 100)
        task.wait(1)
        
        -- Structural Shrink Transition
        TweenService:Create(KeyFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        TweenService:Create(ShadowFrame, TweenInfo.new(0.3, Enum.EasingStyle.Back, Enum.EasingDirection.In), {Size = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1}):Play()
        task.wait(0.3)
        KeyGui:Destroy()
        
        loadstring(game:HttpGet("https://githubusercontent.com"))()
    else
        CheckButton.Text = "⚠️ CORRUPTED WAVE SEQUENCE"
        CheckButton.BackgroundColor3 = Color3.fromRGB(210, 40, 40)
        task.wait(2)
        CheckButton.Text = "VERIFY MARINE KEY"
        ButtonGradient.Enabled = true
    end
end)
