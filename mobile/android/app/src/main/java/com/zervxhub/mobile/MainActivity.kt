package com.zervxhub.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import com.zervxhub.mobile.data.ApiConnection
import com.zervxhub.mobile.data.HealthRepository
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

private val Ink = Color(0xFF090909)
private val Panel = Color(0xFF171717)
private val PanelRaised = Color(0xFF202020)
private val Gold = Color(0xFFD6A93A)
private val Muted = Color(0xFFB6B6B6)
private val DividerTone = Color(0xFF303030)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { ZervxHubApp() }
    }
}

private enum class Destination(val label: String, val glyph: String) {
    Home("Home", "⌂"),
    Projects("Projects", "▦"),
    Licenses("Licenses", "◇"),
    Activity("Activity", "◷"),
    Studio("Studio", "⌘"),
    Settings("Settings", "⚙")
}

@Composable
private fun ZervxHubApp() {
    var selected by remember { mutableStateOf(Destination.Home) }
    var refreshKey by remember { mutableIntStateOf(0) }
    var connection by remember { mutableStateOf<ApiConnection>(ApiConnection.Checking) }

    LaunchedEffect(refreshKey) {
        connection = HealthRepository().check()
    }

    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Gold,
            onPrimary = Ink,
            background = Ink,
            surface = Panel,
            onSurface = Color.White,
            secondary = Gold
        )
    ) {
        Surface(modifier = Modifier.fillMaxSize(), color = Ink, contentColor = Color.White) {
            Column(modifier = Modifier.fillMaxSize()) {
                AppHeader(connection, onRefresh = { refreshKey++ })
                HorizontalDivider(color = DividerTone)
                Box(modifier = Modifier.weight(1f)) {
                    when (selected) {
                        Destination.Home -> HomeScreen(
                            connection = connection,
                            onRetry = { refreshKey++ },
                            onNavigate = { selected = it }
                        )
                        Destination.Projects -> EmptySection(
                            title = "Your projects",
                            description = "Projects and games connected to your developer account will appear here.",
                            action = "Connect account"
                        )
                        Destination.Licenses -> EmptySection(
                            title = "License management",
                            description = "Create, renew, revoke and inspect keys when your account is connected.",
                            action = "Connect account"
                        )
                        Destination.Activity -> EmptySection(
                            title = "Activity",
                            description = "Security events and project activity will appear here after sign-in.",
                            action = "Connect account"
                        )
                        Destination.Studio -> EmptySection(
                            title = "Developer Studio",
                            description = "Your snippets, API tools and local developer utilities belong here.",
                            action = "Explore tools"
                        )
                        Destination.Settings -> EmptySection(
                            title = "Settings & security",
                            description = "Manage sessions, trusted devices and account preferences.",
                            action = "Connect account"
                        )
                    }
                }
                NavigationBar(
                    containerColor = Panel,
                    contentColor = Gold,
                    tonalElevation = 0.dp
                ) {
                    Destination.entries.forEach { destination ->
                        NavigationBarItem(
                            selected = selected == destination,
                            onClick = { selected = destination },
                            icon = { Text(destination.glyph, style = MaterialTheme.typography.titleMedium) },
                            label = { Text(destination.label, style = MaterialTheme.typography.labelSmall) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Gold,
                                selectedTextColor = Gold,
                                indicatorColor = Gold.copy(alpha = 0.13f),
                                unselectedIconColor = Muted,
                                unselectedTextColor = Muted
                            )
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AppHeader(connection: ApiConnection, onRefresh: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().background(Ink).padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            Box(
                modifier = Modifier.size(38.dp).background(Gold, RoundedCornerShape(11.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text("Z", color = Ink, fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleLarge)
            }
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text("ZERVXHUB", color = Gold, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                Text("DEVELOPER PLATFORM", color = Muted, style = MaterialTheme.typography.labelSmall)
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            val status = when (connection) {
                is ApiConnection.Connected -> "API ONLINE"
                ApiConnection.Checking -> "CHECKING"
                ApiConnection.NotConfigured -> "NOT CONFIGURED"
                is ApiConnection.Unavailable -> "API OFFLINE"
            }
            val statusColor = if (connection is ApiConnection.Connected) Gold else Muted
            Box(Modifier.size(7.dp).background(statusColor, CircleShape))
            Text(status, color = statusColor, style = MaterialTheme.typography.labelSmall)
            Text("↻", color = Muted, modifier = Modifier.clickable(onClick = onRefresh), style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun HomeScreen(connection: ApiConnection, onRetry: () -> Unit, onNavigate: (Destination) -> Unit) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = 22.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("Your workspace", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text("Everything you manage, in one place.", color = Muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item {
            Surface(
                color = Panel,
                shape = RoundedCornerShape(18.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, DividerTone)
            ) {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Box(Modifier.size(8.dp).background(Gold, CircleShape))
                        val connectionLabel = when (connection) {
                        is ApiConnection.Connected -> "API REACHABLE · SIGN-IN PENDING"
                        ApiConnection.Checking -> "CHECKING API"
                        ApiConnection.NotConfigured -> "API NOT CONFIGURED"
                        is ApiConnection.Unavailable -> "API UNAVAILABLE"
                    }
                    Text(connectionLabel, color = Gold, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
                    }
                    Text("Connect your ZervxHub account", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                    Text(
                        when (connection) {
                            is ApiConnection.Connected -> "The API is reachable. Secure native sign-in and session linking are the next integration step."
                            ApiConnection.Checking -> "Checking the configured ZervxHub API. Account data will only appear after secure sign-in."
                            ApiConnection.NotConfigured -> "The API host has not been configured yet. The app stays disconnected until the verified Worker endpoint is set."
                            is ApiConnection.Unavailable -> connection.message
                        },
                        color = Muted,
                        style = MaterialTheme.typography.bodyMedium
                    )
                    if (connection is ApiConnection.Unavailable) {
                        Text("Retry connection", color = Gold, modifier = Modifier.clickable(onClick = onRetry), style = MaterialTheme.typography.labelLarge)
                    }
                    Text("No sample projects, keys or fake statistics are displayed.", color = Muted, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        item {
            Text("YOUR LIBRARY", color = Muted, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                LibraryCard("Projects & games", "Manage your connected developer projects", "▦") { onNavigate(Destination.Projects) }
                LibraryCard("License keys", "Issue, renew and revoke access keys", "◇") { onNavigate(Destination.Licenses) }
                LibraryCard("Developer Studio", "Tools, snippets and API utilities", "⌘") { onNavigate(Destination.Studio) }
                LibraryCard("Activity & security", "Review changes and protect your account", "◷") { onNavigate(Destination.Activity) }
            }
        }
    }
}

@Composable
private fun LibraryCard(title: String, subtitle: String, glyph: String, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        color = PanelRaised,
        shape = RoundedCornerShape(15.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, DividerTone)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 15.dp, vertical = 17.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Box(Modifier.size(43.dp).background(Gold.copy(alpha = 0.12f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Text(glyph, color = Gold, style = MaterialTheme.typography.titleLarge)
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                Text(subtitle, color = Muted, style = MaterialTheme.typography.bodySmall)
            }
            Text("›", color = Gold, style = MaterialTheme.typography.headlineSmall)
        }
    }
}

@Composable
private fun EmptySection(title: String, description: String, action: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.Start
    ) {
        Text(title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(10.dp))
        Text(description, color = Muted, style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.height(18.dp))
        Surface(color = Panel, shape = RoundedCornerShape(12.dp), border = androidx.compose.foundation.BorderStroke(1.dp, DividerTone)) {
            Text(action, modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), color = Muted, style = MaterialTheme.typography.labelLarge)
        }
        Spacer(Modifier.height(12.dp))
        Text("This section is not connected to live account data yet.", color = Muted, style = MaterialTheme.typography.labelSmall)
    }
}
