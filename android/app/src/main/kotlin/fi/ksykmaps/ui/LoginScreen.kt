package fi.ksykmaps.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.graphicsLayer
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
 * Visual: gradient KSYK-blue header with subtle animated concentric rings
 * behind the logo, a fade-in reveal of the form, robust login parsing,
 * and inline error surfacing with retry.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf(Session.rememberedEmail ?: "") }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    var pwVisible by remember { mutableStateOf(false) }
    var mounted by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val ctx = LocalContext.current

    // Trigger the fade-in animation shortly after mount.
    LaunchedEffect(Unit) { mounted = true }

    fun attemptLogin() {
        if (email.isBlank() || password.isBlank()) {
            status = "Email and password required."
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

    Column(Modifier.fillMaxSize()) {
        // ── Animated gradient hero header ────────────────────────
        Box(
            Modifier
                .fillMaxWidth()
                .height(268.dp)
                .background(
                    brush = Brush.linearGradient(
                        listOf(
                            Color(0xFF1E3A8A),
                            Color(0xFF2563EB),
                            Color(0xFF3B82F6),
                        ),
                        start = Offset(0f, 0f),
                        end = Offset(800f, 1200f),
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            // Subtle pulsing concentric rings behind the logo.
            AnimatedRings()

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                LogoBadge(visible = mounted)
                AnimatedVisibility(
                    visible = mounted,
                    enter = fadeIn(tween(600, delayMillis = 150)),
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            "KSYK Maps",
                            color = Color.White,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            "Sign in to continue",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        }

        // ── Form card that overlaps the hero slightly ────────────
        AnimatedVisibility(
            visible = mounted,
            enter = fadeIn(tween(500, delayMillis = 300)),
        ) {
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp, vertical = 24.dp),
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
                    shape = RoundedCornerShape(14.dp),
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
                    shape = RoundedCornerShape(14.dp),
                )

                AnimatedVisibility(visible = status != null, enter = fadeIn(), exit = fadeOut()) {
                    Card(
                        Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.errorContainer,
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Text(
                            status ?: "",
                            color = MaterialTheme.colorScheme.onErrorContainer,
                            modifier = Modifier.padding(14.dp),
                            fontSize = 14.sp,
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))

                Button(
                    onClick = { attemptLogin() },
                    enabled = !loading,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    shape = RoundedCornerShape(14.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                ) {
                    if (loading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.5.dp,
                            color = Color.White,
                        )
                        Spacer(Modifier.width(12.dp))
                        Text("Signing in…", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    } else {
                        Text("Sign in", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                    }
                }

                Spacer(Modifier.weight(1f))

                // Info footer with sync explainer + version.
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Box(
                            Modifier
                                .size(6.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF34D399))
                        )
                        Text(
                            "Captures sync with the desktop admin and ksykmaps.fi",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                        )
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "v1.0.0 · Nordbyte Studio",
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    )
                }
            }
        }
    }
}

@Composable
private fun LogoBadge(visible: Boolean) {
    val scale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.6f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 200f),
        label = "logo-scale",
    )
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1f else 0f,
        animationSpec = tween(500),
        label = "logo-alpha",
    )
    Box(
        Modifier
            .size(84.dp)
            .scale(scale)
            .graphicsLayer { this.alpha = alpha }
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.18f)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            "K",
            color = Color.White,
            fontSize = 42.sp,
            fontWeight = FontWeight.Bold,
        )
    }
}

@Composable
private fun AnimatedRings() {
    val infinite = rememberInfiniteTransition(label = "rings")
    val progress by infinite.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3600, easing = LinearEasing),
        ),
        label = "ring-progress",
    )
    Canvas(
        Modifier
            .size(320.dp)
            .graphicsLayer {
                compositingStrategy = CompositingStrategy.Offscreen
                alpha = 0.35f
            }
    ) {
        val maxR = size.minDimension / 2f
        // Three staggered rings that pulse outwards
        for (i in 0..2) {
            val offset = (i * 0.33f)
            val p = (progress + offset) % 1f
            val radius = maxR * p
            val ringAlpha = (1f - p).coerceIn(0f, 1f)
            drawCircle(
                color = Color.White.copy(alpha = ringAlpha * 0.6f),
                radius = radius,
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.5f),
            )
        }
    }
}

/**
 * Robust parser for the `success` field. Accepts both real booleans and
 * the stringy `"true"` some older API builds emit.
 */
private fun parseSuccess(el: JsonElement?): Boolean {
    if (el == null || el is JsonNull) return false
    if (el is JsonPrimitive) {
        el.booleanOrNull?.let { return it }
        return el.contentOrNull?.equals("true", ignoreCase = true) == true
    }
    return false
}
