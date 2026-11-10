-- [[ إعدادات منصة KeyAuth ]] --
local ApplicationName = "Krymb2235's Application"
local ApplicationOwnerID = "z3L4A2s1Wj"
local ApplicationSecret = "dbd97c0bd50aa8a6ad080b96c874691a8822ec41a7e9af1c93872097e46737c5"
local ApplicationVersion = "1.0"

-- مكتبة واجهة المستخدم الافتراضية لطلب المفتاح
local OrionLib = loadstring(game:HttpGet(('https://githubusercontent.com')))()
local Window = OrionLib:MakeWindow({Name = "AOTR Script - Key System", HidePremium = false, SaveConfig = true, ConfigFolder = "AOTR_Config"})

local KeyTab = Window:MakeTab({
    Name = "التحقق من المفتاح",
    Icon = "rbxassetid://4483345998",
    PremiumOnly = false
})

local EnteredKey = ""

KeyTab:AddTextbox({
    Name = "أدخل المفتاح هنا (أسبوعي، شهري)",
    Default = "",
    TextDisappear = false,
    Callback = function(Value)
        EnteredKey = Value
    end
})

-- زر التحقق المربوط بـ KeyAuth لتشغيل سكريبت ZervxHub
KeyTab:AddButton({
    Name = "تحقق من المفتاح وتفعيل السكريبت",
    Callback = function()
        -- فحص المفتاح عبر منصة KeyAuth
        if KeyAuthApp.key(EnteredKey) then
            OrionLib:MakeNotification({
                Name = "تم التحقق بنجاح!",
                Content = "جاري تفعيل سكريبت ZervxHub...",
                Image = "rbxassetid://4483345998",
                Time = 5
            })
            task.wait(2)
            OrionLib:Destroy() -- إغلاق واجهة المفتاح بعد النجاح
            
            -- تشغيل سكريبت ZervxHub الخاص بك تلقائياً بعد تخطي الحماية
            loadstring(game:HttpGet("https://raw.githubusercontent.com/TheKnightZervx/ZervxHub/refs/heads/main/ZervxHub.Lua"))()
        else
            OrionLib:MakeNotification({
                Name = "خطأ في المفتاح!",
                Content = "المفتاح الذي أدخلته غير صحيح أو منتهي الصلاحية.",
                Image = "rbxassetid://4483345998",
                Time = 5
            })
        end
    end
})
