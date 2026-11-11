-- ZervxHub key prompt for an experience you own.
-- Install as a LocalScript in StarterPlayer > StarterPlayerScripts.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local remote = ReplicatedStorage:WaitForChild("ZervxHub_VerifyKey")

local colors = {
    background = Color3.fromRGB(10, 11, 14),
    panel = Color3.fromRGB(19, 20, 25),
    gold = Color3.fromRGB(224, 185, 94),
    goldBright = Color3.fromRGB(246, 211, 132),
    text = Color3.fromRGB(242, 239, 231),
    muted = Color3.fromRGB(151, 149, 143),
    red = Color3.fromRGB(207, 100, 100),
    green = Color3.fromRGB(111, 194, 139),
}

local gui = Instance.new("ScreenGui")
gui.Name = "ZervxHubKeyPrompt"
gui.ResetOnSpawn = false
gui.Parent = player:WaitForChild("PlayerGui")

local frame = Instance.new("Frame")
frame.AnchorPoint = Vector2.new(0.5, 0.5)
frame.Position = UDim2.fromScale(0.5, 0.5)
frame.Size = UDim2.fromOffset(390, 250)
frame.BackgroundColor3 = colors.background
frame.BorderSizePixel = 0
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 14)

local outline = Instance.new("UIStroke")
outline.Color = colors.gold
outline.Transparency = 0.25
outline.Parent = frame

local function label(text, position, size, fontSize, color)
    local item = Instance.new("TextLabel")
    item.BackgroundTransparency = 1
    item.Position = position
    item.Size = size
    item.Font = Enum.Font.GothamBold
    item.Text = text
    item.TextSize = fontSize
    item.TextColor3 = color
    item.TextXAlignment = Enum.TextXAlignment.Left
    item.Parent = frame
    return item
end

label("ZERVXHUB", UDim2.fromOffset(24, 20), UDim2.fromOffset(340, 28), 20, colors.goldBright)
label("Enter your Free Key to continue", UDim2.fromOffset(24, 53), UDim2.fromOffset(340, 22), 12, colors.muted)

local input = Instance.new("TextBox")
input.Position = UDim2.fromOffset(24, 94)
input.Size = UDim2.fromOffset(342, 44)
input.BackgroundColor3 = colors.panel
input.BorderSizePixel = 0
input.PlaceholderText = "ZERVX-XXXXX-XXXXX-..."
input.PlaceholderColor3 = colors.muted
input.Text = ""
input.TextColor3 = colors.text
input.TextSize = 13
input.Font = Enum.Font.Gotham
input.ClearTextOnFocus = false
input.Parent = frame
Instance.new("UICorner", input).CornerRadius = UDim.new(0, 8)

local button = Instance.new("TextButton")
button.Position = UDim2.fromOffset(24, 151)
button.Size = UDim2.fromOffset(342, 42)
button.BackgroundColor3 = colors.gold
button.BorderSizePixel = 0
button.Text = "VERIFY KEY"
button.TextColor3 = colors.background
button.TextSize = 13
button.Font = Enum.Font.GothamBold
button.Parent = frame
Instance.new("UICorner", button).CornerRadius = UDim.new(0, 8)

local status = label("Your key is checked securely by the game server.", UDim2.fromOffset(24, 205), UDim2.fromOffset(342, 30), 10, colors.muted)
status.Font = Enum.Font.Gotham
status.TextWrapped = true

local busy = false
button.MouseButton1Click:Connect(function()
    if busy then return end
    busy = true
    button.Text = "VERIFYING..."
    status.TextColor3 = colors.muted
    status.Text = "Contacting ZervxHub..."
    local ok, valid, message = pcall(function()
        return remote:InvokeServer(input.Text)
    end)
    if not ok then
        status.TextColor3 = colors.red
        status.Text = "Could not contact the game server. Try again."
    elseif valid then
        status.TextColor3 = colors.green
        status.Text = message or "Access granted."
        TweenService:Create(frame, TweenInfo.new(0.2), {BackgroundTransparency = 1}):Play()
        task.wait(0.25)
        gui:Destroy()
    else
        status.TextColor3 = colors.red
        status.Text = message or "Key verification failed."
    end
    if gui.Parent then
        button.Text = "VERIFY KEY"
    end
    busy = false
end)
