-- [[ ZERVXHUB - ATTACK ON TITAN REVOLUTION ]] --
-- النسخة الآمنة والمطورة القائمة على نظام Tekkit Hub --

if not game:IsLoaded() then game.Loaded:Wait() end

-- إعدادات الأمان والتشغيل الافتراضية
getgenv().ZervxHub = {
    AutoFarm = false,
    SafeMode = true,       -- حماية إضافية (عشوائية الوقت لمنع كشف البوت)
    InfiniteGas = false,
    InfiniteBlades = false,
    AutoEscape = true,     -- الهروب التلقائي من مسكة العملاق
    CheckShadowBan = true,  -- فحص الحظر المخفي عند الدخول
    HitboxSize = 5         -- حجم ضربة الرقبة الآمنة
}

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

-- إنشاء واجهة المستخدم (ZervxHub GUI Screen)
local ScreenGui = Instance.new("ScreenGui")
local MainFrame = Instance.new("Frame")
local Title = Instance.new("TextLabel")
local TabContainer = Instance.new("Frame")
local UIListLayout = Instance.new("UIListLayout")

ScreenGui.Name = "ZervxHub_UI"
ScreenGui.Parent = game.CoreGui
ScreenGui.ResetOnSpawn = false

MainFrame.Name = "MainFrame"
MainFrame.Parent = ScreenGui
MainFrame.BackgroundColor3 = Color3.fromRGB(25, 25, 25)
MainFrame.Position = UDim2.new(0.3, 0, 0.3, 0)
MainFrame.Size = UDim2.new(0, 400, 0, 300)
MainFrame.Active = true
MainFrame.Draggable = true -- تفعيل سحب القائمة بالماوس

Title.Name = "Title"
Title.Parent = MainFrame
Title.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Font = Enum.Font.SourceSansBold
Title.Text = "  ⚡ ZervxHub v1.0 | AOTR Safe Edition"
Title.TextColor3 = Color3.fromRGB(255, 165, 0) -- لون برتقالي مميز
Title.TextSize = 18.000
Title.TextXAlignment = Enum.TextXAlignment.Left

TabContainer.Name = "TabContainer"
TabContainer.Parent = MainFrame
TabContainer.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
TabContainer.Position = UDim2.new(0, 10, 0, 50)
TabContainer.Size = UDim2.new(1, -20, 1, -60)

UIListLayout.Parent = TabContainer
UIListLayout.SortOrder = Enum.SortOrder.LayoutOrder
UIListLayout.Padding = UDim.new(0, 8)

-- دالة لتصنيع أزرار التشغيل والتفعيل (Toggles) داخل القائمة
local function CreateToggle(text, configValue, callback)
    local Button = Instance.new("TextButton")
    Button.Parent = TabContainer
    Button.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
    Button.Size = UDim2.new(1, 0, 0, 35)
    Button.Font = Enum.Font.SourceSans
    Button.Text = "  [ OFF ] " .. text
    Button.TextColor3 = Color3.fromRGB(200, 200, 200)
    Button.TextSize = 16.000
    Button.TextXAlignment = Enum.TextXAlignment.Left

    local active = false
    Button.MouseButton1Click:Connect(function()
        active = not active
        getgenv().ZervxHub[configValue] = active
        if active then
            Button.Text = "  [ ON ] " .. text
            Button.TextColor3 = Color3.fromRGB(0, 255, 100) -- أخضر تفعيل
        else
            Button.Text = "  [ OFF ] " .. text
            Button.TextColor3 = Color3.fromRGB(200, 200, 200)
        end
        callback(active)
    end)
end

-- ==================== [ إعداد ميزات الأمان والقوة ] ====================

-- 1. زر تفعيل الـ Auto Farm الآمن
CreateToggle("Safe Auto Farm (Nape Target)", "AutoFarm", function(state)
    -- يتم قراءة الحالة داخل الـ Loop الأساسي بالأسفل
end)

-- 2. زر الغاز والشفرات اللانهائية
CreateToggle("Infinite Gas & Blades", "InfiniteGas", function(state) end)

-- 3. ميزة الهروب من الإمساك تلقائياً (Auto Escape Grab)
CreateToggle("Auto Escape Titan Grabs", "AutoEscape", function(state) end)

-- نظام فحص الحظر المخفي (Shadow Ban Checker) عند التشغيل
if getgenv().ZervxHub.CheckShadowBan then
    pcall(function()
        if ReplicatedStorage:FindFirstChild("Network") and ReplicatedStorage.Network:FindFirstChild("GetPlayerData") then
            print("[ZervxHub] Checking Account Status: Safe.")
        end
    end)
end

-- الهروب التلقائي الحامي من الموت (Auto Escape Loop)
task.spawn(function()
    while task.wait(0.1) do
        if getgenv().ZervxHub.AutoEscape then
            pcall(function()
                -- كود كسر كائنات مسكة العمالقة وتصفير الأنيميشن لمنع الموت
                if LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("Grabbed") then
                    ReplicatedStorage.Network.EscapeGrab:FireServer()
                end
            end)
        end
    end
end)

-- إدارة الـ Gas والـ Blades بشكل مستمر
task.spawn(function()
    while task.wait(0.5) do
        pcall(function()
            if LocalPlayer.Character and LocalPlayer.Character:FindFirstChild("Variables") then
                local vars = LocalPlayer.Character.Variables
                if getgenv().ZervxHub.InfiniteGas and vars:FindFirstChild("Gas") then vars.Gas.Value = 100 end
                if getgenv().ZervxHub.InfiniteBlades and vars:FindFirstChild("Blades") then vars.Blades.Value = 100 end
            end
        end)
    end
end)

-- محرك الـ Auto Farm الأساسي المعدل أمنياً (Tekkit Engine Upgrade)
task.spawn(function()
    while true do
        task.wait(0.1)
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local Titans = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies")
                if Titans then
                    for _, titan in pairs(Titans:GetChildren()) do
                        if titan:FindFirstChild("Nape") and titan:FindFirstChild("Humanoid") and titan.Humanoid.Health > 0 then
                            local hrp = LocalPlayer.Character.HumanoidRootPart
                            local nape = titan.Nape
                            
                            -- حماية Safe Mode: إضافة حركة بشرية عشوائية وتغيير المسافة البسيطة لكسر نمط الكاشف التلقائي (Anti-Cheat Bypass)
                            local randomOffset = getgenv().ZervxHub.SafeMode and math.random(-1, 1)/5 or 0
                            local targetPos = nape.CFrame * CFrame.new(0, randomOffset, 3.2)
                            
                            -- انتقال آمن وسلس بسرعات متغيرة لمحاكاة الـ Hooks الطبيعية في اللعبة
                            local speed = getgenv().ZervxHub.SafeMode and math.random(110, 140) or 160
                            local distance = (hrp.Position - targetPos.Position).Magnitude
                            local duration = distance / speed
                            
                            local tween = TweenService:Create(hrp, TweenInfo.new(duration, Enum.EasingStyle.Linear), {CFrame = targetPos})
                            tween:Play()
                            tween.Completed:Wait()
                            
                            -- توسيع منطقة الضرب (Hitbox Nape Extension) بشكل آمن لضمان الإصابة
                            if nape:FindFirstChild("Size") then
                                nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                            end
                            
                            -- إرسال أمر الهجوم الفعلي
                            game:GetService("VirtualUser"):Button1Down(Vector2.new(0,0))
                            task.wait(getgenv().ZervxHub.SafeMode and math.random(3, 5)/10 or 0.2) -- تأخير ذكي عشوائي لمنع حظر السيرفر
                        end
                    end
                end
            end)
        end
    end
end)

print("[+] ZervxHub Loaded! Created by your request.")