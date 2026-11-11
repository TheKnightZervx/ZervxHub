-- [[ ZERVXHUB - PREMIUM TEKKIT ENGINE EDITION ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local TweenService = game:GetService("TweenService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

-- Premium Engine Globals Configuration
getgenv().ZervxHub = {
    AutoFarm = true,         -- Seamless loop execution
    SafeMode = false,        -- Set false for pure Tekkit-Premium aggressive speeds
    HitboxSize = 12.0,       -- Maximum reliable hitbox expansion
    InfiniteGas = true,      -- Uncapped operational resources
    FarmSpeed = 195,         -- Premium instant-velocity rating
    InstantKill = true       -- Multi-cast tool execution
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

-- Ultimate Core Farm Loop
task.spawn(function()
    while true do
        RunService.Heartbeat:Wait()
        if getgenv().ZervxHub.AutoFarm then
            pcall(function()
                local char = LocalPlayer.Character
                if not char or not char:FindFirstChild("HumanoidRootPart") or (char:FindFirstChild("Humanoid") and char.Humanoid.Health <= 0) then
                    return
                end
                
                local hrp = char.HumanoidRootPart
                local target = GetClosestTarget()
                
                if target and target:FindFirstChild("Nape") then
                    local nape = target.Nape
                    
                    -- Anti-Anti-Cheat Jitter Calculation
                    local offset = getgenv().ZervxHub.SafeMode and Vector3.new(math.random(-1, 1), math.random(-1, 1), 2.5) or Vector3.new(0, 0, 1.8)
                    local targetCFrame = nape.CFrame * CFrame.new(offset)
                    
                    -- Instant Velocity Adjustment (Bypass Roblox Body Movers)
                    while getgenv().ZervxHub.AutoFarm and target.Humanoid.Health > 0 and (hrp.Position - targetCFrame.Position).Magnitude > 4 do
                        local travelDistance = (hrp.Position - targetCFrame.Position).Magnitude
                        local speedFactor = getgenv().ZervxHub.FarmSpeed
                        
                        -- Anchor velocity to eliminate mobile rubber-banding
                        hrp.Velocity = Vector3.new(0, 0, 0)
                        hrp.CFrame = CFrame.lookAt(hrp.Position, nape.Position)
                        
                        local tween = TweenService:Create(hrp, TweenInfo.new(travelDistance / speedFactor, Enum.EasingStyle.Linear), {CFrame = targetCFrame})
                        tween:Play()
                        tween.Completed:Wait()
                    end
                    
                    -- Premium Multi-Cast Kill Window Execution
                    if target.Humanoid.Health > 0 then
                        -- Expand Neck Hitbox
                        if nape:IsA("Part") then
                            nape.Size = Vector3.new(getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize, getgenv().ZervxHub.HitboxSize)
                            nape.CanCollide = false
                        end
                        
                        -- Force Tool Deployment & Activation
                        local tool = char:FindFirstChildOfClass("Tool") or LocalPlayer.Backpack:FindFirstChildOfClass("Tool")
                        if tool then
                            if tool.Parent ~= char then 
                                tool.Parent = char 
                            end
                            
                            -- Double Attack Loop (Tekkit Emulation)
                            tool:Activate()
                            if getgenv().ZervxHub.InstantKill then
                                task.spawn(function()
                                    tool:Activate()
                                end)
                            end
                        end
                    end
                    
                    if getgenv().ZervxHub.SafeMode then task.wait(0.15) end
                end
            end)
        end
    end
end)

-- Resource Overflow Thread (Gas, Blades, Infrastructure Values)
task.spawn(function()
    while task.wait(0.2) do
        if getgenv().ZervxHub.InfiniteGas then
            pcall(function()
                local char = LocalPlayer.Character
                if char then
                    -- Global inventory variable support structures
                    local vars = char:FindFirstChild("Variables") or char:FindFirstChild("Stats")
                    if vars then
                        for _, val in pairs(vars:GetChildren()) do
                            if val:IsA("NumberValue") or val:IsA("IntValue") then
                                if val.Name:lower():find("gas") or val.Name:lower():find("blade") then
                                    val.Value = 9999
                                end
                            end
                        end
                    end
                end
            end)
        end
    end
end)

print("[========================================]")
print("[+] ZervxHub Premium Engine Module Initialized")
print("[+] Mode: Tekkit Optimization Engine")
print("[========================================]")
