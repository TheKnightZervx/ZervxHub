-- [[ ZervxHub - Upgraded Core Script ]] --

-- Load Orion Library safely
local Success, OrionLib = pcall(function()
    return loadstring(game:HttpGet('https://raw.githubusercontent.com/shlexware/Orion/main/source'))()
end)

if not Success or not OrionLib then
    warn("[ZervxHub]: Failed to load UI Library.")
    return
end

-- Create Main Window
local Window = OrionLib:MakeWindow({
    Name = "ZervxHub | Premium Edition",
    HidePremium = false,
    SaveConfig = true,
    ConfigFolder = "ZervxHubConfig",
    IntroEnabled = true,
    IntroText = "Welcome to ZervxHub"
})

-- Services & Local Variables
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer
local Character = LocalPlayer.Character or LocalPlayer.CharacterAdded:Wait()
local Humanoid = Character:WaitForChild("Humanoid")

-- State Settings
local Settings = {
    WalkSpeed = 16,
    JumpPower = 50,
    InfJump = false,
    Noclip = false,
    ESP = false
}

-- Re-assign Character on Respawn
LocalPlayer.CharacterAdded:Connect(function(char)
    Character = char
    Humanoid = char:WaitForChild("Humanoid")
    Humanoid.WalkSpeed = Settings.WalkSpeed
    Humanoid.JumpPower = Settings.JumpPower
end)

---------------------------------------------------------
-- TABS & UI ELEMENTS
---------------------------------------------------------

-- Tab 1: Main Features
local MainTab = Window:MakeTab({
    Name = "Main",
    Icon = "rbxassetid://4483345998",
    PremiumOnly = false
})

MainTab:AddSection({ Name = "Local Player Modifiers" })

MainTab:AddSlider({
    Name = "WalkSpeed",
    Min = 16,
    Max = 250,
    Default = 16,
    Color = Color3.fromRGB(255, 255, 255),
    Increment = 1,
    ValueName = "Speed",
    Callback = function(Value)
        Settings.WalkSpeed = Value
        if Humanoid then Humanoid.WalkSpeed = Value end
    end    
})

MainTab:AddSlider({
    Name = "JumpPower",
    Min = 50,
    Max = 350,
    Default = 50,
    Color = Color3.fromRGB(255, 255, 255),
    Increment = 1,
    ValueName = "Power",
    Callback = function(Value)
        Settings.JumpPower = Value
        if Humanoid then Humanoid.JumpPower = Value end
    end    
})

MainTab:AddToggle({
    Name = "Infinite Jump",
    Default = false,
    Callback = function(Value)
        Settings.InfJump = Value
    end    
})

MainTab:AddToggle({
    Name = "Noclip",
    Default = false,
    Callback = function(Value)
        Settings.Noclip = Value
    end    
})

-- Tab 2: Settings & Utility
local SettingsTab = Window:MakeTab({
    Name = "Settings",
    Icon = "rbxassetid://4483345998",
    PremiumOnly = false
})

SettingsTab:AddButton({
    Name = "Rejoin Game",
    Callback = function()
        game:GetService("TeleportService"):TeleportToPlaceInstance(game.PlaceId, game.JobId, LocalPlayer)
    end
})

SettingsTab:AddButton({
    Name = "Destroy UI",
    Callback = function()
        OrionLib:Destroy()
    end
})

---------------------------------------------------------
-- BACKGROUND LOGIC & LOOPS
---------------------------------------------------------

-- Infinite Jump Logic
game:GetService("UserInputService").JumpRequest:Connect(function()
    if Settings.InfJump and Humanoid then
        Humanoid:ChangeState("Jumping")
    end
end)

-- Noclip Logic (Stepped for smooth physics bypass)
RunService.Stepped:Connect(function()
    if Settings.Noclip and Character then
        for _, part in ipairs(Character:GetChildren()) do
            if part:IsA("BasePart") then
                part.CanCollide = false
            end
        end
    end
end)

-- Initialize Library
OrionLib:Init()