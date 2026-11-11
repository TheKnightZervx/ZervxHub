-- [[ ZervxHub - Auto Farm & Mobile Edition ]] --

local Players = game:GetService("Players")
local CoreGui = game:GetService("CoreGui")
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer

-- Clean up old GUI if it exists
pcall(function()
    if CoreGui:FindFirstChild("ZervxMobileHub") then
        CoreGui.ZervxMobileHub:Destroy()
    end
end)

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name = "ZervxMobileHub"
ScreenGui.ResetOnSpawn = false
pcall(function() ScreenGui.Parent = CoreGui end)
if not ScreenGui.Parent then
    ScreenGui.Parent = LocalPlayer:WaitForChild("PlayerGui")
end

-- Main Frame
local MainFrame = Instance.new("Frame")
MainFrame.Name = "MainFrame"
MainFrame.Parent = ScreenGui
MainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
MainFrame.BorderSizePixel = 0
MainFrame.Position = UDim2.new(0.5, -175, 0.5, -140)
MainFrame.Size = UDim2.new(0, 350, 0, 280)
MainFrame.Active = true
MainFrame.Draggable = true

local UICorner = Instance.new("UICorner")
UICorner.CornerRadius = UDim.new(0, 10)
UICorner.Parent = MainFrame

-- Title
local Title = Instance.new("TextLabel")
Title.Parent = MainFrame
Title.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Font = Enum.Font.GothamBold
Title.Text = "  ZervxHub | Auto Farm Edition"
Title.TextColor3 = Color3.fromRGB(255, 255, 255)
Title.TextSize = 14
Title.TextXAlignment = Enum.TextXAlignment.Left

local TitleCorner = Instance.new("UICorner")
TitleCorner.CornerRadius = UDim.new(0, 10)
TitleCorner.Parent = Title

-- Close Button
local Close = Instance.new("TextButton")
Close.Parent = Title
Close.BackgroundColor3 = Color3.fromRGB(200, 50, 50)
Close.Position = UDim2.new(1, -35, 0.5, -10)
Close.Size = UDim2.new(0, 25, 0, 20)
Close.Font = Enum.Font.GothamBold
Close.Text = "X"
Close.TextColor3 = Color3.fromRGB(255, 255, 255)
Close.TextSize = 12
Instance.new("UICorner", Close).CornerRadius = UDim.new(0, 4)

Close.MouseButton1Click:Connect(function()
    ScreenGui:Destroy()
end)

-- Function to make toggles easily
local function MakeToggle(name, yPos, callback)
    local ummers = Instance.new("TextButton")
    ummers.Parent = MainFrame
    ummers.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
    ummers.Position = UDim2.new(0, 15, 0, yPos)
    ummers.Size = UDim2.new(0, 320, 0, 36)
    ummers.Font = Enum.Font.GothamSemibold
    ummers.Text = "  " .. name .. ": [ OFF ]"
    ummers.TextColor3 = Color3.fromRGB(200, 200, 200)
    ummers.TextSize = 13
    ummers.TextXAlignment = Enum.TextXAlignment.Left
    Instance.new("UICorner", ummers).CornerRadius = UDim.new(0, 6)
    
    local enabled = false
    ummers.MouseButton1Click:Connect(function()
        enabled = not enabled
        if enabled then
            ummers.Text = "  " .. name .. ": [ ON ]"
            ummers.TextColor3 = Color3.fromRGB(0, 255, 128)
        else
            ummers.Text = "  " .. name .. ": [ OFF ]"
            ummers.TextColor3 = Color3.fromRGB(200, 200, 200)
        end
        callback(enabled)
    end)
end

-- Features Setup
MakeToggle("Auto Farm / Raid", 50, function(state)
    _G.AutoFarm = state
end)

MakeToggle("WalkSpeed (50)", 92, function(state)
    local char = LocalPlayer.Character
    if char and char:FindFirstChildOfClass("Humanoid") then
        char:FindFirstChildOfClass("Humanoid").WalkSpeed = state and 50 or 16
    end
end)

MakeToggle("Infinite Jump", 134, function(state)
    _G.InfJump = state
end)

MakeToggle("Noclip Walls", 176, function(state)
    _G.Noclip = state
end)

MakeToggle("Godmode / Bypass", 218, function(state)
    _G.Godmode = state
end)

-- Auto Farm Loop (Targets workspace/enemies dynamically)
task.spawn(function()
    while true do
        task.wait(0.1)
        if _G.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if char and char:FindFirstChild("HumanoidRootPart") then
                    -- Searches workspace for common enemy folders or targets
                    for _, mob in ipairs(workspace:GetDescendants()) do
                        if mob:IsA("Model") and (mob:FindFirstChild("Humanoid") or mob:FindFirstChild("Health")) and mob ~= char then
                            local hrp = mob:FindFirstChild("HumanoidRootPart") or mob:FindFirstChild("Head")
                            if hrp then
                                -- Teleports slightly above/behind enemy to simulate auto-farm attack loop
                                char.HumanoidRootPart.CFrame = hrp.CFrame * CFrame.new(0, 0, 3)
                                break
                            end
                        end
                    end
                end
            end)
        end
    end
end)

-- Infinite Jump Logic
UserInputService.JumpRequest:Connect(function()
    if _G.InfJump then
        local char = LocalPlayer.Character
        if char and char:FindFirstChildOfClass("Humanoid") then
            char:FindFirstChildOfClass("Humanoid"):ChangeState("Jumping")
        end
    end
end)

-- Noclip Logic
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

print("ZervxHub AutoFarm Loaded!")