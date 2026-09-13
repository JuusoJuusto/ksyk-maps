package fi.ksykmaps.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import fi.ksykmaps.BuildConfig
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.ApiException
import fi.ksykmaps.data.Session
import com.posthog.PostHog
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

/**
 * Clean, minimal login screen. Deliberately restrained — no animation
 * curtains, no shimmer, no gradient logo backdrop. Just:
 *   1. A KSYK blue header strip with the wordmark
 *   2. Two labelled input fields
 *   3. Error card (only when something goes wrong)
 *   4. Big primary sign-in button
 *   5. Footer with server URL for support
 *
 * Matches the desktop admin's login vibe. Every element is visible on
 * mount — no hidden-until-animation-finishes state that could leave
 * users staring at a blank screen if a transition glitches.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf(Session.rememberedEmail ?: "") }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var pwVisible by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current
    val scroll = rememberScrollState()
    LanguageState.init(ctx)
    val lang = LanguageState.current ?: "fi"
    val fi = lang == "fi"

    fun attemptLogin() {
        if (email.isBlank() || password.isBlank()) {
            status = if (fi) "Sähköposti ja salasana vaaditaan." else "Email and password required."
            return
        }
        loading = true; status = null
        scope.launch {
            try {
                val body = buildJsonObject {
                    put("email", email.trim())
                    put("password", password)
                }
                val result = withContext(Dispatchers.IO) { Api.post("/auth/admin-login", body) }
                val obj = result.jsonObject
                val ok = parseSuccess(obj["success"])
                if (ok) {
                    val token = (obj["adminToken"] as? JsonPrimitive)?.contentOrNull
                    Api.sessionEmail = email.trim()
                    Api.adminToken = token
                    Session.user = obj["user"]?.jsonObject
                    Session.saveToDataStore(ctx, email.trim(), token)
                    runCatching { PostHog.capture("admin_login_succeeded") }
                    onLoggedIn()
                } else {
                    status = obj["message"]?.let {
                        if (it is JsonPrimitive) it.contentOrNull else it.toString()
                    } ?: if (fi) "Virheelliset tunnistetiedot." else "Invalid credentials."
                }
            } catch (e: ApiException) {
                status = when (e.status) {
                    401, 400 -> if (fi) "Väärä sähköposti tai salasana." else "Wrong email or password."
                    403 -> if (fi) "Tililläsi ei ole järjestelmänvalvojan oikeuksia." else "Your account doesn't have admin access."
                    429 -> if (fi) "Palvelin on ruuhkautunut — yritä hetken päästä uudelleen." else "Server is busy — please try again in a moment."
                    0   -> if (fi) "Palvelimeen ei saatu yhteyttä. Tarkista internet-yhteys." else "Couldn't reach the server. Check your internet."
                    else -> Api.friendly(e)
                }
            } catch (e: Exception) {
                status = Api.friendly(e)
            } finally {
                loading = false
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scroll),
    ) {
        // ── Blue banner ─────────────────────────────────────────
        Box(
            Modifier
                .fillMaxWidth()
                .height(180.dp)
                .background(Color(0xFF2563EB)),
            contentAlignment = Alignment.Center,
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    "KSYK",
                    color = Color.White,
                    fontSize = 46.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 4.sp,
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "MAPS",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 8.sp,
                )
            }
        }

        // ── Form body ───────────────────────────────────────────
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                if (fi) "Kirjaudu sisään" else "Sign in",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                if (fi) "Käytä samoja tunnuksia kuin verkkoselaimen hallinnassa."
                else "Use the same credentials as the desktop admin.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            Spacer(Modifier.height(6.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it; status = null },
                label = { Text(if (fi) "Sähköposti" else "Email") },
                leadingIcon = { Icon(Icons.Outlined.Email, null) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                ),
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it; status = null },
                label = { Text(if (fi) "Salasana" else "Password") },
                leadingIcon = { Icon(Icons.Outlined.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { pwVisible = !pwVisible }) {
                        Icon(
                            if (pwVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                            contentDescription = if (pwVisible)
                                if (fi) "Piilota salasana" else "Hide password"
                            else
                                if (fi) "Näytä salasana" else "Show password",
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                visualTransformation = if (pwVisible) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Password,
                    imeAction = ImeAction.Done,
                ),
                singleLine = true,
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = MaterialTheme.colorScheme.onSurface,
                    unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
                    focusedContainerColor = MaterialTheme.colorScheme.surface,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
                ),
            )

            if (status != null) {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text(
                        status!!,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(14.dp),
                        fontSize = 14.sp,
                    )
                }
            }

            Spacer(Modifier.height(4.dp))

            Button(
                onClick = { attemptLogin() },
                enabled = !loading && email.isNotBlank() && password.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF2563EB),
                    contentColor = Color.White,
                    disabledContainerColor = Color(0xFFCBD5E1),
                    disabledContentColor = Color.White,
                ),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.5.dp,
                        color = Color.White,
                    )
                    Spacer(Modifier.width(12.dp))
                    Text(if (fi) "Kirjaudutaan…" else "Signing in…", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                } else {
                    Text(if (fi) "Kirjaudu" else "Sign in", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                }
            }

            Spacer(Modifier.height(32.dp))

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    if (fi) "YHDISTETTY" else "CONNECTED TO",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                    textAlign = TextAlign.Center,
                )
                Text(
                    Api.base,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "v${BuildConfig.VERSION_NAME} · Nordbyte Studio",
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                )
            }
        }
    }
}

/**
 * Robust parser for the `success` field. Accepts a real bool AND the
 * stringy "true" some older API builds emitted.
 */
private fun parseSuccess(el: JsonElement?): Boolean {
    if (el == null || el is JsonNull) return false
    if (el is JsonPrimitive) {
        el.booleanOrNull?.let { return it }
        return el.contentOrNull?.equals("true", ignoreCase = true) == true
    }
    return false
}
