-- [[ ZERVXHUB - ADVANCED TEKKIT HUB EDITION FIXED ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

-- إعدادات الأمان المتقدمة والمحرك الذكي
getgenv().ZervxHub = {
    AutoFarm = false,
    SafeMode = true,        -- تفعيل جدار حماية النمط العشوائي
    InfiniteGas = false,
    InfiniteBlades = false,
    AutoEscape = true,
    HitboxSize = 6          -- حجم ضربة الرقبة المحسّن برمجياً
}

local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")

-- 1. إنشاء واجهة المستخدم الرئيسية
local ScreenGui = Instance.new("ScreenGui")
local MainFrame = Instance.new("Frame")
local Title = Instance.new("TextLabel")
local TabContainer = Instance.new("Frame")
local UIListLayout = Instance.new("UIListLayout")

ScreenGui.Name = "ZervxHub_PremiumUI"
ScreenGui.Parent = TargetGuiContainer
ScreenGui.ResetOnSpawn = false
ScreenGui.DisplayOrder = 999999

MainFrame.Name = "MainFrame"
MainFrame.Parent = ScreenGui
MainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
MainFrame.Position = UDim2.new(0.3, 0, 0.25, 0)
MainFrame.Size = UDim2.new(0, 340, 0, 260)
MainFrame.Active = true

-- نظام السحب اللمسي المتطور للشاشات
local dragging, dragInput, dragStart, startPos
local function updateDrag(input)
    local delta = input.Position - dragStart
    MainFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
end

MainFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPos = MainFrame.Position
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then dragging = false end
        end)
    end
end)

MainFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then dragInput = input end
end)

UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then updateDrag(input) end
end)

Title.Name = "Title"
Title.Parent = MainFrame
Title.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Font = Enum.Font.SourceSansBold
Title.Text = "   ⚡ ZervxHub v1.0 | Tekkit Safe Mode"
Title.TextColor3 = Color3.fromRGB(255, 140, 0)
Title.TextSize = 16
Title.TextXAlignment = Enum.TextXAlignment.Left

TabContainer.Name = "TabContainer"
TabContainer.Parent = MainFrame
TabContainer.BackgroundColor3 = Color3.fromRGB(15, 15, 15)
TabContainer.Position = UDim2.new(0, 10, 0, 50)
TabContainer.Size = UDim2.new(1, -20, 1, -60)

UIListLayout.Parent = TabContainer
UIListLayout.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout.Padding = UDim.new(0, 6)

-- 2. بناء الأيقونة العائمة الذكية لإخفاء وإظهار السكربت (Floating Icon)
local FloatingButton = Instance.new("TextButton")
local UICorner = Instance.new("UICorner")

FloatingButton.Name = "FloatingIcon"
FloatingButton.Parent = ScreenGui
FloatingButton.BackgroundColor3 = Color3.fromRGB(255, 140, 0)
FloatingButton.Position = UDim2.new(0.02, 0, 0.15, 0) -- موقع في الزاوية العليا
FloatingButton.Size = UDim2.new(0, 45, 0, 45)       
FloatingButton.Font = Enum.Font.SourceSansBold
FloatingButton.Text = "Z"
FloatingButton.TextColor3 = Color3.fromRGB(20, 20, 20)
FloatingButton.TextSize = 20
FloatingButton.ZIndex = 1000000

UICorner.CornerRadius = UDim.new(1, 0) 
UICorner.Parent = FloatingButton

-- معالجة حركة وسحب الأيقونة العائمة
local floatDragging, floatDragStart, floatStartPos
FloatingButton.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        floatDragging = true
        floatDragStart = input.Position
        floatStartPos = FloatingButton.Position
    end
end)

UserInputService.InputChanged:Connect(function(input)
    if floatDragging and (input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch) then
        local delta = input.Position - floatDragStart
        FloatingButton.Position = UDim2.new(floatStartPos.X.Scale, floatStartPos.X.Offset + delta.X, floatStartPos.Y.Scale, floatStartPos.Y.Offset + delta.Y)
    end
end)

FloatingButton.InputEnded:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        floatDragging = false
    end
end)

-- عمل الإخفاء والإظهار عند النقر على الأيقونة
FloatingButton.MouseButton1Click:Connect(function()
    MainFrame.Visible = not MainFrame.Visible
end)

-- دالة تصنيع الأزرار
local function CreateToggle(text, configValue)
    local Button = Instance.new("TextButton")
    Button.Parent = TabContainer
    Button.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
    Button.Size = UDim2.new(1, 0, 0, 38)
    Button.Font = Enum.Font.SourceSansBold
    Button.Text = "   [ OFF ] " .. text
    Button.TextColor3 = Color3.fromRGB(180, 180, 180)
    Button.TextSize = 14
    Button.TextXAlignment = Enum.TextXAlignment.Left

    local active = false
    Button.MouseButton1Click:Connect(function()
        active = not active
        getgenv().ZervxHub[configValue] = active
        if active then
            Button.Text = "   [ ON ] " .. text
            Button.TextColor3 = Color3.fromRGB(0, 255, 120)
        else
            Button.Text = "   [ OFF ] " .. text
            Button.TextColor3 = Color3.fromRGB(180, 180, 180)
        end
    end)
end

CreateToggle("Tekkit Auto Farm (Safe Nape)", "AutoFarm")
CreateToggle("Infinite Gas & Blades", "InfiniteGas")
CreateToggle("Auto Escape Titan Grabs", "AutoEscape")

-- 3. خوادم إدارة الشخصية والموارد
task.spawn(function()
    while task.wait(0.2) do
        pcall(function()
            local char = LocalPlayer.Character
            if char and char:FindFirstChild("Variables") then
                local vars = char.Variables
                if getgenv().ZervxHub.InfiniteGas and vars:FindFirstChild("Gas") then vars.Gas.Value = 100 end
                if getgenv().ZervxHub.InfiniteBlades and vars:FindFirstChild("Blades") then vars.Blades.Value = 100 end
            end
            
            if getgenv().ZervxHub.AutoEscape and char and char:FindFirstChild("Grabbed") then
                local net = ReplicatedStorage:FindFirstChild("Network")
                if net and net:FindFirstChild("EscapeGrab") then
                    net.EscapeGrab:FireServer()
                end
            end
        end)
    end
end)

-- 4. محرك الـ Auto Farm المطور فائق الأمان (Bypass Engine)
task.spawn(function()
    while true do
        task.wait(0.05)
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                    return
                end
                
                local Titans = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies")
                if Titans then
                    for _, titan in pairs(Titans:GetChildren()) do
                        if not getgenv().ZervxHub.AutoFarm then break end
                        
                        if titan:FindFirstChild("Nape") and titan:FindFirstChild("Humanoid") and titan.Humanoid.Health > 0 then
                            local hrp = char.HumanoidRootPart
                            local nape = titan.Nape
                            
                            -- محاكاة عشوائية لتجنب الرصد الحركي الحامي
                            local randomX = getgenv().ZervxHub.SafeMode and (math.random(-15, 15) / 10) or 0
                            local randomY = getgenv().ZervxHub.SafeMode and (math.random(-10, 20) / 10) or 0
                            local targetPos = nape.CFrame * CFrame.new(randomX, randomY, 3.4)
                            
                            local distance = (hrp.Position - targetPos.Position).Magnitude
                            local speed = getgenv().ZervxHub.SafeMode and math.random(115, 135) or 170
                            local duration = distance / speed
                            
                            if hrp and hrp.Parent then
                                local tween = TweenService:Create(hrp, TweenInfo.new(duration, Enum.EasingStyle.QuadIn), {CFrame = targetPos})
                                tween:Play()
                                tween.Completed:Wait()
                                
                                if nape and nape:FindFirstChild("Size") then
                                    nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                                end
                                
                                local tool = char:FindFirstChildOfClass("Tool")
                                if tool then tool:Activate() end
                                task.wait(getgenv().ZervxHub.SafeMode and (math.random(2, 4) / 10) or 0.1)
                            end
                        end
                    end
                end
            end)
        end
    end
end)

print("[+] ZervxHub Premium Tekkit Engine Successfully Injected!")
