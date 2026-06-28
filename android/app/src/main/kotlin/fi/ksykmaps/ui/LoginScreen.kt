package fi.ksykmaps.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
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
import fi.ksykmaps.data.Api
import fi.ksykmaps.data.ApiException
import fi.ksykmaps.data.Session
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

/**
 * Branded login screen.
 *
 * Visual: gradient KSYK-blue header with the school logo, then a glass
 * card containing the form. Robust login: tries `success` as both a real
 * boolean and a stringy "true", and surfaces 4xx errors with a clear
 * message instead of the raw JSON the server returned.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var pwVisible by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current

    fun attemptLogin() {
        if (email.isBlank() || password.isBlank()) {
            status = "Email and password required."
            return
        }
        loading = true
        status = null
        scope.launch {
            try {
                val body = buildJsonObject {
                    put("email", email.trim())
                    put("password", password)
                }
                val result = withContext(Dispatchers.IO) { Api.post("/auth/admin-login", body) }
                val obj = result.jsonObject

                // The server may serialise `success` as a raw bool or a
                // stringy "true". Accept both so a minor backend tweak can't
                // break sign-in.
                val ok = parseSuccess(obj["success"])
                if (ok) {
                    Api.sessionEmail = email.trim()
                    Session.user = obj["user"]?.jsonObject
                    Session.saveToDataStore(ctx, email.trim())
                    onLoggedIn()
                } else {
                    status = obj["message"]?.let {
                        if (it is JsonPrimitive) it.contentOrNull else it.toString()
                    } ?: "Invalid credentials."
                }
            } catch (e: ApiException) {
                status = when (e.status) {
                    401, 400 -> "Wrong email or password."
                    403 -> "Your account doesn't have admin access."
                    429 -> "Server is busy — please try again in a moment."
                    0   -> "Couldn't reach the server. Check your internet."
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
        Modifier.fillMaxSize()
    ) {
        // ── Gradient hero header ──────────────────────────────────
        Box(
            Modifier
                .fillMaxWidth()
                .height(240.dp)
                .background(
                    brush = Brush.verticalGradient(
                        listOf(
                            Color(0xFF1E3A8A),
                            Color(0xFF2563EB),
                            Color(0xFF3B82F6),
                        )
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Box(
                    Modifier
                        .size(78.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.18f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("K", color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.Bold)
                }
                Text(
                    "KSYK Maps",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                )
                Text(
                    "Sign in",
                    color = Color.White.copy(alpha = 0.85f),
                    fontSize = 14.sp,
                )
            }
        }

        // ── Form ──────────────────────────────────────────────────
        Column(
            Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            OutlinedTextField(
                value = email,
                onValueChange = { email = it; status = null },
                label = { Text("Email") },
                leadingIcon = { Icon(Icons.Outlined.Email, null) },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                ),
                singleLine = true,
                shape = RoundedCornerShape(12.dp),
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it; status = null },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Outlined.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { pwVisible = !pwVisible }) {
                        Icon(
                            if (pwVisible) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,
                            contentDescription = if (pwVisible) "Hide password" else "Show password",
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
                shape = RoundedCornerShape(12.dp),
            )

            // Inline status message
            AnimatedVisibility(visible = status != null, enter = fadeIn(), exit = fadeOut()) {
                Card(
                    Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.errorContainer,
                    ),
                ) {
                    Text(
                        status ?: "",
                        color = MaterialTheme.colorScheme.onErrorContainer,
                        modifier = Modifier.padding(14.dp),
                        fontSize = 14.sp,
                    )
                }
            }

            Spacer(Modifier.height(8.dp))

            Button(
                onClick = { attemptLogin() },
                enabled = !loading,
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (loading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.5.dp,
                        color = Color.White,
                    )
                    Spacer(Modifier.width(12.dp))
                    Text("Signing in…", fontWeight = FontWeight.SemiBold)
                } else {
                    Text("Sign in", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                }
            }

            Spacer(Modifier.weight(1f))

            Text(
                "Signed in here? Your captures sync with the desktop admin and the website.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
            )
            Text(
                "v1.0.0 · ksykmaps.fi",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.65f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

/**
 * Robust parser for the `success` field. The server sends `true` as a
 * literal boolean; some older builds emit `"true"` as a string. Accept both.
 */
private fun parseSuccess(el: JsonElement?): Boolean {
    if (el == null || el is JsonNull) return false
    if (el is JsonPrimitive) {
        el.booleanOrNull?.let { return it }
        return el.contentOrNull?.equals("true", ignoreCase = true) == true
    }
    return false
}
