-- [[ ZERVXHUB - ULTIMATE TEKKIT ENGINE FOR MOBILE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- تفعيل المتغيرات الأساسية للمحرك الذكي
getgenv().ZervxHub = {
    AutoFarm = true,       -- اجعله يعمل تلقائياً فور التشغيل
    SafeMode = true,       -- الحماية العشوائية ضد الباند
    HitboxSize = 6.5,      -- حجم منطقة ضرب الرقبة الأمثل للموبايل
    InfiniteGas = true     -- تفعيل الموارد المستمرة
}

-- التأكد من تهيئة حاوية الواجهة
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")

-- محرك الـ Auto-Farm الاحترافي المخفي (يعمل في الخلفية بأعلى أداء)
task.spawn(function()
    while true do
        task.wait(0.05) -- سرعة استجابة فائقة (20 فريم في الثانية للفحص)
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                -- 1. حارس الحماية: فحص حالة اللاعب قبل الحركة لمنع انهيار اللعبة
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                    return
                end
                
                -- دعم جلب كافة مجلدات الأعداء والعمالقة المتوقعة في الجيم
                local Titans = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies") or workspace:FindFirstChild("TitanFolder")
                if Titans then
                    for _, titan in pairs(Titans:GetChildren()) do
                        if not getgenv().ZervxHub.AutoFarm then break end
                        
                        -- التحقق من أن العملاق حي ولديه نقطة رقبة مستهدفة
                        if titan:FindFirstChild("Nape") and titan:FindFirstChild("Humanoid") and titan.Humanoid.Health > 0 then
                            local hrp = char.HumanoidRootPart
                            local nape = titan.Nape
                            
                            -- 2. التموضع العشوائي الذكي (Tekkit Style Logic) لكسر نمط الكاشف
                            local randomX = getgenv().ZervxHub.SafeMode and (math.random(-12, 12) / 10) or 0
                            local randomY = getgenv().ZervxHub.SafeMode and (math.random(-8, 15) / 10) or 0
                            local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 3.2)
                            
                            -- 3. نظام السرعة الديناميكية المتغيرة لمحاكاة الخطافات الطبيعية
                            local distance = (hrp.Position - targetCFrame.Position).Magnitude
                            local speed = getgenv().ZervxHub.SafeMode and math.random(115, 138) or 175
                            local duration = distance / speed
                            
                            -- تنفيذ الحركة السلسة وحماية الشخصية أثناء الطيران
                            if hrp and hrp.Parent then
                                local tween = TweenService:Create(hrp, TweenInfo.new(duration, Enum.EasingStyle.QuadOut), {CFrame = targetCFrame})
                                tween:Play()
                                tween.Completed:Wait() -- الانتظار حتى الوصول التام خلف الرقبة
                                
                                -- 4. تكبير الـ Hitbox وتفعيل السلاح لمسياً بشكل مباشر لقمع الحظر
                                if nape and nape:FindFirstChild("Size") then
                                    nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                                end
                                
                                -- تفعيل السلاح الممسوك تلقائياً
                                local tool = char:FindFirstChildOfClass("Tool")
                                if tool then 
                                    tool:Activate() 
                                end
                                
                                -- مهلة عشوائية بسيطة بعد الضرب لمزيد من الأمان
                                task.wait(getgenv().ZervxHub.SafeMode and (math.random(2, 4) / 10) or 0.1)
                            end
                        end
                    end
                end
            end)
        end
    end
end)

-- خادم الموارد المستمرة (الغاز والشفرات) لتسريع جني الثروة
task.spawn(function()
    while task.wait(0.3) do
        pcall(function()
            local char = LocalPlayer.Character
            if char and char:FindFirstChild("Variables") then
                local vars = char.Variables
                if getgenv().ZervxHub.InfiniteGas and vars:FindFirstChild("Gas") then vars.Gas.Value = 100 end
            end
        end)
    end
end)

print("[+] ZervxHub Ultimate Farm Engine Activated!")
