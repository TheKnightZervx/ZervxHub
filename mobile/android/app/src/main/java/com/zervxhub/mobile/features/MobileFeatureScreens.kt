package com.zervxhub.mobile.features

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.zervxhub.mobile.data.MobileApiClient
import com.zervxhub.mobile.data.MobileConversation
import com.zervxhub.mobile.data.MobileMessage
import com.zervxhub.mobile.data.MobileUser
import kotlinx.coroutines.launch

private val Ink = Color(0xFF090909)
private val Panel = Color(0xFF171717)
private val Raised = Color(0xFF202020)
private val Gold = Color(0xFFD6A93A)
private val Muted = Color(0xFFB6B6B6)
private val Line = Color(0xFF303030)

@Composable
fun ChatScreen() {
    val context = LocalContext.current
    val api = remember(context) { MobileApiClient(context) }
    val signedIn = remember { api.isSignedIn() }
    var tab by remember { mutableIntStateOf(0) }
    Column(
        Modifier.fillMaxSize().background(Ink).padding(horizontal = 18.dp, vertical = 18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
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
            0 -> GlobalChatPanel(api, signedIn)
            1 -> PrivateChatPanel(api, signedIn, group = false)
            else -> PrivateChatPanel(api, signedIn, group = true)
        }
    }
}

@Composable
private fun GlobalChatPanel(api: MobileApiClient, signedIn: Boolean) {
    val scope = rememberCoroutineScope()
    var messages by remember { mutableStateOf<List<MobileMessage>>(emptyList()) }
    var draft by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(signedIn) {
        if (signedIn) {
            loading = true
            try { messages = api.globalMessages(); status = "" }
            catch (error: Exception) { status = error.message ?: "Could not load global chat." }
            finally { loading = false }
        } else {
            messages = emptyList()
        }
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        FeatureNotice(
            title = "Global community chat",
            body = "Text and emojis only. Attachments, voice messages, calls, video and screen sharing are blocked here."
        )
        if (!signedIn) StatusNotice("Sign in from Account before using chat.")
        LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            if (messages.isEmpty() && !loading) item { Text("No global messages yet.", color = Muted) }
            items(messages, key = { it.id }) { message -> MessageBubble(message) }
        }
        if (status.isNotBlank()) Text(status, color = Gold, style = MaterialTheme.typography.bodySmall)
        EmojiRow { emoji -> draft += emoji }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
                value = draft, onValueChange = { draft = it.take(2000) },
                modifier = Modifier.weight(1f), enabled = signedIn && !loading,
                placeholder = { Text("Write a message…") }, singleLine = false,
                shape = RoundedCornerShape(14.dp), colors = accountFieldColors()
            )
            Button(
                onClick = {
                    val message = draft.trim()
                    if (message.isNotEmpty()) scope.launch {
                        loading = true
                        try {
                            val sent = api.sendGlobalMessage(message)
                            messages = (messages + sent).takeLast(80)
                            draft = ""
                            status = ""
                        } catch (error: Exception) { status = error.message ?: "Message could not be sent." }
                        finally { loading = false }
                    }
                },
                enabled = signedIn && draft.isNotBlank() && !loading,
                colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
            ) { Text("Send") }
        }
    }
}

@Composable
private fun PrivateChatPanel(api: MobileApiClient, signedIn: Boolean, group: Boolean) {
    val scope = rememberCoroutineScope()
    var conversations by remember { mutableStateOf<List<MobileConversation>>(emptyList()) }
    var selected by remember { mutableStateOf<MobileConversation?>(null) }
    var messages by remember { mutableStateOf<List<MobileMessage>>(emptyList()) }
    var recipientEmail by remember { mutableStateOf("") }
    var groupName by remember { mutableStateOf("") }
    var memberEmails by remember { mutableStateOf("") }
    var draft by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    suspend fun reloadConversations() {
        conversations = api.conversations().filter { it.kind == if (group) "group" else "direct" }
    }
    LaunchedEffect(signedIn, group) {
        if (signedIn) {
            loading = true
            try { reloadConversations(); status = "" }
            catch (error: Exception) { status = error.message ?: "Could not load conversations." }
            finally { loading = false }
        } else {
            conversations = emptyList()
            selected = null
            messages = emptyList()
        }
    }
    LaunchedEffect(selected?.id) {
        val conversation = selected ?: return@LaunchedEffect
        loading = true
        try { messages = api.privateMessages(conversation.id); status = "" }
        catch (error: Exception) { status = error.message ?: "Could not load private messages." }
        finally { loading = false }
    }

    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        FeatureNotice(
            title = if (group) "Private groups" else "Private messages",
            body = "Every conversation read and write is checked against current server-side membership."
        )
        if (!signedIn) {
            StatusNotice("Sign in from Account before opening private conversations.")
        } else if (selected == null) {
            if (group) {
                OutlinedTextField(
                    value = groupName, onValueChange = { groupName = it.take(80) },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Group name") }, singleLine = true,
                    colors = accountFieldColors()
                )
                OutlinedTextField(
                    value = memberEmails, onValueChange = { memberEmails = it.take(1000) },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Member emails (comma-separated)") },
                    colors = accountFieldColors()
                )
                Button(
                    onClick = {
                        val emails = memberEmails.split(",").map { it.trim() }.filter { it.isNotBlank() }
                        scope.launch {
                            loading = true
                            try {
                                val id = api.createGroup(groupName.trim(), emails)
                                reloadConversations()
                                selected = conversations.firstOrNull { it.id == id }
                                status = ""
                            } catch (error: Exception) { status = error.message ?: "Group could not be created." }
                            finally { loading = false }
                        }
                    },
                    enabled = !loading && groupName.isNotBlank() && memberEmails.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                ) { Text("Create private group") }
            } else {
                OutlinedTextField(
                    value = recipientEmail, onValueChange = { recipientEmail = it.take(254) },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Start chat with email") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = accountFieldColors()
                )
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            try {
                                val id = api.createDirect(recipientEmail.trim())
                                reloadConversations()
                                selected = conversations.firstOrNull { it.id == id }
                                status = ""
                            } catch (error: Exception) { status = error.message ?: "Conversation could not be created." }
                            finally { loading = false }
                        }
                    },
                    enabled = !loading && recipientEmail.contains("@"),
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                ) { Text("Start private chat") }
            }
            Text(if (group) "YOUR PRIVATE GROUPS" else "YOUR PRIVATE CHATS", color = Gold, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.labelMedium)
            LazyColumn(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (conversations.isEmpty()) item { Text("No conversations yet.", color = Muted) }
                items(conversations, key = { it.id }) { conversation ->
                    Surface(
                        modifier = Modifier.fillMaxWidth().clickable { selected = conversation },
                        color = Panel, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Line)
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text(conversation.name ?: if (group) "Private group" else "Private chat", color = Color.White, fontWeight = FontWeight.SemiBold)
                            Text("Conversation " + conversation.id.take(8), color = Muted, style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
            }
        } else {
            Row(verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { selected = null; messages = emptyList() }) { Text("← Back", color = Gold) }
                Text(selected?.name ?: if (group) "Private group" else "Private chat", color = Color.White, fontWeight = FontWeight.SemiBold)
            }
            LazyColumn(Modifier.weight(1f).fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (messages.isEmpty() && !loading) item { Text("No messages yet.", color = Muted) }
                items(messages, key = { it.id }) { message -> MessageBubble(message) }
            }
            Text("PRIVATE CHAT TOOLS", color = Gold, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DisabledTool("🎙", "Voice")
                DisabledTool("📎", "Files")
                DisabledTool("📞", "Call")
                DisabledTool("📹", "Video")
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                DisabledTool("🖥", "Share screen")
                EmojiRow { emoji -> draft += emoji }
            }
            if (status.isNotBlank()) Text(status, color = Gold, style = MaterialTheme.typography.bodySmall)
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = draft, onValueChange = { draft = it.take(2000) },
                    modifier = Modifier.weight(1f), enabled = !loading,
                    placeholder = { Text("Write a private message…") }, singleLine = false,
                    shape = RoundedCornerShape(14.dp), colors = accountFieldColors()
                )
                Button(
                    onClick = {
                        val message = draft.trim()
                        val conversationId = selected?.id ?: return@Button
                        if (message.isNotEmpty()) scope.launch {
                            loading = true
                            try {
                                val sent = api.sendPrivateMessage(conversationId, message)
                                messages = (messages + sent).takeLast(80)
                                draft = ""
                                status = ""
                            } catch (error: Exception) { status = error.message ?: "Message could not be sent." }
                            finally { loading = false }
                        }
                    },
                    enabled = draft.isNotBlank() && !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                ) { Text("Send") }
            }
        }
        if (status.isNotBlank() && selected == null) Text(status, color = Gold, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun MessageBubble(message: MobileMessage) {
    Surface(color = Panel, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Line)) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text("User " + message.senderId.take(8), color = Gold, style = MaterialTheme.typography.labelSmall)
            Text(message.content, color = Color.White, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
private fun EmojiRow(onEmoji: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
        listOf("😀", "😂", "🔥", "❤️", "👋", "🎉").forEach { emoji ->
            Text(emoji, modifier = Modifier.clickable { onEmoji(emoji) }, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun RowScope.DisabledTool(glyph: String, label: String) {
    Surface(
        modifier = Modifier.weight(1f),
        color = Panel,
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Line)
    ) {
        Column(
            Modifier.padding(vertical = 10.dp, horizontal = 3.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(glyph, style = MaterialTheme.typography.titleLarge)
            Text(label, color = Muted, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun StatusNotice(body: String) {
    Surface(color = Raised, shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, Line)) {
        Text(body, modifier = Modifier.fillMaxWidth().padding(12.dp), color = Muted, style = MaterialTheme.typography.bodySmall)
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
fun AccountScreen() {
    val context = LocalContext.current
    val api = remember(context) { MobileApiClient(context) }
    val scope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var code by remember { mutableStateOf("") }
    var challengeId by remember { mutableStateOf<String?>(null) }
    var user by remember { mutableStateOf<MobileUser?>(null) }
    var subscription by remember { mutableStateOf<org.json.JSONObject?>(null) }
    var tab by remember { mutableIntStateOf(0) }
    var status by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        if (api.isSignedIn()) {
            try {
                if (api.refreshSession()) user = api.account()
                else status = "Your session expired. Please sign in again."
            } catch (error: Exception) { status = error.message ?: "Please sign in again." }
        }
    }
    LaunchedEffect(tab, user?.id) {
        if (tab == 1 && user != null) {
            try { subscription = api.subscription() }
            catch (error: Exception) { status = error.message ?: "Subscription status unavailable." }
        }
    }

    Column(
        Modifier.fillMaxSize().background(Ink).padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
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
            if (user != null) {
                FeatureNotice("Signed in", user?.email.orEmpty())
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            try { api.logout(); user = null; challengeId = null; status = "Signed out." }
                            catch (error: Exception) { user = null; status = error.message ?: "Signed out locally." }
                            finally { loading = false }
                        }
                    },
                    enabled = !loading,
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                ) { Text("Sign out") }
            } else {
                FeatureNotice(
                    title = "Email verification code",
                    body = "Sign in without a password. Codes expire after five minutes and can only be used once."
                )
                OutlinedTextField(
                    value = email, onValueChange = { email = it.trim().take(254) },
                    modifier = Modifier.fillMaxWidth(), label = { Text("Email address") },
                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    shape = RoundedCornerShape(14.dp), colors = accountFieldColors()
                )
                Button(
                    onClick = {
                        scope.launch {
                            loading = true
                            try {
                                val result = api.requestEmailCode(email.trim())
                                challengeId = result.first
                                status = "Code requested. Check your inbox. It expires in " + result.second + " seconds."
                            } catch (error: Exception) { status = error.message ?: "Could not request a code." }
                            finally { loading = false }
                        }
                    },
                    enabled = !loading && email.contains("@"),
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                ) { Text("Send verification code") }
                if (challengeId != null) {
                    OutlinedTextField(
                        value = code, onValueChange = { code = it.filter(Char::isDigit).take(6) },
                        modifier = Modifier.fillMaxWidth(), label = { Text("6-digit verification code") },
                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                        shape = RoundedCornerShape(14.dp), colors = accountFieldColors()
                    )
                    Button(
                        onClick = {
                            scope.launch {
                                loading = true
                                try {
                                    user = api.verifyEmailCode(challengeId.orEmpty(), code)
                                    status = "You're signed in."
                                    code = ""
                                    challengeId = null
                                } catch (error: Exception) { status = error.message ?: "Code verification failed." }
                                finally { loading = false }
                            }
                        },
                        enabled = !loading && code.length == 6,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Gold, contentColor = Ink)
                    ) { Text("Verify and sign in") }
                }
            }
        } else {
            FeatureNotice(
                title = "Subscriptions inside the app",
                body = "Your subscription record will appear here when linked. Checkout stays disabled until merchant onboarding and Iraq payout eligibility are verified."
            )
            val activeSubscription = subscription?.optJSONObject("subscription")
            if (user == null) {
                StatusNotice("Sign in to view your subscription.")
            } else if (activeSubscription == null) {
                PlanRow("Subscription", "No linked subscription")
                PlanRow("Checkout", "Disabled")
            } else {
                PlanRow("Plan", activeSubscription.optString("plan", "Unavailable"))
                PlanRow("Status", activeSubscription.optString("status", "Unavailable"))
                PlanRow("Billing", if (subscription?.optBoolean("checkoutEnabled", false) == true) "Available" else "Disabled")
            }
            Button(onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth()) {
                Text("Checkout is not enabled")
            }
        }
        if (status.isNotBlank()) Text(status, color = Gold, style = MaterialTheme.typography.bodySmall)
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
    unfocusedContainerColor = Panel,
    disabledTextColor = Muted,
    disabledBorderColor = Line,
    disabledPlaceholderColor = Muted,
    disabledContainerColor = Panel
)
