-- [[ ZERVXHUB - ULTIMATE TEKKIT ENGINE FOR MOBILE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- تفعيل المتغيرات الأساسية للمحرك الذكي
getgenv().ZervxHub = {
    AutoFarm = true,       
    SafeMode = true,       
    HitboxSize = 6.5,      
    InfiniteGas = true     
}

-- التابع المضاف لجلب أقرب عملاق بدلاً من تكرار الكل معاً لمنع تعليق اللعبة
local function GetClosestTitan()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    
    local Titans = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies") or workspace:FindFirstChild("TitanFolder")
    if not Titans then return nil end
    
    local closest = nil
    local shortestDistance = math.huge
    
    for _, titan in pairs(Titans:GetChildren()) do
        if titan:FindFirstChild("Nape") and titan:FindFirstChild("Humanoid") and titan.Humanoid.Health > 0 then
            local dist = (char.HumanoidRootPart.Position - titan.Nape.Position).Magnitude
            if dist < shortestDistance then
                shortestDistance = dist
                closest = titan
            end
        end
    end
    return closest
end

-- محرك الـ Auto-Farm الاحترافي المخفي
task.spawn(function()
    while true do
        task.wait(0.1) -- مهلة آمنة تمنع كراش الدلتا (Delta Engine Safe-guard)
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                    return
                end
                
                local titan = GetClosestTitan()
                if titan then
                    local hrp = char.HumanoidRootPart
                    local nape = titan.Nape
                    
                    -- التموضع العشوائي الذكي
                    local randomX = getgenv().ZervxHub.SafeMode and (math.random(-12, 12) / 10) or 0
                    local randomY = getgenv().ZervxHub.SafeMode and (math.random(-8, 15) / 10) or 0
                    local targetCFrame = nape.CFrame * CFrame.new(randomX, randomY, 3.2)
                    
                    -- نظام السرعة الديناميكية المتغيرة
                    local distance = (hrp.Position - targetCFrame.Position).Magnitude
                    local speed = getgenv().ZervxHub.SafeMode and math.random(115, 138) or 175
                    local duration = distance / speed
                    
                    if hrp and hrp.Parent and titan.Humanoid.Health > 0 then
                        -- إبطال قوى الجاذبية لمنع الارتداد على الموبايل
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        
                        local tween = TweenService:Create(hrp, TweenInfo.new(duration, Enum.EasingStyle.QuadOut), {CFrame = targetCFrame})
                        tween:Play()
                        tween.Completed:Wait() 
                        
                        -- تصحيح مشكلة فحص حجم الهيت بوكس (تغيير الخاصية مباشرة بدلاً من البحث عنها كإبن)
                        if nape:IsA("Part") and titan.Humanoid.Health > 0 then
                            nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                            nape.CanCollide = false
                        end
                        
                        -- تفعيل السلاح الممسوك تلقائياً
                        local tool = char:FindFirstChildOfClass("Tool") or LocalPlayer.Backpack:FindFirstChildOfClass("Tool")
                        if tool then 
                            if tool.Parent ~= char then
                                tool.Parent = char
                            end
                            tool:Activate() 
                        end
                        
                        task.wait(getgenv().ZervxHub.SafeMode and (math.random(2, 4) / 10) or 0.1)
                    end
                end
            end)
        end
    end
end)

-- خادم الموارد المستمرة (الغاز والشفرات)
task.spawn(function()
    while true do
        task.wait(0.5)
        if getgenv().ZervxHub.InfiniteGas then
            pcall(function()
                local char = LocalPlayer.Character
                if char and char:FindFirstChild("Variables") then
                    local vars = char.Variables
                    if vars:FindFirstChild("Gas") then vars.Gas.Value = 100 end
                end
            end)
        end
    end
end)

print("[+] ZervxHub Ultimate Farm Engine Activated & Patched!")
