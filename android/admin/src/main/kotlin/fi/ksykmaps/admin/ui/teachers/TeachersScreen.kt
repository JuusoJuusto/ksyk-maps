package fi.ksykmaps.admin.ui.teachers

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

private data class StaffMember(
    val id: String,
    val firstName: String,
    val lastName: String,
    val abbrev: String?,
    val position: String?,
    val department: String?,
    val isActive: Boolean,
    val wilmaProfileUrl: String?,
) {
    val fullName get() = "$firstName $lastName"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeachersScreen() {
    val scope = rememberCoroutineScope()
    var staff by remember { mutableStateOf<List<StaffMember>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var showAdd by remember { mutableStateOf(false) }
    var editTarget by remember { mutableStateOf<StaffMember?>(null) }
    var deleteTarget by remember { mutableStateOf<StaffMember?>(null) }

    suspend fun load() = withContext(Dispatchers.IO) {
        val arr = AdminApi.get("/staff") as? JsonArray ?: return@withContext
        staff = arr.mapNotNull { el ->
            val o = el as? JsonObject ?: return@mapNotNull null
            StaffMember(
                id              = (o["id"] as? JsonPrimitive)?.contentOrNull ?: return@mapNotNull null,
                firstName       = (o["firstName"] as? JsonPrimitive)?.contentOrNull ?: "",
                lastName        = (o["lastName"] as? JsonPrimitive)?.contentOrNull ?: "",
                abbrev          = (o["abbrev"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() },
                position        = (o["position"] as? JsonPrimitive)?.contentOrNull,
                department      = (o["department"] as? JsonPrimitive)?.contentOrNull,
                isActive        = (o["isActive"] as? JsonPrimitive)?.booleanOrNull ?: true,
                wilmaProfileUrl = (o["wilmaProfileUrl"] as? JsonPrimitive)?.contentOrNull?.takeIf { it.isNotBlank() },
            )
        }.sortedWith(compareBy({ !it.isActive }, { it.lastName }, { it.firstName }))
    }

    LaunchedEffect(Unit) {
        try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
        loading = false
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Teachers", fontWeight = FontWeight.SemiBold) },
                actions = {
                    IconButton(onClick = {
                        refreshing = true
                        scope.launch {
                            try { load() } catch (e: Exception) { error = AdminApi.friendly(e) }
                            refreshing = false
                        }
                    }) { Icon(Icons.Outlined.Refresh, "Refresh") }
                    IconButton(onClick = { editTarget = null; showAdd = true }) {
                        Icon(Icons.Outlined.PersonAdd, "Add teacher")
                    }
                },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { editTarget = null; showAdd = true }) {
                Icon(Icons.Outlined.Add, "Add teacher")
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
                        "${staff.count { it.abbrev != null }} / ${staff.size} have Wilma abbreviation",
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

                items(staff, key = { it.id }) { member ->
                    StaffRow(
                        member = member,
                        onEdit = { editTarget = member; showAdd = true },
                        onDelete = { deleteTarget = member },
                    )
                }

                if (staff.isEmpty() && error == null) item {
                    Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                        Text("No staff yet. Tap + to add.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }

    // Add/edit dialog
    if (showAdd) {
        StaffDialog(
            initial = editTarget,
            onDismiss = { showAdd = false; editTarget = null },
            onSave = { form ->
                scope.launch {
                    try {
                        withContext(Dispatchers.IO) {
                            val json = buildJsonObject {
                                put("firstName", form.firstName)
                                put("lastName", form.lastName)
                                if (form.abbrev != null) put("abbrev", form.abbrev) else put("abbrev", "")
                                if (form.position != null) put("position", form.position)
                                if (form.department != null) put("department", form.department)
                                if (form.wilmaProfileUrl != null) put("wilmaProfileUrl", form.wilmaProfileUrl) else put("wilmaProfileUrl", "")
                                put("isActive", form.isActive)
                            }.toString()
                            if (editTarget != null) {
                                AdminApi.put("/staff/${editTarget!!.id}", json)
                            } else {
                                AdminApi.post("/staff", json)
                            }
                        }
                        load()
                    } catch (e: Exception) { error = AdminApi.friendly(e) }
                }
                showAdd = false; editTarget = null
            },
        )
    }

    // Delete confirmation
    if (deleteTarget != null) {
        AlertDialog(
            onDismissRequest = { deleteTarget = null },
            title = { Text("Delete ${deleteTarget!!.fullName}?") },
            text = { Text("This removes them from the public directory and any schedule lookup.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        val target = deleteTarget!!
                        deleteTarget = null
                        scope.launch {
                            try {
                                withContext(Dispatchers.IO) { AdminApi.delete("/staff/${target.id}") }
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
private fun StaffRow(member: StaffMember, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = MaterialTheme.shapes.small,
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        "${member.firstName.firstOrNull() ?: ""}${member.lastName.firstOrNull() ?: ""}".uppercase(),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(member.fullName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    if (member.abbrev != null) {
                        SuggestionChip(
                            onClick = {},
                            label = { Text(member.abbrev, style = MaterialTheme.typography.labelSmall) },
                            modifier = Modifier.height(22.dp),
                        )
                    }
                    if (!member.isActive) {
                        Badge(containerColor = MaterialTheme.colorScheme.surfaceVariant) {
                            Text("Inactive", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                val sub = listOfNotNull(member.position, member.department).joinToString(" · ")
                if (sub.isNotBlank()) {
                    Text(sub, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

private data class StaffForm(
    val firstName: String,
    val lastName: String,
    val abbrev: String?,
    val position: String?,
    val department: String?,
    val isActive: Boolean,
    val wilmaProfileUrl: String?,
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffDialog(initial: StaffMember?, onDismiss: () -> Unit, onSave: (StaffForm) -> Unit) {
    var firstName       by remember { mutableStateOf(initial?.firstName ?: "") }
    var lastName        by remember { mutableStateOf(initial?.lastName ?: "") }
    var abbrev          by remember { mutableStateOf(initial?.abbrev ?: "") }
    var wilmaProfileUrl by remember { mutableStateOf(initial?.wilmaProfileUrl ?: "") }
    var position        by remember { mutableStateOf(initial?.position ?: "") }
    var department      by remember { mutableStateOf(initial?.department ?: "") }
    var isActive        by remember { mutableStateOf(initial?.isActive ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial != null) "Edit Teacher" else "Add Teacher") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = firstName,
                        onValueChange = { firstName = it },
                        label = { Text("First name *") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = MaterialTheme.shapes.medium,
                    )
                    OutlinedTextField(
                        value = lastName,
                        onValueChange = { lastName = it },
                        label = { Text("Last name *") },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = MaterialTheme.shapes.medium,
                    )
                }
                OutlinedTextField(
                    value = abbrev,
                    onValueChange = { if (it.length <= 10) abbrev = it },
                    label = { Text("Wilma abbreviation") },
                    placeholder = { Text("JLä") },
                    supportingText = { Text("Shown as (JLä) in Wilma schedule summaries") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                OutlinedTextField(
                    value = wilmaProfileUrl,
                    onValueChange = { wilmaProfileUrl = it },
                    label = { Text("Wilma profile URL") },
                    placeholder = { Text("https://ksyk.inschool.fi/profiles/...") },
                    supportingText = { Text("Link opens from schedule card teacher name") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                OutlinedTextField(
                    value = position,
                    onValueChange = { position = it },
                    label = { Text("Position") },
                    placeholder = { Text("Lehtori") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                OutlinedTextField(
                    value = department,
                    onValueChange = { department = it },
                    label = { Text("Department") },
                    placeholder = { Text("Luonnontieteet") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                )
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Active", style = MaterialTheme.typography.bodyMedium)
                    Switch(checked = isActive, onCheckedChange = { isActive = it })
                }
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (firstName.isBlank() || lastName.isBlank()) return@Button
                    onSave(StaffForm(
                        firstName       = firstName.trim(),
                        lastName        = lastName.trim(),
                        abbrev          = abbrev.trim().takeIf { it.isNotBlank() },
                        position        = position.trim().takeIf { it.isNotBlank() },
                        department      = department.trim().takeIf { it.isNotBlank() },
                        isActive        = isActive,
                        wilmaProfileUrl = wilmaProfileUrl.trim().takeIf { it.isNotBlank() },
                    ))
                },
            ) { Text(if (initial != null) "Update" else "Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
