-- [[ ZervxHub - Standalone & Fixed Core ]] --

-- Safely check if core services exist
local CoreGui = game:GetService("CoreGui")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer

-- Remove previous instance if it exists to prevent duplication
if CoreGui:FindFirstChild("ZervxHubGUI") then
    CoreGui.ZervxHubGUI:Destroy()
end

-- Create ScreenGui
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "ZervxHubGUI"
ScreenGui.Parent = CoreGui
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Main Frame
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Parent = ScreenGui
MainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
MainFrame.BorderSizePixel = 0
MainFrame.Position = UDim2.new(0.5, -175, 0.5, -125)
MainFrame.Size = UDim2.new(0, 350, 0, 250)
MainFrame.Active = true
MainFrame.Draggable = true

-- Corner Styling
local UICorner = Instance.new("UICorner")
UICorner.CornerRadius = UDim.new(0, 8)
UICorner.Parent = MainFrame

-- Title Bar
local TitleBar = Instance.new("TextLabel")
TitleBar.Name = "TitleBar"
TitleBar.Parent = MainFrame
TitleBar.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
TitleBar.Size = UDim2.new(1, 0, 0, 40)
TitleBar.Font = Enum.Font.GothamBold
TitleBar.Text = "  ZervxHub | Control Panel"
TitleBar.TextColor3 = Color3.fromRGB(255, 255, 255)
TitleBar.TextSize = 14
TitleBar.TextXAlignment = Enum.TextXAlignment.Left

local TitleCorner = Instance.new("UICorner")
TitleCorner.CornerRadius = UDim.new(0, 8)
TitleCorner.Parent = TitleBar

-- State Variables
local Settings = {
    WalkSpeed = 16,
    JumpPower = 50,
    InfJump = false,
    Noclip = false
}

-- Helper function to create buttons
local function CreateButton(name, posY, callback)
    local btn = Instance.new("TextButton")
    btn.Parent = MainFrame
    btn.BackgroundColor3 = Color3.fromRGB(40, 40, 55)
    btn.Position = UDim2.new(0, 20, 0, posY)
    btn.Size = UDim2.new(0, 310, 0, 35)
    btn.Font = Enum.Font.GothamSemibold
    btn.Text = name
    btn.TextColor3 = Color3.fromRGB(255, 255, 255)
    btn.TextSize = 13
    
    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn
    
    btn.MouseButton1Click:Connect(callback)
end

-- Speed Boost Toggle Button
local speedActive = false
CreateButton("Toggle WalkSpeed (50)", 55, function()
    speedActive = not speedActive
    local char = LocalPlayer.Character
    if char and char:FindFirstChildOfClass("Humanoid") then
        char:FindFirstChildOfClass("Humanoid").WalkSpeed = speedActive and 50 or 16
        print("[ZervxHub]: WalkSpeed set to " .. (speedActive and "50" or "16"))
    end
end)

-- Infinite Jump Toggle Button
CreateButton("Toggle Infinite Jump", 100, function()
    Settings.InfJump = not Settings.InfJump
    print("[ZervxHub]: Infinite Jump is now " .. tostring(Settings.InfJump))
end)

-- Noclip Toggle Button
CreateButton("Toggle Noclip", 145, function()
    Settings.Noclip = not Settings.Noclip
    print("[ZervxHub]: Noclip is now " .. tostring(Settings.Noclip))
end)

-- Unload Button
CreateButton("Close / Unload UI", 190, function()
    ScreenGui:Destroy()
end)

-- Infinite Jump Logic
UserInputService.JumpRequest:Connect(function()
    if Settings.InfJump then
        local char = LocalPlayer.Character
        if char and char:FindFirstChildOfClass("Humanoid") then
            char:FindFirstChildOfClass("Humanoid"):ChangeState("Jumping")
        end
    end
end)

-- Noclip Physics Loop
RunService.Stepped:Connect(function()
    if Settings.Noclip then
        local char = LocalPlayer.Character
        if char then
            for _, part in ipairs(char:GetChildren()) do
                if part:IsA("BasePart") then
                    part.CanCollide = false
                end
            end
        end
    end
end)

print("[ZervxHub]: Successfully Loaded!")