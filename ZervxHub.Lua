-- [[ ZervxHub - Modern Sidebar UI Edition ]] --

local CoreGui = game:GetService("CoreGui")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer

-- Remove existing GUI if open
if CoreGui:FindFirstChild("ZervxHubModern") then
    CoreGui.ZervxHubModern:Destroy()
end

-- Main ScreenGui
local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "ZervxHubModern"
ScreenGui.Parent = CoreGui
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

-- Main Window Frame (Sidebar Layout)
local Window = Instance.new("Frame")
Window.Name = "MainWindow"
Window.Parent = ScreenGui
Window.BackgroundColor3 = Color3.fromRGB(18, 18, 22)
Window.BorderSizePixel = 0
Window.Position = UDim2.new(0.5, -250, 0.5, -160)
Window.Size = UDim2.new(0, 500, 0, 320)
Window.Active = true
Window.Draggable = true

local WindowCorner = Instance.new("UICorner")
WindowCorner.CornerRadius = UDim.new(0, 8)
WindowCorner.Parent = Window

-- Top Bar / Header
local TopBar = Instance.new("Frame")
TopBar.Name = "TopBar"
TopBar.Parent = Window
TopBar.BackgroundColor3 = Color3.fromRGB(25, 25, 32)
TopBar.Size = UDim2.new(1, 0, 0, 35)

local TopCorner = Instance.new("UICorner")
TopCorner.CornerRadius = UDim.new(0, 8)
TopCorner.Parent = TopBar

local TitleLabel = Instance.new("TextLabel")
TitleLabel.Parent = TopBar
TitleLabel.BackgroundTransparency = 1
TitleLabel.Position = UDim2.new(0, 12, 0, 0)
TitleLabel.Size = UDim2.new(0, 200, 1, 0)
TitleLabel.Font = Enum.Font.GothamBold
TitleLabel.Text = "ZervxHub"
TitleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
TitleLabel.TextSize = 14
TitleLabel.TextXAlignment = Enum.TextXAlignment.Left

-- Close Button
local CloseBtn = Instance.new("TextButton")
CloseBtn.Parent = TopBar
CloseBtn.BackgroundColor3 = Color3.fromRGB(220, 50, 50)
CloseBtn.Position = UDim2.new(1, -30, 0.5, -10)
CloseBtn.Size = UDim2.new(0, 20, 0, 20)
CloseBtn.Font = Enum.Font.GothamBold
CloseBtn.Text = "X"
CloseBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
CloseBtn.TextSize = 11

local CloseCorner = Instance.new("UICorner")
CloseCorner.CornerRadius = UDim.new(0, 4)
CloseCorner.Parent = CloseBtn

CloseBtn.MouseButton1Click:Connect(function()
    ScreenGui:Destroy()
end)

-- Sidebar Menu
local Sidebar = Instance.new("ScrollingFrame")
Sidebar.Name = "Sidebar"
Sidebar.Parent = Window
Sidebar.BackgroundColor3 = Color3.fromRGB(22, 22, 28)
Sidebar.BorderSizePixel = 0
Sidebar.Position = UDim2.new(0, 0, 0, 35)
Sidebar.Size = UDim2.new(0, 130, 1, -35)
Sidebar.CanvasSize = UDim2.new(0, 0, 0, 200)
Sidebar.ScrollBarThickness = 2

-- Content Container Area
local ContentContainer = Instance.new("Frame")
ContentContainer.Name = "ContentContainer"
ContentContainer.Parent = Window
ContentContainer.BackgroundTransparency = 1
ContentContainer.Position = UDim2.new(0, 140, 0, 45)
ContentContainer.Size = UDim2.new(1, -150, 1, -55)

-- Tab Pages Dictionary
local Pages = {}
local activePage = nil

local function CreateTabButton(name, order)
    local btn = Instance.new("TextButton")
    btn.Parent = Sidebar
    btn.BackgroundColor3 = Color3.fromRGB(30, 30, 38)
    btn.Position = UDim2.new(0, 8, 0, 8 + ((order - 1) * 38))
    btn.Size = UDim2.new(0, 114, 0, 30)
    btn.Font = Enum.Font.GothamSemibold
    btn.Text = "  " .. name
    btn.TextColor3 = Color3.fromRGB(180, 180, 180)
    btn.TextSize = 12
    btn.TextXAlignment = Enum.TextXAlignment.Left

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = btn

    local page = Instance.new("ScrollingFrame")
    page.Name = name .. "Page"
    page.Parent = ContentContainer
    page.BackgroundTransparency = 1
    page.Size = UDim2.new(1, 0, 1, 0)
    page.CanvasSize = UDim2.new(0, 0, 0, 400)
    page.ScrollBarThickness = 3
    page.Visible = false

    Pages[name] = page

    btn.MouseButton1Click:Connect(function()
        for _, p in pairs(Pages) do p.Visible = false end
        page.Visible = true
        activePage = page
    end)

    if not activePage then
        page.Visible = true
        activePage = page
    end

    return page
end

-- Helper: Create Toggle Switch inside a Page
local function AddToggle(page, labelText, defaultState, callback)
    local state = defaultState
    local frame = Instance.new("Frame")
    frame.Parent = page
    frame.BackgroundColor3 = Color3.fromRGB(26, 26, 34)
    frame.Size = UDim2.new(1, -10, 0, 36)
    frame.Position = UDim2.new(0, 0, 0, (#page:GetChildren() - 2) * 42)

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 6)
    corner.Parent = frame

    local label = Instance.new("TextLabel")
    label.Parent = frame
    label.BackgroundTransparency = 1
    label.Position = UDim2.new(0, 12, 0, 0)
    label.Size = UDim2.new(0, 240, 1, 0)
    label.Font = Enum.Font.GothamMedium
    label.Text = labelText
    label.TextColor3 = Color3.fromRGB(230, 230, 230)
    label.TextSize = 12
    label.TextXAlignment = Enum.TextXAlignment.Left

    local toggleBtn = Instance.new("TextButton")
    toggleBtn.Parent = frame
    toggleBtn.BackgroundColor3 = state and Color3.fromRGB(0, 170, 255) or Color3.fromRGB(45, 45, 55)
    toggleBtn.Position = UDim2.new(1, -50, 0.5, -10)
    toggleBtn.Size = UDim2.new(0, 40, 0, 20)
    toggleBtn.Text = ""

    local toggleCorner = Instance.new("UICorner")
    toggleCorner.CornerRadius = UDim.new(1, 0)
    toggleCorner.Parent = toggleBtn

    toggleBtn.MouseButton1Click:Connect(function()
        state = not state
        toggleBtn.BackgroundColor3 = state and Color3.fromRGB(0, 170, 255) or Color3.fromRGB(45, 45, 55)
        callback(state)
    end)
end

---------------------------------------------------------
-- SETUP TABS & FEATURES
---------------------------------------------------------

-- Tab 1: Main / Autofarm Features
local MainTab = CreateTabButton("Autofarm", 1)
AddToggle(MainTab, "Auto WalkSpeed (50)", false, function(state)
    local char = LocalPlayer.Character
    if char and char:FindFirstChildOfClass("Humanoid") then
        char:FindFirstChildOfClass("Humanoid").WalkSpeed = state and 50 or 16
    end
end)

AddToggle(MainTab, "Infinite Jump", false, function(state)
    _G.InfJump = state
end)

-- Tab 2: Combat / Character Features
local CombatTab = CreateTabButton("Combat", 2)
AddToggle(CombatTab, "Noclip Walls", false, function(state)
    _G.Noclip = state
end)

-- Tab 3: Settings
local SettingsTab = CreateTabButton("Settings", 3)

-- Infinite Jump Listener
UserInputService.JumpRequest:Connect(function()
    if _G.InfJump then
        local char = LocalPlayer.Character
        if char and char:FindFirstChildOfClass("Humanoid") then
            char:FindFirstChildOfClass("Humanoid"):ChangeState("Jumping")
        end
    end
end)

-- Noclip Loop
RunService.Stepped:Connect(function()
    if _G.Noclip then
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

print("[ZervxHub]: Modern Sidebar UI Loaded successfully!")