--[[
    ZervxHub v1.0.0
    A standalone Roblox Luau UI starter for experiences you own or are authorized to develop.

    Install as a LocalScript in StarterPlayer > StarterPlayerScripts.
    Uses standard Roblox APIs only. No executor-only functions, remote code loading,
    anti-cheat bypasses, or client-side "secret key" claims.

    IMPORTANT:
    This is a UI access prompt/demo, not secure authentication. Never put real secrets
    or trusted authorization checks in a LocalScript. Validate access on the server.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local COLORS = {
    Background = Color3.fromRGB(14, 14, 22),
    Panel = Color3.fromRGB(22, 22, 34),
    PanelAlt = Color3.fromRGB(29, 28, 44),
    Accent = Color3.fromRGB(151, 91, 255),
    AccentDark = Color3.fromRGB(111, 61, 207),
    Text = Color3.fromRGB(244, 241, 255),
    Muted = Color3.fromRGB(158, 153, 178),
    Border = Color3.fromRGB(58, 52, 78),
    Good = Color3.fromRGB(102, 220, 156),
}

local function make(className, properties, parent)
    local object = Instance.new(className)
    for property, value in pairs(properties or {}) do
        object[property] = value
    end
    object.Parent = parent
    return object
end

local function corner(parent, radius)
    make("UICorner", { CornerRadius = UDim.new(0, radius or 10) }, parent)
end

local function stroke(parent, color, transparency)
    make("UIStroke", {
        Color = color or COLORS.Border,
        Transparency = transparency or 0,
        Thickness = 1,
    }, parent)
end

local function tween(object, duration, properties)
    local animation = TweenService:Create(
        object,
        TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
        properties
    )
    animation:Play()
    return animation
end

local screen = make("ScreenGui", {
    Name = "ZervxHub",
    ResetOnSpawn = false,
    IgnoreGuiInset = true,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, playerGui)

local root = make("Frame", {
    Name = "Window",
    AnchorPoint = Vector2.new(0.5, 0.5),
    Position = UDim2.fromScale(0.5, 0.5),
    Size = UDim2.fromOffset(650, 420),
    BackgroundColor3 = COLORS.Background,
    BorderSizePixel = 0,
}, screen)
corner(root, 16)
stroke(root, COLORS.Border, 0.15)

local scale = make("UIScale", { Scale = 1 }, root)
local function updateScale()
    local camera = workspace.CurrentCamera
    if not camera then return end
    local viewport = camera.ViewportSize
    scale.Scale = math.clamp(math.min(viewport.X / 760, viewport.Y / 540), 0.68, 1)
end
updateScale()
if workspace.CurrentCamera then
    workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

local topbar = make("Frame", {
    Name = "Topbar",
    Size = UDim2.new(1, 0, 0, 58),
    BackgroundColor3 = COLORS.Panel,
    BorderSizePixel = 0,
}, root)
corner(topbar, 16)

-- Covers the lower rounded corners of the top bar.
make("Frame", {
    Position = UDim2.new(0, 0, 1, -14),
    Size = UDim2.new(1, 0, 0, 14),
    BackgroundColor3 = COLORS.Panel,
    BorderSizePixel = 0,
}, topbar)

local brandMark = make("Frame", {
    Position = UDim2.fromOffset(18, 13),
    Size = UDim2.fromOffset(32, 32),
    BackgroundColor3 = COLORS.Accent,
    BorderSizePixel = 0,
}, topbar)
corner(brandMark, 10)

make("TextLabel", {
    BackgroundTransparency = 1,
    Size = UDim2.fromScale(1, 1),
    Font = Enum.Font.GothamBold,
    Text = "Z",
    TextColor3 = Color3.new(1, 1, 1),
    TextSize = 19,
}, brandMark)

make("TextLabel", {
    Position = UDim2.fromOffset(60, 9),
    Size = UDim2.fromOffset(220, 22),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "ZervxHub",
    TextColor3 = COLORS.Text,
    TextSize = 17,
    TextXAlignment = Enum.TextXAlignment.Left,
}, topbar)

make("TextLabel", {
    Position = UDim2.fromOffset(60, 30),
    Size = UDim2.fromOffset(220, 16),
    BackgroundTransparency = 1,
    Font = Enum.Font.Gotham,
    Text = "VERSION 1.0.0  •  UI EDITION",
    TextColor3 = COLORS.Muted,
    TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left,
}, topbar)

local minimize = make("TextButton", {
    Name = "Minimize",
    Position = UDim2.new(1, -76, 0, 14),
    Size = UDim2.fromOffset(26, 26),
    BackgroundColor3 = COLORS.PanelAlt,
    Text = "–",
    TextColor3 = COLORS.Text,
    TextSize = 18,
    Font = Enum.Font.GothamBold,
    AutoButtonColor = true,
}, topbar)
corner(minimize, 8)

local close = make("TextButton", {
    Name = "Close",
    Position = UDim2.new(1, -42, 0, 14),
    Size = UDim2.fromOffset(26, 26),
    BackgroundColor3 = Color3.fromRGB(94, 43, 63),
    Text = "×",
    TextColor3 = COLORS.Text,
    TextSize = 18,
    Font = Enum.Font.GothamBold,
    AutoButtonColor = true,
}, topbar)
corner(close, 8)

local sidebar = make("Frame", {
    Name = "Sidebar",
    Position = UDim2.fromOffset(14, 72),
    Size = UDim2.fromOffset(150, 334),
    BackgroundColor3 = COLORS.Panel,
    BorderSizePixel = 0,
}, root)
corner(sidebar, 12)

make("TextLabel", {
    Position = UDim2.fromOffset(14, 13),
    Size = UDim2.new(1, -28, 0, 16),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "WORKSPACE",
    TextColor3 = COLORS.Muted,
    TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left,
}, sidebar)

local content = make("Frame", {
    Name = "Content",
    Position = UDim2.fromOffset(178, 72),
    Size = UDim2.new(1, -192, 1, -86),
    BackgroundTransparency = 1,
}, root)

local pages = {}
local navButtons = {}
local currentPage = nil

local function createPage(name)
    local page = make("Frame", {
        Name = name,
        Size = UDim2.fromScale(1, 1),
        BackgroundTransparency = 1,
        Visible = false,
    }, content)
    pages[name] = page
    return page
end

local function addNav(name, label, order)
    local button = make("TextButton", {
        Name = name .. "Button",
        Position = UDim2.fromOffset(9, 40 + (order - 1) * 42),
        Size = UDim2.new(1, -18, 0, 34),
        BackgroundColor3 = COLORS.Panel,
        Text = label,
        TextColor3 = COLORS.Muted,
        TextSize = 12,
        Font = Enum.Font.GothamMedium,
        TextXAlignment = Enum.TextXAlignment.Left,
        AutoButtonColor = false,
    }, sidebar)
    corner(button, 8)
    make("UIPadding", {
        PaddingLeft = UDim.new(0, 12),
    }, button)
    navButtons[name] = button

    button.MouseButton1Click:Connect(function()
        if currentPage then
            pages[currentPage].Visible = false
        end
        currentPage = name
        pages[name].Visible = true

        for pageName, nav in pairs(navButtons) do
            local selected = pageName == name
            tween(nav, 0.15, {
                BackgroundColor3 = selected and COLORS.AccentDark or COLORS.Panel,
                TextColor3 = selected and COLORS.Text or COLORS.Muted,
            })
        end
    end)
end

local function heading(parent, title, subtitle)
    make("TextLabel", {
        Size = UDim2.new(1, 0, 0, 30),
        BackgroundTransparency = 1,
        Font = Enum.Font.GothamBold,
        Text = title,
        TextColor3 = COLORS.Text,
        TextSize = 21,
        TextXAlignment = Enum.TextXAlignment.Left,
    }, parent)

    make("TextLabel", {
        Position = UDim2.fromOffset(0, 32),
        Size = UDim2.new(1, 0, 0, 22),
        BackgroundTransparency = 1,
        Font = Enum.Font.Gotham,
        Text = subtitle,
        TextColor3 = COLORS.Muted,
        TextSize = 11,
        TextXAlignment = Enum.TextXAlignment.Left,
    }, parent)
end

local function panel(parent, position, size)
    local box = make("Frame", {
        Position = position,
        Size = size,
        BackgroundColor3 = COLORS.Panel,
        BorderSizePixel = 0,
    }, parent)
    corner(box, 12)
    stroke(box, COLORS.Border, 0.45)
    return box
end

local home = createPage("Home")
heading(home, "Welcome back", "Your workspace is ready.")
local welcomeCard = panel(home, UDim2.fromOffset(0, 68), UDim2.new(1, 0, 0, 112))
make("TextLabel", {
    Position = UDim2.fromOffset(17, 15),
    Size = UDim2.new(1, -34, 0, 25),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "ZervxHub UI Edition",
    TextColor3 = COLORS.Text,
    TextSize = 16,
    TextXAlignment = Enum.TextXAlignment.Left,
}, welcomeCard)
make("TextLabel", {
    Position = UDim2.fromOffset(17, 44),
    Size = UDim2.new(1, -34, 0, 48),
    BackgroundTransparency = 1,
    Font = Enum.Font.Gotham,
    Text = "A clean starter interface for your own Roblox experience. Add your authorized game features here.",
    TextColor3 = COLORS.Muted,
    TextSize = 11,
    TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top,
}, welcomeCard)

local statusCard = panel(home, UDim2.fromOffset(0, 194), UDim2.new(1, 0, 0, 75))
make("TextLabel", {
    Position = UDim2.fromOffset(16, 12),
    Size = UDim2.new(1, -32, 0, 18),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "STATUS",
    TextColor3 = COLORS.Muted,
    TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left,
}, statusCard)
make("TextLabel", {
    Position = UDim2.fromOffset(16, 33),
    Size = UDim2.new(1, -32, 0, 24),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamMedium,
    Text = "●  Interface loaded successfully",
    TextColor3 = COLORS.Good,
    TextSize = 12,
    TextXAlignment = Enum.TextXAlignment.Left,
}, statusCard)

local toolsPage = createPage("Tools")
heading(toolsPage, "Tools", "Add features for your own experience.")
local toolsCard = panel(toolsPage, UDim2.fromOffset(0, 68), UDim2.new(1, 0, 0, 126))
make("TextLabel", {
    Position = UDim2.fromOffset(16, 14),
    Size = UDim2.new(1, -32, 0, 22),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "Feature area",
    TextColor3 = COLORS.Text,
    TextSize = 14,
    TextXAlignment = Enum.TextXAlignment.Left,
}, toolsCard)
make("TextLabel", {
    Position = UDim2.fromOffset(16, 42),
    Size = UDim2.new(1, -32, 0, 62),
    BackgroundTransparency = 1,
    Font = Enum.Font.Gotham,
    Text = "This section is intentionally a safe placeholder. Connect buttons only to game features you own and validate important actions on the server.",
    TextColor3 = COLORS.Muted,
    TextSize = 11,
    TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top,
}, toolsCard)

local settingsPage = createPage("Settings")
heading(settingsPage, "Settings", "Customize your interface.")
local settingsCard = panel(settingsPage, UDim2.fromOffset(0, 68), UDim2.new(1, 0, 0, 104))
make("TextLabel", {
    Position = UDim2.fromOffset(16, 14),
    Size = UDim2.new(1, -32, 0, 20),
    BackgroundTransparency = 1,
    Font = Enum.Font.GothamBold,
    Text = "Interface scale",
    TextColor3 = COLORS.Text,
    TextSize = 13,
    TextXAlignment = Enum.TextXAlignment.Left,
}, settingsCard)

local scaleButton = make("TextButton", {
    Position = UDim2.fromOffset(16, 47),
    Size = UDim2.fromOffset(116, 34),
    BackgroundColor3 = COLORS.AccentDark,
    Text = "Reset size",
    TextColor3 = COLORS.Text,
    TextSize = 11,
    Font = Enum.Font.GothamBold,
    AutoButtonColor = true,
}, settingsCard)
corner(scaleButton, 8)
scaleButton.MouseButton1Click:Connect(updateScale)

addNav("Home", "⌂   Overview", 1)
addNav("Tools", "◇   Tools", 2)
addNav("Settings", "⚙   Settings", 3)

local function showPage(name)
    if currentPage then
        pages[currentPage].Visible = false
    end
    currentPage = name
    pages[name].Visible = true
    for pageName, nav in pairs(navButtons) do
        local selected = pageName == name
        nav.BackgroundColor3 = selected and COLORS.AccentDark or COLORS.Panel
        nav.TextColor3 = selected and COLORS.Text or COLORS.Muted
    end
end

showPage("Home")

-- Dragging: use the top bar as the drag handle.
local dragging = false
local dragStart
local startPosition

topbar.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1
        or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPosition = root.Position
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if dragging and (input.UserInputType == Enum.UserInputType.MouseMovement
        or input.UserInputType == Enum.UserInputType.Touch) then
        local delta = input.Position - dragStart
        root.Position = UDim2.new(
            startPosition.X.Scale,
            startPosition.X.Offset + delta.X,
            startPosition.Y.Scale,
            startPosition.Y.Offset + delta.Y
        )
    end
end)

UserInputService.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1
        or input.UserInputType == Enum.UserInputType.Touch then
        dragging = false
    end
end)

local minimized = false
minimize.MouseButton1Click:Connect(function()
    minimized = not minimized
    sidebar.Visible = not minimized
    content.Visible = not minimized
    tween(root, 0.18, {
        Size = minimized and UDim2.fromOffset(650, 58) or UDim2.fromOffset(650, 420),
    })
    minimize.Text = minimized and "+" or "–"
end)

close.MouseButton1Click:Connect(function()
    screen:Destroy()
end)

print("[ZervxHub] v1.0.0 UI loaded.")
