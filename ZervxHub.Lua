from pathlib import Path

lua = r'''--[[
    ZervxHub v1.0.0
    Legitimate Roblox client-side utility dashboard.

    Safety notes:
    - No autofarm, teleport-to-target, noclip, godmode, anti-cheat bypass,
      ban evasion, remote abuse, or exploit execution.
    - Intended for use in Roblox experiences you own or are authorized to develop.
    - Client-side UI settings are local conveniences, not security controls.
]]

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local StarterGui = game:GetService("StarterGui")

local player = Players.LocalPlayer
if not player then
    warn("[ZervxHub] This LocalScript must run on the client.")
    return
end

local PLAYER_GUI = player:WaitForChild("PlayerGui")
local GUI_NAME = "ZervxHub"

-- Remove an earlier copy safely.
local previous = PLAYER_GUI:FindFirstChild(GUI_NAME)
if previous then
    previous:Destroy()
end

local COLORS = {
    background = Color3.fromRGB(13, 15, 21),
    panel = Color3.fromRGB(21, 24, 33),
    panel2 = Color3.fromRGB(28, 32, 43),
    border = Color3.fromRGB(48, 54, 70),
    text = Color3.fromRGB(239, 242, 250),
    muted = Color3.fromRGB(151, 160, 180),
    accent = Color3.fromRGB(184, 145, 255),
    accentDark = Color3.fromRGB(112, 78, 184),
    good = Color3.fromRGB(104, 220, 160),
    danger = Color3.fromRGB(245, 112, 125),
}

local function create(className, properties, parent)
    local object = Instance.new(className)
    for key, value in pairs(properties or {}) do
        object[key] = value
    end
    object.Parent = parent
    return object
end

local function corner(parent, radius)
    return create("UICorner", {
        CornerRadius = UDim.new(0, radius or 10)
    }, parent)
end

local function stroke(parent, color, transparency)
    return create("UIStroke", {
        Color = color or COLORS.border,
        Transparency = transparency or 0,
        Thickness = 1
    }, parent)
end

local function tween(object, duration, properties)
    local animation = TweenService:Create(
        object,
        TweenInfo.new(duration or 0.18, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
        properties
    )
    animation:Play()
    return animation
end

local screen = create("ScreenGui", {
    Name = GUI_NAME,
    ResetOnSpawn = false,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
    DisplayOrder = 50
}, PLAYER_GUI)

local scale = create("UIScale", { Scale = 1 }, screen)

local function updateScale()
    local camera = workspace.CurrentCamera
    if not camera then return end
    local width = camera.ViewportSize.X
    scale.Scale = math.clamp(width / 900, 0.72, 1)
end
updateScale()

if workspace.CurrentCamera then
    workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

local main = create("Frame", {
    Name = "Main",
    AnchorPoint = Vector2.new(0.5, 0.5),
    Position = UDim2.fromScale(0.5, 0.5),
    Size = UDim2.fromOffset(590, 410),
    BackgroundColor3 = COLORS.background,
    BorderSizePixel = 0
}, screen)
corner(main, 16)
stroke(main, COLORS.border, 0.15)

local top = create("Frame", {
    Name = "TopBar",
    Size = UDim2.new(1, 0, 0, 62),
    BackgroundColor3 = COLORS.panel,
    BorderSizePixel = 0
}, main)
corner(top, 16)

-- Square lower edge of the top bar while retaining rounded top corners.
create("Frame", {
    Position = UDim2.new(0, 0, 1, -15),
    Size = UDim2.new(1, 0, 0, 15),
    BackgroundColor3 = COLORS.panel,
    BorderSizePixel = 0
}, top)

local brandMark = create("Frame", {
    Position = UDim2.fromOffset(18, 15),
    Size = UDim2.fromOffset(32, 32),
    BackgroundColor3 = COLORS.accentDark,
    BorderSizePixel = 0
}, top)
corner(brandMark, 10)

create("TextLabel", {
    BackgroundTransparency = 1,
    Size = UDim2.fromScale(1, 1),
    Font = Enum.Font.GothamBold,
    Text = "Z",
    TextColor3 = COLORS.text,
    TextSize = 19
}, brandMark)

create("TextLabel", {
    Position = UDim2.fromOffset(60, 12),
    Size = UDim2.fromOffset(190, 23),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "ZervxHub",
    TextColor3 = COLORS.text,
    TextSize = 17,
    TextXAlignment = Enum.TextXAlignment.Left
}, top)

create("TextLabel", {
    Position = UDim2.fromOffset(61, 34),
    Size = UDim2.fromOffset(230, 15),
    BackgroundTransparency = 1,
    Font = Enum.Font.Gotham,
    Text = "DEVELOPER TOOLKIT  •  v1.0.0",
    TextColor3 = COLORS.muted,
    TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left
}, top)

local close = create("TextButton", {
    Name = "Close",
    AnchorPoint = Vector2.new(1, 0.5),
    Position = UDim2.new(1, -15, 0.5, 0),
    Size = UDim2.fromOffset(34, 30),
    BackgroundColor3 = COLORS.panel2,
    AutoButtonColor = false,
    Font = Enum.Font.GothamBold,
    Text = "×",
    TextColor3 = COLORS.muted,
    TextSize = 21
}, top)
corner(close, 9)
close.MouseButton1Click:Connect(function()
    screen:Destroy()
end)
close.MouseEnter:Connect(function()
    tween(close, 0.12, { BackgroundColor3 = COLORS.danger, TextColor3 = COLORS.text })
end)
close.MouseLeave:Connect(function()
    tween(close, 0.12, { BackgroundColor3 = COLORS.panel2, TextColor3 = COLORS.muted })
end)

local minimize = create("TextButton", {
    Name = "Minimize",
    AnchorPoint = Vector2.new(1, 0.5),
    Position = UDim2.new(1, -57, 0.5, 0),
    Size = UDim2.fromOffset(34, 30),
    BackgroundColor3 = COLORS.panel2,
    AutoButtonColor = false,
    Font = Enum.Font.GothamBold,
    Text = "—",
    TextColor3 = COLORS.muted,
    TextSize = 16
}, top)
corner(minimize, 9)

local sidebar = create("Frame", {
    Position = UDim2.fromOffset(14, 77),
    Size = UDim2.new(0, 145, 1, -92),
    BackgroundColor3 = COLORS.panel,
    BorderSizePixel = 0
}, main)
corner(sidebar, 12)

create("TextLabel", {
    Position = UDim2.fromOffset(14, 12),
    Size = UDim2.new(1, -28, 0, 18),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "WORKSPACE",
    TextColor3 = COLORS.muted,
    TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left
}, sidebar)

local content = create("Frame", {
    Position = UDim2.fromOffset(173, 77),
    Size = UDim2.new(1, -187, 1, -92),
    BackgroundTransparency = 1
}, main)

local pageTitle = create("TextLabel", {
    Size = UDim2.new(1, 0, 0, 27),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "Overview",
    TextColor3 = COLORS.text,
    TextSize = 19,
    TextXAlignment = Enum.TextXAlignment.Left
}, content)

local pageSubtitle = create("TextLabel", {
    Position = UDim2.fromOffset(0, 29),
    Size = UDim2.new(1, 0, 0, 18),
    BackgroundTransparency = 1,
    Font = Enum.Font.Gotham,
    Text = "Your lightweight client-side toolkit.",
    TextColor3 = COLORS.muted,
    TextSize = 11,
    TextXAlignment = Enum.TextXAlignment.Left
}, content)

local pageBody = create("Frame", {
    Position = UDim2.fromOffset(0, 58),
    Size = UDim2.new(1, 0, 1, -58),
    BackgroundTransparency = 1
}, content)

local pages = {}
local navButtons = {}
local activePage = "Overview"

local function clearPage()
    for _, child in ipairs(pageBody:GetChildren()) do
        child:Destroy()
    end
end

local function makeCard(parent, position, size)
    local card = create("Frame", {
        Position = position,
        Size = size,
        BackgroundColor3 = COLORS.panel,
        BorderSizePixel = 0
    }, parent)
    corner(card, 11)
    stroke(card, COLORS.border, 0.35)
    return card
end

local function makeLabel(parent, text, position, size, fontSize, color, bold)
    return create("TextLabel", {
        Position = position,
        Size = size,
        BackgroundTransparency = 1,
        Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham,
        Text = text,
        TextColor3 = color or COLORS.text,
        TextSize = fontSize or 12,
        TextWrapped = true,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = Enum.TextYAlignment.Center
    }, parent)
end

local function notify(title, message)
    pcall(function()
        StarterGui:SetCore("SendNotification", {
            Title = title,
            Text = message,
            Duration = 3
        })
    end)
end

local function renderOverview()
    clearPage()

    local welcome = makeCard(pageBody, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 102))
    makeLabel(welcome, "Welcome back", UDim2.fromOffset(15, 12), UDim2.new(1, -30, 0, 22), 15, COLORS.text, true)
    makeLabel(welcome, "A clean workspace for legitimate experience development.", UDim2.fromOffset(15, 39), UDim2.new(1, -30, 0, 35), 11, COLORS.muted, false)

    local status = makeCard(pageBody, UDim2.fromOffset(0, 114), UDim2.new(1, 0, 0, 70))
    local statusDot = create("Frame", {
        Position = UDim2.fromOffset(15, 25),
        Size = UDim2.fromOffset(9, 9),
        BackgroundColor3 = COLORS.good,
        BorderSizePixel = 0
    }, status)
    corner(statusDot, 9)
    makeLabel(status, "Interface status", UDim2.fromOffset(34, 13), UDim2.new(1, -48, 0, 18), 12, COLORS.text, true)
    makeLabel(status, "Running locally • No bypass features", UDim2.fromOffset(34, 34), UDim2.new(1, -48, 0, 17), 10, COLORS.muted, false)

    local note = makeCard(pageBody, UDim2.fromOffset(0, 196), UDim2.new(1, 0, 0, 88))
    makeLabel(note, "Safety first", UDim2.fromOffset(15, 10), UDim2.new(1, -30, 0, 20), 12, COLORS.accent, true)
    makeLabel(note, "Use this dashboard only in experiences you own or have permission to develop. It does not alter server permissions or guarantee account status.", UDim2.fromOffset(15, 32), UDim2.new(1, -30, 0, 46), 10, COLORS.muted, false)
end

local function renderTools()
    clearPage()
    local card = makeCard(pageBody, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 110))
    makeLabel(card, "Developer utilities", UDim2.fromOffset(15, 12), UDim2.new(1, -30, 0, 20), 13, COLORS.text, true)
    makeLabel(card, "This safe starter build contains UI and status utilities only. Add game-specific tools through your own experience's server-authorized systems.", UDim2.fromOffset(15, 37), UDim2.new(1, -30, 0, 58), 10, COLORS.muted, false)

    local button = create("TextButton", {
        Position = UDim2.fromOffset(0, 122),
        Size = UDim2.new(1, 0, 0, 38),
        BackgroundColor3 = COLORS.panel2,
        AutoButtonColor = false,
        Font = Enum.Font.GothamSemibold,
        Text = "Show test notification",
        TextColor3 = COLORS.text,
        TextSize = 11
    }, pageBody)
    corner(button, 9)
    stroke(button, COLORS.border, 0.25)
    button.MouseButton1Click:Connect(function()
        notify("ZervxHub", "Your interface notification is working.")
    end)
end

local function renderSettings()
    clearPage()
    local card = makeCard(pageBody, UDim2.fromOffset(0, 0), UDim2.new(1, 0, 0, 88))
    makeLabel(card, "Interface settings", UDim2.fromOffset(15, 10), UDim2.new(1, -30, 0, 20), 13, COLORS.text, true)
    makeLabel(card, "Minimize and close controls are available in the title bar. The window can be dragged from the top bar.", UDim2.fromOffset(15, 34), UDim2.new(1, -30, 0, 42), 10, COLORS.muted, false)

    local reset = create("TextButton", {
        Position = UDim2.fromOffset(0, 100),
        Size = UDim2.new(1, 0, 0, 38),
        BackgroundColor3 = COLORS.panel2,
        AutoButtonColor = false,
        Font = Enum.Font.GothamSemibold,
        Text = "Center window",
        TextColor3 = COLORS.text,
        TextSize = 11
    }, pageBody)
    corner(reset, 9)
    reset.MouseButton1Click:Connect(function()
        tween(main, 0.22, { Position = UDim2.fromScale(0.5, 0.5) })
    end)
end

pages.Overview = renderOverview
pages.Tools = renderTools
pages.Settings = renderSettings

local function showPage(name)
    if not pages[name] then return end
    activePage = name
    pageTitle.Text = name
    pageSubtitle.Text = ({
        Overview = "Your lightweight client-side toolkit.",
        Tools = "Simple utilities for your development workflow.",
        Settings = "Customize the dashboard experience."
    })[name] or ""

    for pageName, button in pairs(navButtons) do
        local selected = pageName == name
        tween(button, 0.14, {
            BackgroundColor3 = selected and COLORS.accentDark or COLORS.panel,
            TextColor3 = selected and COLORS.text or COLORS.muted
        })
    end
    pages[name]()
end

local navItems = {
    { name = "Overview", symbol = "⌂" },
    { name = "Tools", symbol = "◇" },
    { name = "Settings", symbol = "⚙" }
}

for index, item in ipairs(navItems) do
    local button = create("TextButton", {
        Position = UDim2.fromOffset(8, 40 + (index - 1) * 43),
        Size = UDim2.new(1, -16, 0, 36),
        BackgroundColor3 = COLORS.panel,
        AutoButtonColor = false,
        Font = Enum.Font.GothamSemibold,
        Text = "  " .. item.symbol .. "   " .. item.name,
        TextColor3 = COLORS.muted,
        TextSize = 11,
        TextXAlignment = Enum.TextXAlignment.Left
    }, sidebar)
    corner(button, 8)
    navButtons[item.name] = button
    button.MouseButton1Click:Connect(function()
        showPage(item.name)
    end)
end

-- Dragging via title bar; avoids deprecated GuiObject.Draggable.
local dragging = false
local dragStart
local startPosition
local dragInput

top.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1
        or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPosition = main.Position
        dragInput = input
    end
end)

top.InputEnded:Connect(function(input)
    if input == dragInput then
        dragging = false
        dragInput = nil
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement
        or input.UserInputType == Enum.UserInputType.Touch) then
        local delta = input.Position - dragStart
        main.Position = UDim2.new(
            startPosition.X.Scale,
            startPosition.X.Offset + delta.X,
            startPosition.Y.Scale,
            startPosition.Y.Offset + delta.Y
        )
    end
end)

local minimized = false
minimize.MouseButton1Click:Connect(function()
    minimized = not minimized
    sidebar.Visible = not minimized
    content.Visible = not minimized
    tween(main, 0.2, {
        Size = minimized and UDim2.fromOffset(250, 62) or UDim2.fromOffset(590, 410)
    })
    minimize.Text = minimized and "+" or "—"
end)

showPage("Overview")
print("[ZervxHub] v1.0.0 loaded successfully.")
'''
path = Path("/mnt/data/ZervxHub.lua")
path.write_text(lua, encoding="utf-8")
print(f"Created {path} ({len(lua.splitlines())} lines)")
