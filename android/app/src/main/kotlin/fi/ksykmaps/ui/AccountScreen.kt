package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.BuildConfig
import fi.ksykmaps.data.Api

/**
 * Profile / sign-out screen. Shows the signed-in email + small "what
 * syncs" explainer that matches the desktop admin's account menu.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(onSignOut: () -> Unit) {
    val ctx = LocalContext.current
    LanguageState.init(ctx); val lang = LanguageState.current ?: "fi"
    val isFi = lang == "fi"
    val email = Api.sessionEmail ?: "—"

    Column(
        Modifier.fillMaxSize(),
    ) {
        // Hero band with avatar circle
        Box(
            Modifier
                .fillMaxWidth()
                .height(180.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primary,
                            MaterialTheme.colorScheme.primaryContainer,
                        )
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        email.firstOrNull()?.uppercase() ?: "?",
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontSize = 30.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(email, color = MaterialTheme.colorScheme.onPrimary, fontWeight = FontWeight.SemiBold)
                Text(
                    if (isFi) "Kirjautunut sisään" else "Signed in",
                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f),
                    fontSize = 12.sp,
                )
            }
        }

        Column(
            Modifier.fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            InfoCard(
                icon = { Icon(Icons.Outlined.Sync, null, tint = MaterialTheme.colorScheme.primary) },
                title = if (isFi) "Mitä synkronoidaan" else "What syncs",
                body = "Everything you capture here — rooms, beacons, GPS fixes — lands in the same Firestore your desktop admin and the website read from. Sign in on multiple devices and you'll see the same data on all of them.",
            )
            InfoCard(
                icon = { Icon(Icons.Outlined.Email, null, tint = MaterialTheme.colorScheme.primary) },
                title = if (isFi) "Yhdistetty" else "Connected to",
                body = Api.base,
            )
            InfoCard(
                icon = { Icon(Icons.Outlined.Info, null, tint = MaterialTheme.colorScheme.primary) },
                title = if (isFi) "Versio" else "Version",
                body = "KSYK Maps Android · ${BuildConfig.VERSION_NAME}\n© 2026 Nordbyte Studio",
            )

            Spacer(Modifier.weight(1f))

            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    contentColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                Icon(Icons.AutoMirrored.Outlined.Logout, null)
                Spacer(Modifier.width(10.dp))
                Text(if (isFi) "Kirjaudu ulos" else "Sign out", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

@Composable
private fun InfoCard(
    icon: @Composable () -> Unit,
    title: String,
    body: String,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            icon()
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(
                    body,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
