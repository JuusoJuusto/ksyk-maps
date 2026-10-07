package fi.ksykmaps.admin.ui.subjects

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import fi.ksykmaps.admin.data.AdminApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.*

private data class Subject(
    val id: String,
    val code: String,
    val name: String,
    val nameEn: String?,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubjectsScreen() {
    val scope = rememberCoroutineScope()
    var subjects by remember { mutableStateOf<List<Subject>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showAdd by remember { mutableStateOf(false) }
    var editTarget by remember { mutableStateOf<Subject?>(null) }
    var deleteTarget by remember { mutableStateOf<Subject?>(null) }

    suspend fun load() = withContext(Dispatchers.IO) {
        val arr = AdminApi.get("/subjects") as? JsonArray ?: return@withContext
        subjects = arr.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            Subject(
                id     = (o["id"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                code   = (o["code"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                name   = (o["name"] as? JsonPrimitive)?.contentOrNull ?: "",
                nameEn = (o["nameEn"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() },
            )
        }.sortedBy { it.code }
    }

    LaunchedEffect(Unit) {
        try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subjects", fontWeight = FontWeight.SemiBold) },
                actions = {
                    IconButton(onClick = {
                        refreshing = true
                        scope.launch {
                            try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
                            refreshing = false
                        }
                    }) { Icon(Icons.Outlined.Refresh, "Refresh") }
                    IconButton(onClick = { editTarget = null; showAdd = true }) {
                        Icon(Icons.Outlined.Add, "Add subject")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { editTarget = null; showAdd = true }) {
                Icon(Icons.Outlined.Add, "Add subject")
            }
        },
    ) { pad ->
        if (loading) {
            Box(Modifier.fillMaxSize().padding(pad), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        PullToRefreshBox(isRefreshing = refreshing, onRefresh = {
            refreshing = true
            scope.launch {
                try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
                refreshing = false
            }
        }) {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(pad),
                contentPadding = PaddingValues(12.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                item {
                    Text(
                        "${subjects.size} subject codes · used to resolve Wilma schedule summaries",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(bottom = 4.dp),
                    )
                }

                if (error != null) item {
                    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer)) {
                        Text(error!!, Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onErrorContainer)
                    }
                }

                items(subjects, key = { it.id }) { subject ->
                    SubjectRow(
                        subject = subject,
                        onEdit = { editTarget = subject; showAdd = true },
                        onDelete = { deleteTarget = subject },
                    )
                }

                if (subjects.isEmpty() && error == null) item {
                    Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                        Text("No subjects yet. Tap + to add.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }

    if (showAdd) {
        SubjectDialog(
            initial = editTarget,
            onDismiss = { showAdd = false; editTarget = null },
            onSave = { code, name, nameEn ->
                scope.launch {
                    try {
                        withContext(Dispatchers.IO) {
                            val json = buildJsonObject {
                                put("code", code)
                                put("name", name)
                                if (nameEn != null) put("nameEn", nameEn) else put("nameEn", "")
                            }.toString()
                            if (editTarget != null) {
                                AdminApi.put("/subjects/${editTarget!!.id}", json)
                            } else {
                                AdminApi.post("/subjects", json)
                            }
                        }
                        load()
                    } catch (e: Exception) { error = AdminApi.friendly(e) }
                }
                showAdd = false; editTarget = null
            },
        )
    }

    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete ${deleteTarget!!.code}?") },
            text = { Text("Subject code \"${deleteTarget!!.code}\" and its name mapping will be removed.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        val target = deleteTarget!!
                        deleteTarget = null
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) { AdminApi.delete("/subjects/${target.id}") }
                                load()
                            } catch (e: Exception) { error = AdminApi.friendly(e) }
                        }
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleteTarget = null }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SubjectRow(subject: Subject, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.secondaryContainer,
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        subject.code.take(3).uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(subject.code, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Text("·", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(subject.name, style = MaterialTheme.typography.bodyMedium)
                }
                if (subject.nameEn != null) {
                    Text(subject.nameEn, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            IconButton(onClick = onEdit, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Outlined.Edit, "Edit", Modifier.size(18.dp))
            }
            IconButton(onClick = onDelete, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Outlined.Delete, "Delete", Modifier.size(18.dp), tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SubjectDialog(
    initial: Subject?,
    onDismiss: () -> Unit,
    onSave: (code: String, name: String, nameEn: String?) -> Unit,
) {
    var code   by remember { mutableStateOf(initial?.code ?: "") }
    var name   by remember { mutableStateOf(initial?.name ?: "") }
    var nameEn by remember { mutableStateOf(initial?.nameEn ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial != null) "Edit Subject" else "Add Subject") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = code,
                    onValueChange = { if (it.length <= 20) code = it },
                    label = { Text("Subject code *") },
                    placeholder = { Text("FY") },
                    supportingText = { Text("Wilma prefix, e.g. FY matches FY1.F, FY2.A …") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Finnish name *") },
                    placeholder = { Text("Fysiikka") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                OutlinedTextField(
                    value = nameEn,
                    onValueChange = { nameEn = it },
                    label = { Text("English name (optional)") },
                    placeholder = { Text("Physics") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (code.isBlank() || name.isBlank()) return@Button
                    onSave(
                        code.trim().uppercase(),
                        name.trim(),
                        nameEn.trim().takeIf { it.isNotBlank() },
                    )
                },
            ) { Text(if (initial != null) "Update" else "Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
