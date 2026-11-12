package com.zervxhub.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val Ink = Color(0xFF090909)
private val Panel = Color(0xFF171717)
private val Gold = Color(0xFFD6A93A)
private val Muted = Color(0xFFB6B6B6)

class MainActivity : ComponentActivity() {
 override fun onCreate(savedInstanceState: Bundle?) {
  super.onCreate(savedInstanceState)
  setContent { ZervxHubApp() }
 }
}

@Composable
private fun ZervxHubApp() {
 val destinations = listOf("Home", "Projects", "Licenses", "Activity", "Settings")
 var selected by remember { mutableIntStateOf(0) }
 MaterialTheme {
  Surface(Modifier.fillMaxSize(), color = Ink, contentColor = Color.White) {
   Column(Modifier.fillMaxSize()) {
    Column(Modifier.weight(1f).padding(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
     Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
      Text("ZERVXHUB", color = Gold, style = MaterialTheme.typography.titleLarge)
      Text("MOBILE", color = Muted, style = MaterialTheme.typography.labelMedium)
     }
     Text(destinations[selected], style = MaterialTheme.typography.headlineMedium)
     Surface(color = Panel, shape = RoundedCornerShape(18.dp)) {
      Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
       Text(when (selected) {
        0 -> "Your developer control center"
        1 -> "Your projects will appear here"
        2 -> "Manage licenses and activation keys"
        3 -> "Recent account and project activity"
        else -> "Account, devices and security"
       }, color = Gold, style = MaterialTheme.typography.titleMedium)
       Text("Backend connection is not configured yet. No demo metrics or placeholder license data are shown.",
        color = Muted, style = MaterialTheme.typography.bodyMedium)
      }
     }
     Text("App foundation · Android first · iOS-ready API boundary", color = Muted, style = MaterialTheme.typography.labelSmall)
    }
    NavigationBar(containerColor = Panel, contentColor = Gold) {
     destinations.forEachIndexed { index, label ->
      NavigationBarItem(selected == index, onClick = { selected = index },
       icon = { Text(listOf("⌂", "▦", "◇", "◷", "⚙")[index]) }, label = { Text(label) })
     }
    }
   }
  }
 }
}
