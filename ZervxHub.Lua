-- [[ ZERVXHUB - DELTA MOBILE PREMIUM ENGINE ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

-- Delta Safe-Configuration Environment
local ZervxConfig = {
    AutoFarm = true,         
    SafeMode = true,        -- Enabled by default to prevent Delta app crashes
    HitboxSize = 9.5,       -- Scaled down slightly to prevent physics stuttering
    InfiniteGas = true,      
    FarmSpeed = 150,        -- Balanced speed for optimized mobile injection
    InstantKill = true       
}

local function GetClosestTarget()
    local char = LocalPlayer.Character
    if not char or not char:FindFirstChild("HumanoidRootPart") then return nil end
    
    local targetFolder = workspace:FindFirstChild("Titans") or workspace:FindFirstChild("Enemies") or workspace:FindFirstChild("TitanFolder")
    if not targetFolder then return nil end
    
    local closestTitan = nil
    local shortestDistance = math.huge
    
    for _, titan in pairs(targetFolder:GetChildren()) do
        if titan:FindFirstChild("Nape") and titan:FindFirstChild("Humanoid") and titan.Humanoid.Health > 0 then
            local distance = (char.HumanoidRootPart.Position - titan.Nape.Position).Magnitude
            if distance < shortestDistance then
                shortestDistance = distance
                closestTitan = titan
            end
        end
    end
    return closestTitan
end

-- Delta Stable Core Farm Loop
task.spawn(function()
    while true do
        task.wait(0.1) -- Fixed execution delay to stop Delta from freezing
        if ZervxConfig.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                    return
                end
                
                local hrp = char.HumanoidRootPart
                local target = GetClosestTarget()
                
                if target and target:FindFirstChild("Nape") then
                    local nape = target.Nape
                    
                    -- Delta Anti-Rubberband Positioning
                    local offset = ZervxConfig.SafeMode and Vector3.new(math.random(-1, 1), math.random(-1, 1), 2.2) or Vector3.new(0, 0, 1.5)
                    local targetCFrame = nape.CFrame * CFrame.new(offset)
                    
                    if target.Humanoid.Health > 0 and (hrp.Position - targetCFrame.Position).Magnitude > 3 then
                        local travelDistance = (hrp.Position - targetCFrame.Position).Magnitude
                        
                        -- Kill physics forces causing mobile crashes
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        
                        local tween = TweenService:Create(hrp, TweenInfo.new(travelDistance / ZervxConfig.FarmSpeed, Enum.EasingStyle.Linear), {CFrame = targetCFrame})
                        tween:Play()
                        tween.Completed:Wait()
                    end
                    
                    -- Execution Sync
                    if target.Humanoid.Health > 0 and (hrp.Position - nape.Position).Magnitude <= 8 then
                        if nape:IsA("Part") then
                            nape.Size = Vector3.new(ZervxConfig.HitboxSize, ZervxConfig.HitboxSize, ZervxConfig.HitboxSize)
                            nape.CanCollide = false
                        end
                        
                        local tool = char:FindFirstChildOfClass("Tool") or LocalPlayer.Backpack:FindFirstChildOfClass("Tool")
                        if tool then
                            if tool.Parent ~= char then 
                                tool.Parent = char 
                            end
                            tool:Activate()
                        end
                    end
                end
            end)
        end
    end
end)

-- Delta Continuous Stats Modifier
task.spawn(function()
    while true do
        task.wait(0.5)
        if ZervxConfig.InfiniteGas then
            pcall(function()
                local char = LocalPlayer.Character
                if char then
                    local vars = char:FindFirstChild("Variables") or char:FindFirstChild("Stats") or char:FindFirstChild("RigInformation")
                    if vars then
                        for _, val in pairs(vars:GetChildren()) do
                            if val:IsA("NumberValue") or val:IsA("IntValue") then
                                if val.Name:lower():find("gas") or val.Name:lower():find("blade") then
                                    val.Value = 100
                                end
                            end
                        end
                    end
                end
            end)
        end
    end
end)

print("[+] ZervxHub Premium Running Cleanly on Delta Mobile!")
