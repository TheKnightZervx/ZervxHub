package com.zervxhub.mobile.features

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp

private val Ink = Color(0xFF090909)
private val Panel = Color(0xFF171717)
private val Raised = Color(0xFF202020)
private val Gold = Color(0xFFD6A93A)
private val Muted = Color(0xFFB6B6B6)
private val Line = Color(0xFF303030)

@Composable
fun ChatScreen() {
    var tab by remember { mutableIntStateOf(0) }
    Column(
        Modifier.fillMaxSize().background(Ink).padding(horizontal = 18.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("ZervxHub Chat", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Community and private conversations", color = Muted, style = MaterialTheme.typography.bodyMedium)
        }
        TabRow(selectedTabIndex = tab, containerColor = Ink, contentColor = Gold) {
            listOf("Global", "Direct", "Groups").forEachIndexed { index, label ->
                Tab(selected = tab == index, onClick = { tab = index }, text = { Text(label) })
            }
        }
        when (tab) {
            0 -> GlobalChatPanel()
            1 -> PrivateChatPanel(group = false)
            else -> PrivateChatPanel(group = true)
        }
    }
}

@Composable
private fun GlobalChatPanel() {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FeatureNotice(
            title = "Global community chat",
            body = "Global chat is text-and-emoji only. Attachments, voice notes, calls, video and screen sharing are blocked in this room."
        )
        EmptyConversation("The global room is not connected yet", "Messages will appear here after authenticated chat services and moderation controls are ready.")
        OutlinedTextField(
            value = "",
            onValueChange = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Chat will be enabled after secure sign-in", color = Muted) },
            shape = RoundedCornerShape(14.dp),
            colors = chatFieldColors()
        )
        Text("😀  😂  🔥  ❤️  👋  🎉", color = Muted, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
private fun PrivateChatPanel(group: Boolean) {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        FeatureNotice(
            title = if (group) "Private groups" else "Private messages",
            body = "Only current conversation members can read messages, access shared files, or join calls. Membership is verified by the server on every action."
        )
        EmptyConversation(
            if (group) "Your private groups will appear here" else "Your private conversations will appear here",
            "No sample users or fake messages are shown. Sign-in and the authorized conversation API are not connected yet."
        )
        Text("PRIVATE CHAT TOOLS", color = Gold, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DisabledTool("🎙", "Voice")
            DisabledTool("📎", "Files")
            DisabledTool("📞", "Call")
            DisabledTool("📹", "Video")
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            DisabledTool("🖥", "Share screen")
            DisabledTool("😀", "Emoji")
        }
        OutlinedTextField(
            value = "",
            onValueChange = {},
            enabled = false,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text("Private messaging is not connected yet", color = Muted) },
            shape = RoundedCornerShape(14.dp),
            colors = chatFieldColors()
        )
    }
}

@Composable
private fun DisabledTool(glyph: String, label: String) {
    Surface(
        modifier = Modifier.weight(1f),
        color = Panel,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Line)
    ) {
        Column(
            Modifier.padding(vertical = 12.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(5.dp)
        ) {
            Text(glyph, style = MaterialTheme.typography.titleLarge)
            Text(label, color = Muted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun EmptyConversation(title: String, body: String) {
    Surface(
        modifier = Modifier.fillMaxWidth().weight(1f),
        color = Panel,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Line)
    ) {
        Column(
            Modifier.fillMaxWidth().padding(22.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(Modifier.size(54.dp).background(Gold.copy(alpha = 0.12f), CircleShape), contentAlignment = Alignment.Center) {
                Text("Z", color = Gold, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black)
            }
            Spacer(Modifier.height(14.dp))
            Text(title, color = Color.White, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
            Spacer(Modifier.height(6.dp))
            Text(body, color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun FeatureNotice(title: String, body: String) {
    Surface(color = Raised, shape = RoundedCornerShape(14.dp), border = BorderStroke(1.dp, Line)) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text(title, color = Gold, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
            Text(body, color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun chatFieldColors() = OutlinedTextFieldDefaults.colors(
    disabledTextColor = Muted,
    disabledBorderColor = Line,
    disabledPlaceholderColor = Muted,
    disabledContainerColor = Panel
)

@Composable
fun AccountScreen() {
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var tab by remember { mutableIntStateOf(0) }
    Column(
        Modifier.fillMaxSize().background(Ink).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("Account", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Passwordless access and your ZervxHub plan", color = Muted)
        }
        TabRow(selectedTabIndex = tab, containerColor = Ink, contentColor = Gold) {
            Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Sign in") })
            Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Subscription") })
        }
        if (tab == 0) {
            FeatureNotice(
                title = "Email verification code",
                body = "Sign in without a password. A one-time code will be sent only after the secure authentication service is configured."
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email address") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                shape = RoundedCornerShape(14.dp),
                colors = accountFieldColors()
            )
            OutlinedTextField(
                value = code,
                onValueChange = { code = it.filter(Char::isDigit).take(6) },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("6-digit verification code") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                shape = RoundedCornerShape(14.dp),
                colors = accountFieldColors()
            )
            Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(disabledContainerColor = Gold.copy(alpha = 0.25f))) {
                Text("Email sign-in service not connected", color = Muted)
            }
            Text("Codes will be single-use, expire quickly, and be protected by resend and attempt limits.", color = Muted, style = MaterialTheme.typography.bodySmall)
        } else {
            FeatureNotice(
                title = "Subscriptions inside the app",
                body = "Your plan, renewal date and subscription controls will be shown here. Checkout remains disabled until merchant eligibility and payout support are verified."
            )
            PlanRow("Current plan", "Will load from your authenticated account")
            PlanRow("Billing status", "Not connected")
            PlanRow("Renewal / expiry", "Not available yet")
            Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(disabledContainerColor = Gold.copy(alpha = 0.25f))) {
                Text("Subscription management not connected", color = Muted)
            }
            Text("No payment method, price, or active subscription is assumed by this screen.", color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun PlanRow(label: String, value: String) {
    Surface(color = Panel, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Line)) {
        Row(Modifier.fillMaxWidth().padding(14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, color = Color.White, fontWeight = FontWeight.Medium)
            Text(value, color = Muted, style = MaterialTheme.typography.bodySmall)
        }
    }
}

@Composable
private fun accountFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Gold,
    unfocusedBorderColor = Line,
    focusedLabelColor = Gold,
    unfocusedLabelColor = Muted,
    cursorColor = Gold,
    focusedTextColor = Color.White,
    unfocusedTextColor = Color.White,
    focusedContainerColor = Panel,
    unfocusedContainerColor = Panel
)
