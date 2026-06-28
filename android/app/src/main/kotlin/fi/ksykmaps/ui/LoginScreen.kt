package fi.ksykmaps.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import fi.ksykmaps.data.Api
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put

@Composable
fun LoginScreen(onLoggedIn: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(
        Modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("KSYK Maps", style = MaterialTheme.typography.headlineLarge)
        Spacer(Modifier.height(8.dp))
        Text("Sign in", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(32.dp))

        OutlinedTextField(
            value = email, onValueChange = { email = it },
            label = { Text("Email") },
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            singleLine = true,
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = password, onValueChange = { password = it },
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            visualTransformation = PasswordVisualTransformation(),
            singleLine = true,
        )

        Spacer(Modifier.height(8.dp))
        status?.let { Text(it, color = MaterialTheme.colorScheme.error) }

        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                if (email.isBlank() || password.isBlank()) {
                    status = "Email and password required."
                    return@Button
                }
                loading = true; status = "Signing in..."
                scope.launch {
                    try {
                        val body = buildJsonObject {
                            put("email", email.trim())
                            put("password", password)
                        }
                        val result = withContext(Dispatchers.IO) { Api.post("/auth/admin-login", body) }
                        val obj = result.jsonObject
                        val ok = obj["success"]?.jsonPrimitive?.toString()?.contains("true") == true
                        if (ok) {
                            Api.sessionEmail = email
                            onLoggedIn()
                        } else {
                            status = obj["message"]?.toString() ?: "Invalid credentials"
                        }
                    } catch (e: Exception) {
                        status = Api.friendly(e)
                    } finally {
                        loading = false
                    }
                }
            },
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (loading) "Signing in..." else "Sign in")
        }
    }
}
