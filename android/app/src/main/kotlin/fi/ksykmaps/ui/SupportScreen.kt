package fi.ksykmaps.ui

import android.content.Intent
import android.os.Build
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.BuildConfig

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeedbackScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val isFi = getAppLanguage(ctx) == "fi"

    val categories = if (isFi)
        listOf("Yleinen", "Ehdotus", "Kiitos", "Muu")
    else
        listOf("General", "Suggestion", "Compliment", "Other")

    var selectedCategory by remember { mutableIntStateOf(0) }
    var message by remember { mutableStateOf("") }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isFi) "Anna palautetta" else "Give feedback",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = if (isFi) "Takaisin" else "Back",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                    ),
                    elevation = CardDefaults.cardElevation(0.dp),
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            if (isFi) "Kerro kokemuksestasi" else "Share your experience",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 15.sp,
                        )
                        Text(
                            if (isFi) "Palaute auttaa kehittämään sovellusta."
                            else "Your feedback helps us improve the app.",
                            fontSize = 13.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            item {
                Text(
                    if (isFi) "Kategoria" else "Category",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    categories.forEachIndexed { i, label ->
                        FilterChip(
                            selected = selectedCategory == i,
                            onClick = { selectedCategory = i },
                            label = { Text(label, fontSize = 13.sp) },
                        )
                    }
                }
            }

            item {
                Text(
                    if (isFi) "Viesti" else "Message",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = message,
                    onValueChange = { message = it },
                    modifier = Modifier.fillMaxWidth().height(200.dp),
                    placeholder = {
                        Text(
                            if (isFi) "Kirjoita palautteesi tähän..."
                            else "Write your feedback here...",
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    shape = RoundedCornerShape(16.dp),
                )
                Spacer(Modifier.height(4.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Text(
                        "${message.length}/1000",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            item {
                Button(
                    onClick = {
                        val text = buildString {
                            appendLine("KSYK Maps — ${if (isFi) "Palaute" else "Feedback"}")
                            appendLine("${if (isFi) "Kategoria" else "Category"}: ${categories[selectedCategory]}")
                            appendLine()
                            appendLine(message.trim())
                            appendLine()
                            appendLine("---")
                            appendLine("v${BuildConfig.VERSION_NAME} · Android ${Build.VERSION.RELEASE} · ${Build.MODEL}")
                        }
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "KSYK Maps ${if (isFi) "Palaute" else "Feedback"}")
                            putExtra(Intent.EXTRA_TEXT, text)
                        }
                        try {
                            ctx.startActivity(
                                Intent.createChooser(intent, if (isFi) "Jaa palaute" else "Share feedback")
                            )
                        } catch (_: Exception) {}
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = message.isNotBlank(),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(vertical = 14.dp),
                ) {
                    Icon(Icons.Outlined.Send, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (isFi) "Lähetä palaute" else "Send feedback",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BugReportScreen(onBack: () -> Unit) {
    val ctx = LocalContext.current
    val isFi = getAppLanguage(ctx) == "fi"

    val deviceInfo = remember {
        "v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})" +
            " · Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})" +
            " · ${Build.MANUFACTURER} ${Build.MODEL}"
    }

    var description by remember { mutableStateOf("") }
    var steps by remember { mutableStateOf("") }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.surface,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isFi) "Ilmoita viasta" else "Report a bug",
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = if (isFi) "Takaisin" else "Back",
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { pad ->
        LazyColumn(
            Modifier.fillMaxSize().padding(pad),
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
                    ),
                    elevation = CardDefaults.cardElevation(0.dp),
                ) {
                    Row(
                        Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.PhoneAndroid, null,
                            Modifier.size(18.dp),
                            tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.width(10.dp))
                        Text(
                            deviceInfo,
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }

            item {
                Text(
                    if (isFi) "Kuvaus" else "Description",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    modifier = Modifier.fillMaxWidth().height(160.dp),
                    placeholder = {
                        Text(
                            if (isFi) "Mitä tapahtui? Mikä meni pieleen?"
                            else "What happened? What went wrong?",
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    shape = RoundedCornerShape(16.dp),
                )
            }

            item {
                Text(
                    if (isFi) "Toistamisohjeet (valinnainen)" else "Steps to reproduce (optional)",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = steps,
                    onValueChange = { steps = it },
                    modifier = Modifier.fillMaxWidth().height(120.dp),
                    placeholder = {
                        Text(
                            if (isFi) "1. Avaa sovellus\n2. Paina nappia X\n3. ..."
                            else "1. Open app\n2. Tap button X\n3. ...",
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                        )
                    },
                    shape = RoundedCornerShape(16.dp),
                )
            }

            item {
                Button(
                    onClick = {
                        val text = buildString {
                            appendLine("KSYK Maps — Bug Report")
                            appendLine("${if (isFi) "Laite" else "Device"}: $deviceInfo")
                            appendLine()
                            appendLine("${if (isFi) "Kuvaus" else "Description"}:")
                            appendLine(description.trim())
                            if (steps.isNotBlank()) {
                                appendLine()
                                appendLine("${if (isFi) "Toistamisohjeet" else "Steps to reproduce"}:")
                                appendLine(steps.trim())
                            }
                        }
                        val intent = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_SUBJECT, "KSYK Maps Bug Report")
                            putExtra(Intent.EXTRA_TEXT, text)
                        }
                        try {
                            ctx.startActivity(
                                Intent.createChooser(
                                    intent,
                                    if (isFi) "Jaa vikailmoitus" else "Share bug report",
                                )
                            )
                        } catch (_: Exception) {}
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = description.isNotBlank(),
                    shape = RoundedCornerShape(14.dp),
                    contentPadding = PaddingValues(vertical = 14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFFEF4444),
                        contentColor = Color.White,
                    ),
                ) {
                    Icon(Icons.Outlined.BugReport, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(
                        if (isFi) "Lähetä vikailmoitus" else "Send bug report",
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}
