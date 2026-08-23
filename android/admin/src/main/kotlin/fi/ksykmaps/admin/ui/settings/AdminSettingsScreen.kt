package fi.ksykmaps.admin.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import fi.ksykmaps.admin.data.AdminApi
import fi.ksykmaps.admin.data.AdminSession

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminSettingsScreen(onSignOut: () -> Unit) {
    var showServerDialog by remember { mutableStateOf(false) }
    var showSignOutDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Settings", fontWeight = FontWeight.SemiBold) }) },
    ) { pad ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            // Account section
            item {
                Text("Account", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(4.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column {
                                Text("Signed in as", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(AdminSession.email ?: "—", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text("Role: ${AdminSession.role ?: "—"}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Icon(Icons.Outlined.VerifiedUser, null, tint = MaterialTheme.colorScheme.primary)
                        }
                        HorizontalDivider()
                        OutlinedButton(
                            onClick = { showSignOutDialog = true },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Icon(Icons.Outlined.Logout, null, Modifier.size(16.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Sign out")
                        }
                    }
                }
            }

            // Server section
            item {
                Spacer(Modifier.height(4.dp))
                Text("Server", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(4.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column {
                                Text("API endpoint", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(AdminApi.getBaseUrl(), style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                            }
                            IconButton(onClick = { showServerDialog = true }) { Icon(Icons.Outlined.Edit, "Change server") }
                        }
                    }
                }
            }

            // App info section
            item {
                Spacer(Modifier.height(4.dp))
                Text("About", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(4.dp))
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        InfoRow("App", "KSYK Maps Admin")
                        InfoRow("Version", "1.0.0")
                        InfoRow("Package", "fi.ksykmaps.admin")
                        HorizontalDivider()
                        InfoRow("Security", "Backend authorization required")
                        InfoRow("Data", "No student location stored")
                    }
                }
            }
        }
    }

    // Server URL dialog
    if (showServerDialog) {
        var url by remember { mutableStateOf(AdminApi.getBaseUrl()) }
        AlertDialog(
            onDismissRequest = { showServerDialog = false },
            title = { Text("API Endpoint") },
            text = {
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("Base URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            },
            confirmButton = {
                Button(onClick = {
                    if (url.isNotBlank()) AdminSession.saveServer(url.trimEnd('/'))
                    showServerDialog = false
                }) { Text("Save") }
            },
            dismissButton = {
                TextButton(onClick = { showServerDialog = false }) { Text("Cancel") }
            },
        )
    }

    // Sign-out confirmation dialog
    if (showSignOutDialog) {
        AlertDialog(
            onDismissRequest = { showSignOutDialog = false },
            title = { Text("Sign out") },
            text = { Text("Sign out of KSYK Maps Admin?") },
            confirmButton = {
                Button(
                    onClick = { AdminSession.clear(); showSignOutDialog = false; onSignOut() },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                ) { Text("Sign out") }
            },
            dismissButton = { TextButton(onClick = { showSignOutDialog = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
