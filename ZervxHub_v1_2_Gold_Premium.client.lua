--[[
    ZervxHub v1.2.0 - GOLD PREMIUM
    Premium black-and-gold UI starter for Roblox experiences you own
    or are authorized to develop.

    Install as a LocalScript in StarterPlayer > StarterPlayerScripts.
    Uses standard Roblox APIs only. No executor APIs, remote code loading,
    anti-cheat bypasses, or gameplay automation for third-party experiences.

    IMPORTANT: This client UI is not secure authentication. Real key/license
    validation and permissions must be checked by a trusted server/backend.
]]

local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local previous = playerGui:FindFirstChild("ZervxHub")
if previous then previous:Destroy() end

local COLORS = {
    background = Color3.fromRGB(9, 10, 13),
    panel = Color3.fromRGB(15, 16, 20),
    panel2 = Color3.fromRGB(21, 22, 27),
    panel3 = Color3.fromRGB(29, 30, 36),
    border = Color3.fromRGB(54, 48, 36),
    gold = Color3.fromRGB(224, 185, 94),
    goldBright = Color3.fromRGB(246, 211, 132),
    goldDark = Color3.fromRGB(116, 86, 39),
    text = Color3.fromRGB(242, 239, 231),
    muted = Color3.fromRGB(151, 149, 143),
    green = Color3.fromRGB(111, 194, 139),
    red = Color3.fromRGB(207, 100, 100),
}

local function make(className, properties, parent)
    local object = Instance.new(className)
    for property, value in pairs(properties or {}) do
        object[property] = value
    end
    object.Parent = parent
    return object
end

local function round(parent, radius)
    return make("UICorner", {CornerRadius = UDim.new(0, radius or 9)}, parent)
end

local function outline(parent, color, transparency)
    return make("UIStroke", {
        Color = color or COLORS.border,
        Transparency = transparency or 0,
        Thickness = 1,
    }, parent)
end

local function animate(object, duration, properties)
    local info = TweenInfo.new(duration, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)
    local tween = TweenService:Create(object, info, properties)
    tween:Play()
    return tween
end

local function label(parent, text, size, color, font)
    return make("TextLabel", {
        BackgroundTransparency = 1,
        Text = text,
        TextColor3 = color or COLORS.text,
        TextSize = size or 12,
        Font = font or Enum.Font.Gotham,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = Enum.TextYAlignment.Center,
    }, parent)
end

local gui = make("ScreenGui", {
    Name = "ZervxHub",
    ResetOnSpawn = false,
    IgnoreGuiInset = true,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, playerGui)

local scale = make("UIScale", {Scale = 1}, gui)
local root = make("Frame", {
    Name = "Window",
    AnchorPoint = Vector2.new(0.5, 0.5),
    Position = UDim2.fromScale(0.5, 0.5),
    Size = UDim2.fromOffset(760, 500),
    BackgroundColor3 = COLORS.background,
    BorderSizePixel = 0,
    ClipsDescendants = true,
}, gui)
round(root, 14)
outline(root, COLORS.goldDark, 0.15)

local function updateScale()
    local camera = workspace.CurrentCamera
    if not camera then return end
    local viewport = camera.ViewportSize
    local fitX = (viewport.X - 24) / 760
    local fitY = (viewport.Y - 24) / 500
    scale.Scale = math.clamp(math.min(fitX, fitY, 1), 0.42, 1)
end
updateScale()
if workspace.CurrentCamera then
    workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

local topbar = make("Frame", {
    Name = "Topbar", Size = UDim2.new(1, 0, 0, 58),
    BackgroundColor3 = COLORS.panel, BorderSizePixel = 0,
}, root)
make("Frame", {
    Position = UDim2.new(0, 0, 1, -12), Size = UDim2.new(1, 0, 0, 12),
    BackgroundColor3 = COLORS.panel, BorderSizePixel = 0,
}, topbar)

local mark = make("Frame", {
    Position = UDim2.fromOffset(16, 12), Size = UDim2.fromOffset(34, 34),
    BackgroundColor3 = COLORS.goldDark, BorderSizePixel = 0,
}, topbar)
round(mark, 9)
outline(mark, COLORS.gold, 0.25)
local markText = label(mark, "Z", 20, COLORS.goldBright, Enum.Font.GothamBlack)
markText.Size = UDim2.fromScale(1, 1)
markText.TextXAlignment = Enum.TextXAlignment.Center

local brand = label(topbar, "ZervxHub", 16, COLORS.text, Enum.Font.GothamBold)
brand.Position = UDim2.fromOffset(60, 8)
brand.Size = UDim2.fromOffset(180, 22)
local subtitle = label(topbar, "GOLD PREMIUM  •  VERSION 1.2.0", 8, COLORS.gold)
subtitle.Position = UDim2.fromOffset(61, 31)
subtitle.Size = UDim2.fromOffset(230, 14)

local minimize = make("TextButton", {
    Name = "Minimize", AnchorPoint = Vector2.new(1, 0),
    Position = UDim2.new(1, -50, 0, 15), Size = UDim2.fromOffset(27, 27),
    BackgroundColor3 = COLORS.panel2, Text = "−", TextColor3 = COLORS.gold,
    TextSize = 18, Font = Enum.Font.GothamBold, AutoButtonColor = false,
}, topbar)
round(minimize, 7)
local close = make("TextButton", {
    Name = "Close", AnchorPoint = Vector2.new(1, 0),
    Position = UDim2.new(1, -15, 0, 15), Size = UDim2.fromOffset(27, 27),
    BackgroundColor3 = Color3.fromRGB(57, 31, 29), Text = "×",
    TextColor3 = COLORS.red, TextSize = 18, Font = Enum.Font.GothamBold,
    AutoButtonColor = false,
}, topbar)
round(close, 7)

local sidebar = make("Frame", {
    Name = "Sidebar", Position = UDim2.fromOffset(14, 72),
    Size = UDim2.new(0, 174, 1, -86), BackgroundColor3 = COLORS.panel,
    BorderSizePixel = 0,
}, root)
round(sidebar, 11)
local sideTitle = label(sidebar, "WORKSPACE", 9, COLORS.muted, Enum.Font.GothamBold)
sideTitle.Position = UDim2.fromOffset(14, 13)
sideTitle.Size = UDim2.new(1, -28, 0, 18)

local content = make("Frame", {
    Name = "Content", Position = UDim2.fromOffset(202, 72),
    Size = UDim2.new(1, -216, 1, -86), BackgroundTransparency = 1,
}, root)

local pageArea = make("Frame", {
    Name = "PageArea", Position = UDim2.fromOffset(0, 0),
    Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1,
}, content)

local pages, navButtons = {}, {}
local currentPage = nil
local reducedMotion = false

local function createPage(name)
    local page = make("Frame", {
        Name = name, Size = UDim2.fromScale(1, 1),
        BackgroundTransparency = 1, Visible = false,
    }, pageArea)
    pages[name] = page
    return page
end

local function heading(parent, title, description)
    local titleLabel = label(parent, title, 21, COLORS.text, Enum.Font.GothamBold)
    titleLabel.Position = UDim2.fromOffset(0, 0)
    titleLabel.Size = UDim2.new(1, 0, 0, 29)
    local desc = label(parent, description, 10, COLORS.muted)
    desc.Position = UDim2.fromOffset(1, 31)
    desc.Size = UDim2.new(1, -2, 0, 20)
end

local function card(parent, y, height)
    local frame = make("Frame", {
        Position = UDim2.fromOffset(0, y), Size = UDim2.new(1, 0, 0, height),
        BackgroundColor3 = COLORS.panel, BorderSizePixel = 0,
    }, parent)
    round(frame, 10)
    outline(frame, COLORS.border, 0.35)
    return frame
end

local function addNav(name, glyph, order)
    local button = make("TextButton", {
        Name = name .. "Button",
        Position = UDim2.fromOffset(9, 41 + (order - 1) * 41),
        Size = UDim2.new(1, -18, 0, 34),
        BackgroundColor3 = COLORS.panel,
        Text = "  " .. glyph .. "    " .. name,
        TextColor3 = COLORS.muted, TextSize = 11,
        Font = Enum.Font.GothamSemibold,
        TextXAlignment = Enum.TextXAlignment.Left,
        AutoButtonColor = false,
    }, sidebar)
    round(button, 7)
    navButtons[name] = button
    button.MouseButton1Click:Connect(function()
        if currentPage and pages[currentPage] then pages[currentPage].Visible = false end
        currentPage = name
        pages[name].Visible = true
        for pageName, nav in pairs(navButtons) do
            local active = pageName == name
            local target = {
                BackgroundColor3 = active and COLORS.panel3 or COLORS.panel,
                TextColor3 = active and COLORS.goldBright or COLORS.muted,
            }
            if reducedMotion then
                nav.BackgroundColor3 = target.BackgroundColor3
                nav.TextColor3 = target.TextColor3
            else
                animate(nav, 0.14, target)
            end
        end
    end)
end

local home = createPage("Home")
heading(home, "Welcome back", "Your ZervxHub workspace at a glance.")
local hero = card(home, 66, 112)
local heroTitle = label(hero, "BUILT FOR YOUR NEXT LEVEL", 13, COLORS.goldBright, Enum.Font.GothamBold)
heroTitle.Position = UDim2.fromOffset(16, 15)
heroTitle.Size = UDim2.new(1, -32, 0, 22)
local heroDesc = label(hero, "A refined black-and-gold control panel for projects and experiences you own.", 10, COLORS.muted)
heroDesc.Position = UDim2.fromOffset(16, 43)
heroDesc.Size = UDim2.new(1, -32, 0, 48)
heroDesc.TextWrapped = true
heroDesc.TextYAlignment = Enum.TextYAlignment.Top

local stats = card(home, 190, 88)
local function statColumn(x, titleText, valueText)
    local title = label(stats, titleText, 8, COLORS.muted, Enum.Font.GothamBold)
    title.Position = UDim2.fromOffset(x, 13)
    title.Size = UDim2.fromOffset(145, 16)
    local value = label(stats, valueText, 13, COLORS.text, Enum.Font.GothamSemibold)
    value.Position = UDim2.fromOffset(x, 36)
    value.Size = UDim2.fromOffset(145, 22)
    return value
end
local playerStat = statColumn(16, "PLAYER", player.DisplayName)
local healthStat = statColumn(190, "HEALTH", "—")
local speedStat = statColumn(364, "WALK SPEED", "—")

local refresh = make("TextButton", {
    Position = UDim2.fromOffset(0, 291), Size = UDim2.fromOffset(132, 34),
    BackgroundColor3 = COLORS.goldDark, Text = "Refresh stats",
    TextColor3 = COLORS.text, TextSize = 10, Font = Enum.Font.GothamBold,
    AutoButtonColor = false,
}, home)
round(refresh, 7)
refresh.MouseButton1Click:Connect(function()
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")
    healthStat.Text = humanoid and (math.floor(humanoid.Health) .. " / " .. math.floor(humanoid.MaxHealth)) or "—"
    speedStat.Text = humanoid and tostring(math.floor(humanoid.WalkSpeed)) or "—"
    playerStat.Text = player.DisplayName
end)

local tools = createPage("Tools")
heading(tools, "Tools", "Connect authorized project features here.")
local toolCard = card(tools, 66, 122)
local toolTitle = label(toolCard, "PROJECT MODULES", 12, COLORS.goldBright, Enum.Font.GothamBold)
toolTitle.Position = UDim2.fromOffset(15, 13)
toolTitle.Size = UDim2.new(1, -30, 0, 20)
local toolText = label(toolCard, "This release provides the interface foundation. Add your own game systems through server-validated RemoteEvents and keep important permissions on the server.", 10, COLORS.muted)
toolText.Position = UDim2.fromOffset(15, 40)
toolText.Size = UDim2.new(1, -30, 0, 68)
toolText.TextWrapped = true
toolText.TextYAlignment = Enum.TextYAlignment.Top

local settings = createPage("Settings")
heading(settings, "Settings", "Tune the interface to your preference.")
local settingsBox = card(settings, 66, 116)
local motionTitle = label(settingsBox, "Reduced motion", 11, COLORS.text, Enum.Font.GothamSemibold)
motionTitle.Position = UDim2.fromOffset(15, 16)
motionTitle.Size = UDim2.fromOffset(220, 20)
local motionDesc = label(settingsBox, "Disable navigation transitions", 9, COLORS.muted)
motionDesc.Position = UDim2.fromOffset(15, 39)
motionDesc.Size = UDim2.fromOffset(220, 18)
local motionToggle = make("TextButton", {
    AnchorPoint = Vector2.new(1, 0.5), Position = UDim2.new(1, -15, 0, 39),
    Size = UDim2.fromOffset(48, 25), BackgroundColor3 = COLORS.panel3,
    Text = "OFF", TextColor3 = COLORS.muted, TextSize = 9,
    Font = Enum.Font.GothamBold, AutoButtonColor = false,
}, settingsBox)
round(motionToggle, 7)
motionToggle.MouseButton1Click:Connect(function()
    reducedMotion = not reducedMotion
    motionToggle.Text = reducedMotion and "ON" or "OFF"
    motionToggle.TextColor3 = reducedMotion and COLORS.goldBright or COLORS.muted
    motionToggle.BackgroundColor3 = reducedMotion and COLORS.goldDark or COLORS.panel3
end)

local resetScale = make("TextButton", {
    Position = UDim2.fromOffset(0, 199), Size = UDim2.fromOffset(132, 34),
    BackgroundColor3 = COLORS.panel2, Text = "Reset UI scale",
    TextColor3 = COLORS.goldBright, TextSize = 10,
    Font = Enum.Font.GothamBold, AutoButtonColor = false,
}, settings)
round(resetScale, 7)
outline(resetScale, COLORS.goldDark, 0.35)
resetScale.MouseButton1Click:Connect(updateScale)

addNav("Home", "⌂", 1)
addNav("Tools", "◇", 2)
addNav("Settings", "⚙", 3)

local function showPage(name)
    if currentPage and pages[currentPage] then pages[currentPage].Visible = false end
    currentPage = name
    pages[name].Visible = true
    for pageName, nav in pairs(navButtons) do
        local active = pageName == name
        nav.BackgroundColor3 = active and COLORS.panel3 or COLORS.panel
        nav.TextColor3 = active and COLORS.goldBright or COLORS.muted
    end
end
showPage("Home")

-- Dragging supports mouse and touch. The top-bar buttons remain clickable.
local dragging, dragStart, startPosition = false, nil, nil
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
        root.Position = UDim2.new(startPosition.X.Scale, startPosition.X.Offset + delta.X,
            startPosition.Y.Scale, startPosition.Y.Offset + delta.Y)
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
    animate(root, 0.18, {Size = minimized and UDim2.fromOffset(760, 58) or UDim2.fromOffset(760, 500)})
    minimize.Text = minimized and "+" or "−"
end)

close.MouseButton1Click:Connect(function()
    gui:Destroy()
end)


-- GOLD PREMIUM ACCESS FLOW
-- The client never decides whether a key is valid. It asks a server-side
-- RemoteFunction named ZervxHub_VerifyKey to validate the submitted key.
-- Install the companion server Script in ServerScriptService.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
root.Visible = false

local gate = make("Frame", {
    Name = "AccessGate",
    Size = UDim2.fromScale(1, 1),
    BackgroundColor3 = COLORS.background,
    BorderSizePixel = 0,
    ZIndex = 50,
}, gui)

local gateCard = make("Frame", {
    AnchorPoint = Vector2.new(0.5, 0.5),
    Position = UDim2.fromScale(0.5, 0.5),
    Size = UDim2.fromOffset(390, 300),
    BackgroundColor3 = COLORS.panel,
    BorderSizePixel = 0,
    ZIndex = 51,
}, gate)
round(gateCard, 14)
outline(gateCard, COLORS.goldDark, 0.1)

local gateMark = make("Frame", {
    AnchorPoint = Vector2.new(0.5, 0),
    Position = UDim2.new(0.5, 0, 0, 22),
    Size = UDim2.fromOffset(46, 46),
    BackgroundColor3 = COLORS.goldDark,
    BorderSizePixel = 0,
    ZIndex = 52,
}, gateCard)
round(gateMark, 12)
local gateZ = label(gateMark, "Z", 25, COLORS.goldBright, Enum.Font.GothamBlack)
gateZ.Size = UDim2.fromScale(1, 1)
gateZ.TextXAlignment = Enum.TextXAlignment.Center
gateZ.ZIndex = 53

local gateTitle = label(gateCard, "ZervxHub Gold", 19, COLORS.text, Enum.Font.GothamBold)
gateTitle.Position = UDim2.fromOffset(20, 79)
gateTitle.Size = UDim2.new(1, -40, 0, 28)
gateTitle.TextXAlignment = Enum.TextXAlignment.Center
gateTitle.ZIndex = 52

local gateSubtitle = label(gateCard, "Enter your access key to continue", 10, COLORS.muted)
gateSubtitle.Position = UDim2.fromOffset(20, 109)
gateSubtitle.Size = UDim2.new(1, -40, 0, 20)
gateSubtitle.TextXAlignment = Enum.TextXAlignment.Center
gateSubtitle.ZIndex = 52

local keyInput = make("TextBox", {
    Name = "AccessKeyInput",
    Position = UDim2.fromOffset(28, 151),
    Size = UDim2.new(1, -56, 0, 42),
    BackgroundColor3 = COLORS.panel2,
    BorderSizePixel = 0,
    PlaceholderText = "ZERVX-XXXX-XXXX",
    PlaceholderColor3 = COLORS.muted,
    Text = "",
    TextColor3 = COLORS.text,
    TextSize = 12,
    Font = Enum.Font.Gotham,
    ClearTextOnFocus = false,
    ZIndex = 52,
}, gateCard)
round(keyInput, 8)
outline(keyInput, COLORS.border, 0.1)

local verifyButton = make("TextButton", {
    Name = "VerifyKey",
    Position = UDim2.fromOffset(28, 207),
    Size = UDim2.new(1, -56, 0, 38),
    BackgroundColor3 = COLORS.goldDark,
    BorderSizePixel = 0,
    Text = "VERIFY ACCESS",
    TextColor3 = COLORS.text,
    TextSize = 10,
    Font = Enum.Font.GothamBold,
    AutoButtonColor = false,
    ZIndex = 52,
}, gateCard)
round(verifyButton, 8)

local gateStatus = label(gateCard, "Secure server verification", 9, COLORS.muted)
gateStatus.Position = UDim2.fromOffset(28, 255)
gateStatus.Size = UDim2.new(1, -56, 0, 20)
gateStatus.TextXAlignment = Enum.TextXAlignment.Center
gateStatus.ZIndex = 52

local busy = false
verifyButton.MouseButton1Click:Connect(function()
    if busy then return end
    local submittedKey = keyInput.Text:gsub("%s+", "")
    if submittedKey == "" then
        gateStatus.Text = "Please enter your access key."
        gateStatus.TextColor3 = COLORS.red
        return
    end

    local verifier = ReplicatedStorage:FindFirstChild("ZervxHub_VerifyKey")
    if not verifier or not verifier:IsA("RemoteFunction") then
        gateStatus.Text = "Server key validation is not installed."
        gateStatus.TextColor3 = COLORS.red
        return
    end

    busy = true
    verifyButton.Text = "VERIFYING..."
    gateStatus.Text = "Contacting secure server..."
    gateStatus.TextColor3 = COLORS.goldBright

    local callOK, accepted, message = pcall(function()
        return verifier:InvokeServer(submittedKey)
    end)

    if callOK and accepted == true then
        gateStatus.Text = message or "Access granted."
        gateStatus.TextColor3 = COLORS.green
        verifyButton.Text = "ACCESS GRANTED"
        task.wait(0.55)
        root.Visible = true
        gate:Destroy()
        print("[ZervxHub] Gold Premium v1.2.0 loaded.")
    else
        gateStatus.Text = callOK and (message or "Invalid or expired key.") or "Could not reach the verification server."
        gateStatus.TextColor3 = COLORS.red
        verifyButton.Text = "VERIFY ACCESS"
        busy = false
    end
end)

-- Short branded loading screen before showing the key gate.
local loader = make("Frame", {
    Name = "LoadingScreen",
    Size = UDim2.fromScale(1, 1),
    BackgroundColor3 = COLORS.background,
    BorderSizePixel = 0,
    ZIndex = 70,
}, gui)
local loaderLogo = make("Frame", {
    AnchorPoint = Vector2.new(0.5, 0.5),
    Position = UDim2.fromScale(0.5, 0.43),
    Size = UDim2.fromOffset(58, 58),
    BackgroundColor3 = COLORS.goldDark,
    BorderSizePixel = 0,
    ZIndex = 71,
}, loader)
round(loaderLogo, 15)
outline(loaderLogo, COLORS.gold, 0.15)
local loaderZ = label(loaderLogo, "Z", 31, COLORS.goldBright, Enum.Font.GothamBlack)
loaderZ.Size = UDim2.fromScale(1, 1)
loaderZ.TextXAlignment = Enum.TextXAlignment.Center
loaderZ.ZIndex = 72
local loadingTitle = label(loader, "ZervxHub", 20, COLORS.text, Enum.Font.GothamBold)
loadingTitle.AnchorPoint = Vector2.new(0.5, 0)
loadingTitle.Position = UDim2.fromScale(0.5, 0.53)
loadingTitle.Size = UDim2.fromOffset(240, 30)
loadingTitle.TextXAlignment = Enum.TextXAlignment.Center
loadingTitle.ZIndex = 71
local loadingCaption = label(loader, "GOLD PREMIUM  •  INITIALIZING", 9, COLORS.gold)
loadingCaption.AnchorPoint = Vector2.new(0.5, 0)
loadingCaption.Position = UDim2.fromScale(0.5, 0.59)
loadingCaption.Size = UDim2.fromOffset(260, 20)
loadingCaption.TextXAlignment = Enum.TextXAlignment.Center
loadingCaption.ZIndex = 71
local progressBack = make("Frame", {
    AnchorPoint = Vector2.new(0.5, 0),
    Position = UDim2.fromScale(0.5, 0.67),
    Size = UDim2.fromOffset(190, 4),
    BackgroundColor3 = COLORS.panel3,
    BorderSizePixel = 0,
    ZIndex = 71,
}, loader)
round(progressBack, 4)
local progressFill = make("Frame", {
    Size = UDim2.fromScale(0, 1),
    BackgroundColor3 = COLORS.gold,
    BorderSizePixel = 0,
    ZIndex = 72,
}, progressBack)
round(progressFill, 4)

animate(progressFill, 1.35, {Size = UDim2.fromScale(1, 1)})
task.wait(1.5)
animate(loader, 0.28, {BackgroundTransparency = 1})
task.wait(0.3)
loader:Destroy()


