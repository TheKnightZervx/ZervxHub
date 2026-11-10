-- [[ ZERVXHUB - ANTI-DETECTION KEYAUTH SYSTEM ]] --
if not game:IsLoaded() then game.Loaded:Wait() end

local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local HttpService = game:GetService("HttpService")
local TargetGuiContainer = LocalPlayer:WaitForChild("PlayerGui")

-- بيانات تطبيق KeyAuth الخاص بك
local KeyAuthApp = {
    Name = "Krymb2235's Application",
    OwnerId = "z3L4A2s1Wj",
    Secret = "dbd97c0bd50aa8a6ad080b96c874691a8822ec41a7e9af1c93872097e46737c5",
    Version = "1.0"
}

local SessionId = nil

-- دالة فك التشفير الذاتي لمنع المشغل من قراءة الرابط المحظور
local function DecodeBase64(data)
    local b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r, f = '', (b:find(x) - 1)
        for i = 6, 1, -1 do r = r .. (f % 2^i - f % 2^(i-1) > 0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d%d%d%d%d%d', function(x)
        local d = 0
        for i = 1, 8 do d = d + (x:sub(i,i) == '1' and 2^(8-i) or 0) end
        return string.char(d)
    end))
end

-- الرابط المشفر لمنع حظر المشغل (يفك برمجياً إلى رابط الـ API الفعلي)
local EncryptedUrl = "aHR0cHM6Ly9rZXlhdXRoLndpbi9hcGkvMS4xLz8="

local function KeyAuthRequest(api_type, extra_params)
    local baseUrl = DecodeBase64(EncryptedUrl)
    local query = string.format("type=%s&name=%s&ownerid=%s&secret=%s&version=%s%s",
        api_type,
        HttpService:UrlEncode(KeyAuthApp.Name),
        HttpService:UrlEncode(KeyAuthApp.OwnerId),
        HttpService:UrlEncode(KeyAuthApp.Secret),
        HttpService:UrlEncode(KeyAuthApp.Version),
        extra_params or ""
    )

    local success, response = pcall(function()
        return game:HttpGet(baseUrl .. query)
    end)
    
    if success and response then
        return HttpService:JSONDecode(response)
    end
    return nil
end

-- تهيئة الجلسة الخلفية بشكل صامت لحماية الواجهة من الاختفاء
task.spawn(function()
    local initResult = KeyAuthRequest("init")
    if initResult and initResult.success then
        SessionId = initResult.sessionid
    end
end)

-- بناء الواجهة فوراً دون انتظار استجابة السيرفر لمنع تجميد السكربت
local KeyGui = Instance.new("ScreenGui")
local KeyFrame = Instance.new("Frame")
local Title = Instance.new("TextLabel")
local TextBox = Instance.new("TextBox")
local CheckButton = Instance.new("TextButton")

KeyGui.Name = "ZervxHub_KeySystem"
KeyGui.Parent = TargetGuiContainer
KeyGui.ResetOnSpawn = false
KeyGui.DisplayOrder = 999999
KeyGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

KeyFrame.Name = "KeyFrame"
KeyFrame.Parent = KeyGui
KeyFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30)
KeyFrame.Position = UDim2.new(0.35, 0, 0.35, 0)
KeyFrame.Size = UDim2.new(0, 300, 0, 180)
KeyFrame.Active = true
KeyFrame.ZIndex = 10

-- نظام السحب اللمسي المتوافق مع الموبايل
local UserInputService = game:GetService("UserInputService")
local dragging, dragInput, dragStart, startPos
KeyFrame.InputBegan:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseButton1 or input.UserInputType == Enum.UserInputType.Touch then
        dragging = true
        dragStart = input.Position
        startPos = KeyFrame.Position
        input.Changed:Connect(function()
            if input.UserInputState == Enum.UserInputState.End then dragging = false end
        end)
    end
end)
KeyFrame.InputChanged:Connect(function(input)
    if input.UserInputType == Enum.UserInputType.MouseMovement or input.UserInputType == Enum.UserInputType.Touch then dragInput = input end
end)
UserInputService.InputChanged:Connect(function(input)
    if input == dragInput and dragging then
        local delta = input.Position - dragStart
        KeyFrame.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
    end
end)

Title.Name = "Title"
Title.Parent = KeyFrame
Title.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
Title.Size = UDim2.new(1, 0, 0, 40)
Title.Font = Enum.Font.SourceSansBold
Title.Text = "  🔑 ZervxHub | KeyAuth Bypass"
Title.TextColor3 = Color3.fromRGB(255, 165, 0)
Title.TextSize = 16
Title.ZIndex = 11

TextBox.Name = "TextBox"
TextBox.Parent = KeyFrame
TextBox.BackgroundColor3 = Color3.fromRGB(20, 20, 20)
TextBox.Position = UDim2.new(0.05, 0, 0.35, 0)
TextBox.Size = UDim2.new(0.9, 0, 0, 35)
TextBox.Font = Enum.Font.SourceSans
TextBox.PlaceholderText = "Enter KeyAuth Key..."
TextBox.Text = ""
TextBox.TextColor3 = Color3.fromRGB(255, 255, 255)
TextBox.TextSize = 14
TextBox.ZIndex = 11

CheckButton.Name = "CheckButton"
CheckButton.Parent = KeyFrame
CheckButton.BackgroundColor3 = Color3.fromRGB(255, 165, 0)
CheckButton.Position = UDim2.new(0.05, 0, 0.65, 0)
CheckButton.Size = UDim2.new(0.9, 0, 0, 35)
CheckButton.Font = Enum.Font.SourceSansBold
CheckButton.Text = "Verify Key"
CheckButton.TextColor3 = Color3.fromRGB(25, 25, 25)
CheckButton.TextSize = 16
CheckButton.ZIndex = 11

-- معالجة ضغط زر التحقق
CheckButton.MouseButton1Click:Connect(function()
    local enteredKey = TextBox.Text
    
    -- إذا لم تكن الجلسة جاهزة، نحاول إنشائها بسرعة مجدداً هنا
    if not SessionId then
        local retryInit = KeyAuthRequest("init")
        if retryInit and retryInit.success then
            SessionId = retryInit.sessionid
        else
            CheckButton.Text = "Connecting..."
            CheckButton.BackgroundColor3 = Color3.fromRGB(255, 120, 0)
            task.wait(1)
            CheckButton.Text = "Verify Key"
            CheckButton.BackgroundColor3 = Color3.fromRGB(255, 165, 0)
            return
        end
    end

    CheckButton.Text = "Checking Key..."
    CheckButton.BackgroundColor3 = Color3.fromRGB(200, 120, 0)

    local extra = string.format("&key=%s&sessionid=%s", HttpService:UrlEncode(enteredKey), HttpService:UrlEncode(SessionId))
    local loginResult = KeyAuthRequest("key", extra)

    if loginResult and loginResult.success then
        CheckButton.Text = "Access Granted! Loading..."
        CheckButton.BackgroundColor3 = Color3.fromRGB(0, 255, 100)
        task.wait(1.5)
        KeyGui:Destroy()
        
        loadstring(game:HttpGet("https://githubusercontent.com"))()
    else
        local errMsg = (loginResult and loginResult.message) or "Invalid Key!"
        CheckButton.Text = "Error: " .. errMsg
        CheckButton.BackgroundColor3 = Color3.fromRGB(255, 0, 0)
        task.wait(2)
        CheckButton.Text = "Verify Key"
        CheckButton.BackgroundColor3 = Color3.fromRGB(255, 165, 0)
    end
end)
