// KSYK Maps Admin — native Windows WinForms application.
//
// Pure C# 5 / .NET Framework 4. Compiled with the Roslyn compiler that
// ships built-in to Windows (C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe).
// No web view, no Electron, no Python. Talks to https://ksykmaps.fi/api/*
// directly via HttpWebRequest.
//
// Build:
//   csc.exe /target:winexe /out:KSYK-Maps-Admin.exe /win32icon:icon.ico ^
//     /reference:System.Windows.Forms.dll /reference:System.Drawing.dll ^
//     /reference:System.Web.Extensions.dll Admin.cs

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace KsykAdmin
{
    // ── Tiny HTTP/JSON wrapper ─────────────────────────────────────────

    public static class Api
    {
        public static string Base = "https://ksykmaps.fi/api";
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

        static Api()
        {
            Json.MaxJsonLength = int.MaxValue;
            // TLS 1.2 — .NET 4.0 default is SSL3/TLS1.0 which Cloudflare rejects.
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
        }

        public static object Request(string path, string method = "GET", object body = null, int timeoutMs = 15000)
        {
            var req = (HttpWebRequest)WebRequest.Create(Base + path);
            req.Method = method;
            req.Accept = "application/json";
            req.UserAgent = "KSYK-Maps-Admin/1.0 (native)";
            req.Timeout = timeoutMs;
            req.ReadWriteTimeout = timeoutMs;

            if (body != null)
            {
                var payload = Encoding.UTF8.GetBytes(Json.Serialize(body));
                req.ContentType = "application/json";
                req.ContentLength = payload.Length;
                using (var s = req.GetRequestStream()) s.Write(payload, 0, payload.Length);
            }

            try
            {
                using (var resp = (HttpWebResponse)req.GetResponse())
                using (var sr = new StreamReader(resp.GetResponseStream()))
                {
                    var text = sr.ReadToEnd();
                    if (string.IsNullOrEmpty(text)) return null;
                    return Json.DeserializeObject(text);
                }
            }
            catch (WebException ex)
            {
                string body2 = "";
                if (ex.Response != null)
                {
                    using (var sr = new StreamReader(ex.Response.GetResponseStream()))
                        body2 = sr.ReadToEnd();
                }
                throw new Exception(ex.Message + (body2.Length > 0 ? ": " + body2 : ""));
            }
        }

        public static T Get<T>(object o, string key, T fallback)
        {
            var d = o as IDictionary<string, object>;
            if (d == null || !d.ContainsKey(key) || d[key] == null) return fallback;
            try { return (T)Convert.ChangeType(d[key], typeof(T)); }
            catch { return fallback; }
        }

        public static string Str(object o, string key) { return Get<string>(o, key, ""); }
        public static int Int(object o, string key)
        {
            var d = o as IDictionary<string, object>;
            if (d == null || !d.ContainsKey(key) || d[key] == null) return 0;
            try { return Convert.ToInt32(d[key]); } catch { return 0; }
        }
    }

    // ── Session / state ────────────────────────────────────────────────

    public static class Session
    {
        public static IDictionary<string, object> User;
        public static List<object> CachedRooms = new List<object>();
        public static List<object> CachedBuildings = new List<object>();
    }

    // ── Login form ─────────────────────────────────────────────────────

    public class LoginForm : Form
    {
        readonly TextBox txtEmail = new TextBox();
        readonly TextBox txtPassword = new TextBox();
        readonly Label lblStatus = new Label();
        readonly Button btnSignIn = new Button();
        public IDictionary<string, object> AuthenticatedUser;

        public LoginForm()
        {
            Text = "Sign in — KSYK Maps Admin";
            Size = new Size(420, 280);
            StartPosition = FormStartPosition.CenterScreen;
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            BackColor = SystemColors.Control;
            Font = new Font("MS Sans Serif", 9F);
            Icon = Native.LoadAppIcon();

            var grp = new GroupBox
            {
                Text = "Administrator sign-in",
                Location = new Point(12, 12),
                Size = new Size(380, 160),
            };
            Controls.Add(grp);

            var lblE = new Label { Text = "Email:", Location = new Point(14, 28), AutoSize = true };
            txtEmail.Location = new Point(14, 46);
            txtEmail.Size = new Size(350, 22);
            grp.Controls.Add(lblE);
            grp.Controls.Add(txtEmail);

            var lblP = new Label { Text = "Password:", Location = new Point(14, 78), AutoSize = true };
            txtPassword.Location = new Point(14, 96);
            txtPassword.Size = new Size(350, 22);
            txtPassword.UseSystemPasswordChar = true;
            txtPassword.KeyDown += (s, e) => { if (e.KeyCode == Keys.Enter) Attempt(); };
            grp.Controls.Add(lblP);
            grp.Controls.Add(txtPassword);

            lblStatus.Location = new Point(14, 128);
            lblStatus.Size = new Size(350, 20);
            lblStatus.ForeColor = Color.Maroon;
            grp.Controls.Add(lblStatus);

            btnSignIn.Text = "Sign in";
            btnSignIn.Size = new Size(85, 26);
            btnSignIn.Location = new Point(307, 184);
            btnSignIn.Click += (s, e) => Attempt();
            Controls.Add(btnSignIn);
            AcceptButton = btnSignIn;

            var btnCancel = new Button
            {
                Text = "Cancel",
                Size = new Size(85, 26),
                Location = new Point(216, 184),
            };
            btnCancel.Click += (s, e) => Close();
            Controls.Add(btnCancel);

            var footer = new Label
            {
                Text = "v1.0.0  ·  " + Api.Base,
                ForeColor = SystemColors.GrayText,
                Location = new Point(14, 220),
                Size = new Size(380, 16),
                Font = new Font("MS Sans Serif", 7.5F),
            };
            Controls.Add(footer);

            txtEmail.Focus();
        }

        void Attempt()
        {
            var email = txtEmail.Text.Trim();
            var password = txtPassword.Text;
            if (email.Length == 0 || password.Length == 0)
            {
                lblStatus.Text = "Email and password required.";
                lblStatus.ForeColor = Color.Maroon;
                return;
            }
            lblStatus.Text = "Signing in...";
            lblStatus.ForeColor = Color.Navy;
            btnSignIn.Enabled = false;

            var body = new Dictionary<string, object> { { "email", email }, { "password", password } };
            var t = new Thread(() =>
            {
                try
                {
                    var result = Api.Request("/auth/admin-login", "POST", body) as IDictionary<string, object>;
                    Invoke((Action)(() =>
                    {
                        btnSignIn.Enabled = true;
                        if (result != null && Api.Get<bool>(result, "success", false))
                        {
                            AuthenticatedUser = result["user"] as IDictionary<string, object>
                                              ?? new Dictionary<string, object> { { "email", email } };
                            DialogResult = DialogResult.OK;
                            Close();
                        }
                        else
                        {
                            lblStatus.Text = Api.Str(result, "message");
                            if (string.IsNullOrEmpty(lblStatus.Text)) lblStatus.Text = "Invalid credentials.";
                            lblStatus.ForeColor = Color.Maroon;
                        }
                    }));
                }
                catch (Exception ex)
                {
                    Invoke((Action)(() =>
                    {
                        btnSignIn.Enabled = true;
                        lblStatus.Text = ex.Message;
                        lblStatus.ForeColor = Color.Maroon;
                    }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }

    // ── Rooms tab ──────────────────────────────────────────────────────

    public class RoomsPanel : UserControl
    {
        readonly ListView list = new ListView();
        readonly TextBox txtQuery = new TextBox();
        readonly Label lblStatus = new Label();
        readonly Dictionary<string, TextBox> fields = new Dictionary<string, TextBox>();
        readonly string[] keys = new[] { "roomNumber", "name", "floor", "type", "mapPositionX", "mapPositionY", "width", "height" };
        readonly string[] labels = new[] { "Number", "Name", "Floor", "Type", "X", "Y", "Width", "Height" };
        List<IDictionary<string, object>> rooms = new List<IDictionary<string, object>>();
        string selectedId;

        public RoomsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            // Toolbar
            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            Controls.Add(tb);

            tb.Controls.Add(new Label { Text = "Search:", Location = new Point(8, 10), AutoSize = true });
            txtQuery.Location = new Point(60, 7);
            txtQuery.Size = new Size(220, 22);
            txtQuery.TextChanged += (s, e) => Render();
            tb.Controls.Add(txtQuery);

            var btnReload = new Button { Text = "Reload", Location = new Point(290, 6), Size = new Size(75, 24) };
            btnReload.Click += (s, e) => Reload();
            tb.Controls.Add(btnReload);

            var btnNew = new Button { Text = "New room", Location = new Point(370, 6), Size = new Size(85, 24) };
            btnNew.Click += (s, e) => NewRoom();
            tb.Controls.Add(btnNew);

            lblStatus.Location = new Point(465, 10);
            lblStatus.AutoSize = true;
            lblStatus.ForeColor = SystemColors.GrayText;
            tb.Controls.Add(lblStatus);

            // Split: list left, editor right
            var split = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Vertical,
                SplitterDistance = 600,
                FixedPanel = FixedPanel.Panel2,
            };
            Controls.Add(split);
            split.BringToFront();

            list.View = View.Details;
            list.FullRowSelect = true;
            list.MultiSelect = false;
            list.HideSelection = false;
            list.Dock = DockStyle.Fill;
            list.GridLines = true;
            list.Columns.Add("Number", 70);
            list.Columns.Add("Name", 220);
            list.Columns.Add("Floor", 50);
            list.Columns.Add("Type", 90);
            list.Columns.Add("X", 60);
            list.Columns.Add("Y", 60);
            list.Columns.Add("W", 50);
            list.Columns.Add("H", 50);
            list.SelectedIndexChanged += (s, e) => OnPick();
            split.Panel1.Controls.Add(list);

            var grp = new GroupBox
            {
                Text = "Edit room",
                Dock = DockStyle.Fill,
                Padding = new Padding(6),
            };
            split.Panel2.Controls.Add(grp);

            int y = 22;
            for (int i = 0; i < keys.Length; i++)
            {
                grp.Controls.Add(new Label { Text = labels[i] + ":", Location = new Point(10, y), AutoSize = true });
                var tx = new TextBox { Location = new Point(10, y + 18), Size = new Size(240, 22) };
                grp.Controls.Add(tx);
                fields[keys[i]] = tx;
                y += 46;
            }

            var btnSave = new Button { Text = "Save", Location = new Point(10, y + 4), Size = new Size(75, 26) };
            btnSave.Click += (s, e) => Save();
            grp.Controls.Add(btnSave);

            var btnDelete = new Button { Text = "Delete", Location = new Point(95, y + 4), Size = new Size(75, 26) };
            btnDelete.Click += (s, e) => Delete();
            grp.Controls.Add(btnDelete);

            Reload();
        }

        void Reload()
        {
            lblStatus.Text = "Loading...";
            lblStatus.ForeColor = Color.Navy;
            var t = new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/rooms") as object[];
                    var loaded = new List<IDictionary<string, object>>();
                    if (data != null) foreach (var r in data) loaded.Add(r as IDictionary<string, object>);
                    BeginInvoke((Action)(() =>
                    {
                        rooms = loaded;
                        Session.CachedRooms.Clear();
                        Session.CachedRooms.AddRange(data ?? new object[0]);
                        lblStatus.Text = rooms.Count + " rooms";
                        lblStatus.ForeColor = SystemColors.GrayText;
                        Render();
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() =>
                    {
                        lblStatus.Text = ex.Message;
                        lblStatus.ForeColor = Color.Maroon;
                    }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Render()
        {
            var q = txtQuery.Text.Trim().ToLower();
            list.BeginUpdate();
            list.Items.Clear();
            foreach (var r in rooms)
            {
                var num = Api.Str(r, "roomNumber");
                var nm = Api.Str(r, "name");
                var tp = Api.Str(r, "type");
                if (q.Length > 0 && !(num.ToLower().Contains(q) || nm.ToLower().Contains(q) || tp.ToLower().Contains(q)))
                    continue;
                var item = new ListViewItem(new[]
                {
                    num, nm, Api.Int(r, "floor").ToString(), tp,
                    Api.Int(r, "mapPositionX").ToString(), Api.Int(r, "mapPositionY").ToString(),
                    Api.Int(r, "width").ToString(), Api.Int(r, "height").ToString(),
                });
                item.Tag = Api.Str(r, "id");
                list.Items.Add(item);
            }
            list.EndUpdate();
        }

        void OnPick()
        {
            if (list.SelectedItems.Count == 0) return;
            selectedId = list.SelectedItems[0].Tag as string;
            var room = rooms.Find(r => Api.Str(r, "id") == selectedId);
            if (room == null) return;
            foreach (var kv in fields)
            {
                if (room.ContainsKey(kv.Key) && room[kv.Key] != null)
                    kv.Value.Text = room[kv.Key].ToString();
                else
                    kv.Value.Text = "";
            }
        }

        void Save()
        {
            if (string.IsNullOrEmpty(selectedId)) return;
            var patch = new Dictionary<string, object>();
            string[] numeric = { "floor", "mapPositionX", "mapPositionY", "width", "height" };
            foreach (var kv in fields)
            {
                var v = kv.Value.Text.Trim();
                if (Array.IndexOf(numeric, kv.Key) >= 0)
                {
                    if (v.Length == 0) continue;
                    int n;
                    if (!int.TryParse(v, out n))
                    {
                        MessageBox.Show(kv.Key + " must be a number.", "Validation",
                            MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        return;
                    }
                    patch[kv.Key] = n;
                }
                else patch[kv.Key] = v;
            }
            lblStatus.Text = "Saving...";
            lblStatus.ForeColor = Color.Navy;
            var id = selectedId;
            var t = new Thread(() =>
            {
                try
                {
                    Api.Request("/rooms/" + id, "PUT", patch);
                    BeginInvoke((Action)(() => { lblStatus.Text = "Saved."; lblStatus.ForeColor = Color.Green; Reload(); }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = ex.Message; lblStatus.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Delete()
        {
            if (string.IsNullOrEmpty(selectedId)) return;
            if (MessageBox.Show("Delete this room? Can't be undone.", "Confirm",
                MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
            var id = selectedId;
            var t = new Thread(() =>
            {
                try
                {
                    Api.Request("/rooms/" + id, "DELETE");
                    BeginInvoke((Action)(() => { selectedId = null; Reload(); }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = ex.Message; lblStatus.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void NewRoom()
        {
            var num = InputBox.Show("Room number:", "New room", "");
            if (string.IsNullOrEmpty(num)) return;
            var floorStr = InputBox.Show("Floor:", "New room", "1");
            int floor = 1; int.TryParse(floorStr, out floor);
            var body = new Dictionary<string, object>
            {
                { "roomNumber", num }, { "floor", floor }, { "type", "classroom" },
                { "name", "" }, { "currentStatus", "unknown" },
                { "width", 56 }, { "height", 40 },
                { "mapPositionX", 100 }, { "mapPositionY", 100 },
            };
            lblStatus.Text = "Creating...";
            var t = new Thread(() =>
            {
                try
                {
                    Api.Request("/rooms", "POST", body);
                    BeginInvoke((Action)(() => Reload()));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = ex.Message; lblStatus.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }

    // ── Buildings tab ──────────────────────────────────────────────────

    public class BuildingsPanel : UserControl
    {
        readonly ListView list = new ListView();
        public BuildingsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Campus buildings", Location = new Point(8, 10), AutoSize = true });
            var btn = new Button { Text = "Reload", Location = new Point(140, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            list.View = View.Details;
            list.FullRowSelect = true;
            list.GridLines = true;
            list.Dock = DockStyle.Fill;
            list.Columns.Add("Name", 220);
            list.Columns.Add("Type", 180);
            list.Columns.Add("Rooms", 100);
            Controls.Add(list);
            list.BringToFront();

            Load();
        }

        void Load()
        {
            var t = new Thread(() =>
            {
                try
                {
                    var buildings = Api.Request("/buildings") as object[];
                    var rooms = Session.CachedRooms.Count > 0
                                    ? Session.CachedRooms.ToArray()
                                    : Api.Request("/rooms") as object[];
                    var counts = new Dictionary<string, int>();
                    if (rooms != null)
                        foreach (var r in rooms)
                        {
                            var bid = Api.Str(r as IDictionary<string, object>, "buildingId");
                            if (!string.IsNullOrEmpty(bid))
                                counts[bid] = (counts.ContainsKey(bid) ? counts[bid] : 0) + 1;
                        }
                    BeginInvoke((Action)(() =>
                    {
                        list.BeginUpdate();
                        list.Items.Clear();
                        if (buildings != null) foreach (var b in buildings)
                            {
                                var d = b as IDictionary<string, object>;
                                var id = Api.Str(d, "id");
                                list.Items.Add(new ListViewItem(new[]
                                {
                                    Api.Str(d, "name"),
                                    Api.Str(d, "type"),
                                    (counts.ContainsKey(id) ? counts[id] : 0).ToString(),
                                }));
                            }
                        list.EndUpdate();
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => MessageBox.Show(ex.Message, "API error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error)));
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }

    // ── Tickets tab ────────────────────────────────────────────────────

    public class TicketsPanel : UserControl
    {
        readonly ListView list = new ListView();
        List<IDictionary<string, object>> tickets = new List<IDictionary<string, object>>();

        public TicketsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Support tickets", Location = new Point(8, 10), AutoSize = true });
            var btn = new Button { Text = "Reload", Location = new Point(140, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            list.View = View.Details;
            list.FullRowSelect = true;
            list.GridLines = true;
            list.Dock = DockStyle.Fill;
            list.Columns.Add("ID", 160);
            list.Columns.Add("Type", 70);
            list.Columns.Add("Status", 90);
            list.Columns.Add("Title", 280);
            list.Columns.Add("Email", 200);
            list.Columns.Add("Created", 140);
            list.DoubleClick += (s, e) => OpenSelected();
            Controls.Add(list);
            list.BringToFront();

            Load();
        }

        void Load()
        {
            var t = new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/tickets") as object[];
                    var loaded = new List<IDictionary<string, object>>();
                    if (data != null) foreach (var x in data) loaded.Add(x as IDictionary<string, object>);
                    BeginInvoke((Action)(() => { tickets = loaded; Render(); }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => MessageBox.Show(ex.Message, "API error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error)));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Render()
        {
            list.BeginUpdate();
            list.Items.Clear();
            foreach (var t in tickets)
            {
                var created = Api.Str(t, "createdAt");
                if (created.Length > 19) created = created.Substring(0, 19).Replace("T", " ");
                var item = new ListViewItem(new[]
                {
                    Api.Str(t, "ticketId"), Api.Str(t, "type").ToUpper(),
                    Api.Str(t, "status").ToUpper(), Api.Str(t, "title"),
                    Api.Str(t, "email"), created,
                });
                item.Tag = Api.Str(t, "id");
                list.Items.Add(item);
            }
            list.EndUpdate();
        }

        void OpenSelected()
        {
            if (list.SelectedItems.Count == 0) return;
            var id = list.SelectedItems[0].Tag as string;
            var t = tickets.Find(x => Api.Str(x, "id") == id);
            if (t == null) return;
            var msg = string.Format(
                "Ticket: {0}\r\nType:   {1}\r\nStatus: {2}\r\nFrom:   {3} <{4}>\r\nTitle:  {5}\r\n\r\n{6}",
                Api.Str(t, "ticketId"), Api.Str(t, "type"), Api.Str(t, "status"),
                Api.Str(t, "name"), Api.Str(t, "email"), Api.Str(t, "title"),
                Api.Str(t, "description"));
            MessageBox.Show(msg, "Ticket " + Api.Str(t, "ticketId"));
        }
    }

    // ── Analytics tab ──────────────────────────────────────────────────

    public class AnalyticsPanel : UserControl
    {
        readonly Label v24h = new Label();
        readonly Label pv24h = new Label();
        readonly Label sessions = new Label();
        readonly Label avgDuration = new Label();
        readonly Label cfLine = new Label();
        readonly Label fsLine = new Label();
        string range = "24h";

        public AnalyticsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Range:", Location = new Point(8, 10), AutoSize = true });
            int x = 60;
            foreach (var r in new[] { "24h", "7d", "30d" })
            {
                var rb = new RadioButton { Text = r, Location = new Point(x, 8), Size = new Size(50, 22), Checked = r == "24h", Tag = r };
                rb.CheckedChanged += (s, e) => { if (((RadioButton)s).Checked) { range = (string)((RadioButton)s).Tag; Load(); } };
                tb.Controls.Add(rb);
                x += 55;
            }
            var btn = new Button { Text = "Reload", Location = new Point(x + 10, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            var stats = new Panel { Dock = DockStyle.Top, Height = 110, Padding = new Padding(10) };
            Controls.Add(stats);
            stats.BringToFront();

            stats.Controls.Add(MakeCard("Visitors", v24h, 10));
            stats.Controls.Add(MakeCard("Pageviews", pv24h, 240));
            stats.Controls.Add(MakeCard("Sessions", sessions, 470));
            stats.Controls.Add(MakeCard("Avg duration (s)", avgDuration, 700));

            var ext = new GroupBox
            {
                Text = "External providers",
                Dock = DockStyle.Fill,
                Padding = new Padding(10),
            };
            Controls.Add(ext);
            ext.BringToFront();

            cfLine.Location = new Point(10, 25); cfLine.AutoSize = true;
            fsLine.Location = new Point(10, 50); fsLine.AutoSize = true;
            ext.Controls.Add(cfLine);
            ext.Controls.Add(fsLine);

            Load();
        }

        GroupBox MakeCard(string title, Label value, int x)
        {
            var g = new GroupBox { Text = title, Location = new Point(x, 0), Size = new Size(220, 90) };
            value.Font = new Font("MS Sans Serif", 18F, FontStyle.Bold);
            value.ForeColor = Color.Navy;
            value.Location = new Point(12, 30);
            value.AutoSize = true;
            value.Text = "—";
            g.Controls.Add(value);
            return g;
        }

        void Load()
        {
            v24h.Text = pv24h.Text = sessions.Text = avgDuration.Text = "...";
            cfLine.Text = fsLine.Text = "Loading...";
            var r = range;
            var t = new Thread(() =>
            {
                try
                {
                    var summary = Api.Request("/analytics/summary?range=" + r) as IDictionary<string, object>;
                    var external = Api.Request("/analytics/external?range=" + r) as IDictionary<string, object>;
                    BeginInvoke((Action)(() => Render(summary, external)));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => MessageBox.Show(ex.Message, "API error",
                        MessageBoxButtons.OK, MessageBoxIcon.Error)));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Render(IDictionary<string, object> summary, IDictionary<string, object> external)
        {
            int vv = Api.Int(summary, "totalVisitors");
            if (vv == 0) vv = Api.Int(summary, "uniqueVisitors");
            if (vv == 0) vv = Api.Int(summary, "visitors24h");
            v24h.Text = vv.ToString("N0");

            int pp = Api.Int(summary, "pageviews");
            if (pp == 0) pp = Api.Int(summary, "pageviews24h");
            pv24h.Text = pp.ToString("N0");

            sessions.Text = Api.Int(summary, "sessions").ToString("N0");
            avgDuration.Text = Api.Int(summary, "avgSessionDuration").ToString();

            cfLine.Text = ProviderLine("Cloudflare", external == null ? null : external["cloudflare"] as IDictionary<string, object>);
            fsLine.Text = ProviderLine("Firestore (own)", external == null ? null : external["firestore"] as IDictionary<string, object>);
        }

        string ProviderLine(string name, IDictionary<string, object> snap)
        {
            if (snap == null || !Api.Get<bool>(snap, "configured", false))
                return name + ": not configured";
            var err = Api.Str(snap, "error");
            if (!string.IsNullOrEmpty(err)) return name + ": error — " + err;
            int v = Api.Int(snap, "visitors24h"); if (v == 0) v = Api.Int(snap, "visitors7d");
            int p = Api.Int(snap, "pageviews24h"); if (p == 0) p = Api.Int(snap, "pageviews7d");
            return name + ": " + v + " visitors · " + p + " pageviews";
        }
    }

    // ── WiFi scan tab ──────────────────────────────────────────────────

    public class WifiPanel : UserControl
    {
        readonly ListView list = new ListView();
        readonly Label lblStatus = new Label();
        List<string[]> rows = new List<string[]>();

        public WifiPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "WiFi scan (for beacon survey)", Location = new Point(8, 10), AutoSize = true });
            var btnScan = new Button { Text = "Scan", Location = new Point(200, 6), Size = new Size(75, 24) };
            btnScan.Click += (s, e) => Scan();
            tb.Controls.Add(btnScan);
            var btnCopy = new Button { Text = "Copy", Location = new Point(280, 6), Size = new Size(75, 24) };
            btnCopy.Click += (s, e) => Copy();
            tb.Controls.Add(btnCopy);
            Controls.Add(tb);

            lblStatus.Dock = DockStyle.Bottom;
            lblStatus.Height = 22;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Padding = new Padding(8, 0, 0, 0);
            lblStatus.ForeColor = SystemColors.GrayText;
            lblStatus.Text = "Idle.";
            Controls.Add(lblStatus);

            list.View = View.Details;
            list.FullRowSelect = true;
            list.GridLines = true;
            list.Dock = DockStyle.Fill;
            list.Columns.Add("SSID", 220);
            list.Columns.Add("BSSID", 160);
            list.Columns.Add("RSSI (dBm)", 90);
            list.Columns.Add("Signal", 80);
            Controls.Add(list);
            list.BringToFront();
        }

        void Scan()
        {
            lblStatus.Text = "Scanning...";
            lblStatus.ForeColor = Color.Navy;
            var t = new Thread(() =>
            {
                try
                {
                    var psi = new ProcessStartInfo("netsh", "wlan show networks mode=bssid")
                    {
                        UseShellExecute = false,
                        RedirectStandardOutput = true,
                        CreateNoWindow = true,
                    };
                    var p = Process.Start(psi);
                    var output = p.StandardOutput.ReadToEnd();
                    p.WaitForExit(15000);
                    var parsed = Parse(output);
                    BeginInvoke((Action)(() => Render(parsed)));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = ex.Message; lblStatus.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        List<string[]> Parse(string text)
        {
            var nets = new List<string[]>();
            string ssid = "", bssid = "";
            int signal = 0;

            Action flush = () =>
            {
                if (bssid.Length > 0)
                {
                    int rssi = (int)Math.Round(-100 + signal * 0.5);
                    nets.Add(new[] { ssid, bssid, rssi.ToString() + " dBm", signal + "%" });
                }
                bssid = ""; signal = 0;
            };

            foreach (var rawLine in text.Split('\n'))
            {
                var line = rawLine.Trim();
                var m = System.Text.RegularExpressions.Regex.Match(line, @"^SSID\s+\d+\s*:\s*(.*)$");
                if (m.Success) { flush(); ssid = m.Groups[1].Value.Trim(); continue; }
                m = System.Text.RegularExpressions.Regex.Match(line, @"^BSSID\s+\d+\s*:\s*([0-9a-fA-F:]+)$");
                if (m.Success) { flush(); bssid = m.Groups[1].Value.ToLower(); continue; }
                m = System.Text.RegularExpressions.Regex.Match(line, @"^Signal\s*:\s*(\d+)%");
                if (m.Success && bssid.Length > 0) signal = int.Parse(m.Groups[1].Value);
            }
            flush();
            nets.Sort((a, b) =>
            {
                int sa = int.Parse(a[3].TrimEnd('%'));
                int sb = int.Parse(b[3].TrimEnd('%'));
                return sb - sa;
            });
            return nets;
        }

        void Render(List<string[]> nets)
        {
            rows = nets;
            list.BeginUpdate();
            list.Items.Clear();
            foreach (var r in nets)
            {
                var lvi = new ListViewItem(new[] { r[0].Length > 0 ? r[0] : "(hidden)", r[1], r[2], r[3] });
                list.Items.Add(lvi);
            }
            list.EndUpdate();
            lblStatus.Text = string.Format("Found {0} BSSID(s). Use Copy to paste into BeaconSurveyor at ksykmaps.fi/admin/beacons.", nets.Count);
            lblStatus.ForeColor = Color.Green;
        }

        void Copy()
        {
            if (rows.Count == 0) return;
            var sb = new StringBuilder();
            foreach (var r in rows)
            {
                int rssi = int.Parse(r[2].Split(' ')[0]);
                sb.AppendLine(string.Format("{0} {1} {2}", r[1], rssi, r[0]).Trim());
            }
            Clipboard.SetText(sb.ToString());
            lblStatus.Text = "Copied " + rows.Count + " line(s) to clipboard.";
            lblStatus.ForeColor = Color.Green;
        }
    }

    // ── System health tab ──────────────────────────────────────────────

    public class SystemPanel : UserControl
    {
        readonly TextBox text = new TextBox();
        public SystemPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Server health & environment", Location = new Point(8, 10), AutoSize = true });
            var btn = new Button { Text = "Reload", Location = new Point(220, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            text.Multiline = true;
            text.ScrollBars = ScrollBars.Vertical;
            text.Font = new Font("Consolas", 9F);
            text.Dock = DockStyle.Fill;
            text.ReadOnly = true;
            text.BackColor = Color.White;
            Controls.Add(text);
            text.BringToFront();

            Load();
        }

        void Load()
        {
            text.Text = "Probing " + Api.Base + " ...";
            var t = new Thread(() =>
            {
                var sb = new StringBuilder();
                sb.AppendLine("API base: " + Api.Base + Environment.NewLine);
                TryProbe(sb, "Root", "");
                TryProbe(sb, "Email diagnostic", "/email-diagnostic");
                TryProbe(sb, "Client info", "/client-info");
                BeginInvoke((Action)(() => text.Text = sb.ToString()));
            });
            t.IsBackground = true;
            t.Start();
        }

        void TryProbe(StringBuilder sb, string label, string path)
        {
            sb.AppendLine("== " + label + " ==");
            try
            {
                var raw = Api.Request(path);
                var json = new JavaScriptSerializer().Serialize(raw);
                sb.AppendLine(json);
            }
            catch (Exception ex)
            {
                sb.AppendLine("ERROR — " + ex.Message);
            }
            sb.AppendLine();
        }
    }

    // ── Main shell ─────────────────────────────────────────────────────

    public class MainForm : Form
    {
        readonly TabControl tabs = new TabControl();
        readonly IDictionary<string, object> user;

        public MainForm(IDictionary<string, object> u)
        {
            user = u;
            Session.User = u;

            Text = "KSYK Maps Admin — " + Api.Str(u, "email");
            Size = new Size(1150, 720);
            MinimumSize = new Size(900, 600);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = SystemColors.Control;
            Font = new Font("MS Sans Serif", 9F);
            Icon = Native.LoadAppIcon();

            // Menu strip
            var menu = new MenuStrip();
            var file = new ToolStripMenuItem("&File");
            file.DropDownItems.Add("&About", null, (s, e) => MessageBox.Show(
                "KSYK Maps Admin\r\nVersion 1.0.0\r\n\r\nNative Windows admin client.\r\nConnects to " + Api.Base + "\r\n\r\n© 2026 Nordbyte Studio",
                "About"));
            file.DropDownItems.Add("E&xit", null, (s, e) => Close());
            menu.Items.Add(file);
            var act = new ToolStripMenuItem("&Account");
            act.DropDownItems.Add("&Sign out", null, (s, e) => { DialogResult = DialogResult.Retry; Close(); });
            menu.Items.Add(act);
            MainMenuStrip = menu;
            Controls.Add(menu);

            // Tabs
            tabs.Dock = DockStyle.Fill;
            tabs.Appearance = TabAppearance.Normal;
            tabs.TabPages.Add(MakeTab("Rooms", new RoomsPanel()));
            tabs.TabPages.Add(MakeTab("Buildings", new BuildingsPanel()));
            tabs.TabPages.Add(MakeTab("Tickets", new TicketsPanel()));
            tabs.TabPages.Add(MakeTab("Analytics", new AnalyticsPanel()));
            tabs.TabPages.Add(MakeTab("WiFi Scan", new WifiPanel()));
            tabs.TabPages.Add(MakeTab("System", new SystemPanel()));
            Controls.Add(tabs);
            tabs.BringToFront();

            // Status strip
            var ss = new StatusStrip();
            ss.Items.Add(new ToolStripStatusLabel("Connected to " + Api.Base));
            Controls.Add(ss);
        }

        TabPage MakeTab(string title, UserControl uc)
        {
            var p = new TabPage(title) { BackColor = SystemColors.Control };
            p.Controls.Add(uc);
            return p;
        }
    }

    // ── Helpers ────────────────────────────────────────────────────────

    public static class Native
    {
        public static Icon LoadAppIcon()
        {
            try
            {
                using (var s = System.Reflection.Assembly.GetExecutingAssembly()
                            .GetManifestResourceStream("KsykAdmin.app.ico"))
                {
                    if (s != null) return new Icon(s);
                }
            }
            catch { }
            return SystemIcons.Application;
        }
    }

    public class InputBox
    {
        public static string Show(string prompt, string title, string defaultValue)
        {
            using (var f = new Form())
            {
                f.Text = title;
                f.Size = new Size(360, 150);
                f.StartPosition = FormStartPosition.CenterParent;
                f.FormBorderStyle = FormBorderStyle.FixedDialog;
                f.MaximizeBox = false;
                f.MinimizeBox = false;
                f.BackColor = SystemColors.Control;
                var lbl = new Label { Text = prompt, Location = new Point(12, 12), AutoSize = true };
                var tx = new TextBox { Text = defaultValue, Location = new Point(12, 36), Size = new Size(320, 22) };
                var ok = new Button { Text = "OK", Location = new Point(166, 72), Size = new Size(75, 26), DialogResult = DialogResult.OK };
                var cancel = new Button { Text = "Cancel", Location = new Point(247, 72), Size = new Size(75, 26), DialogResult = DialogResult.Cancel };
                f.Controls.AddRange(new Control[] { lbl, tx, ok, cancel });
                f.AcceptButton = ok;
                f.CancelButton = cancel;
                return f.ShowDialog() == DialogResult.OK ? tx.Text : null;
            }
        }
    }

    // ── Entry point ────────────────────────────────────────────────────

    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            // Override base URL via env var (for dev/staging).
            var envBase = Environment.GetEnvironmentVariable("KSYK_API_BASE");
            if (!string.IsNullOrEmpty(envBase)) Api.Base = envBase;

            // Honour any self-signed cert if dev wants HTTP — same behaviour
            // as a browser would have.
            Application.SetCompatibleTextRenderingDefault(false);
            // NOTE: not calling EnableVisualStyles() — keeps the classic
            // chunky Win9x look the user explicitly asked for.

            while (true)
            {
                var login = new LoginForm();
                if (login.ShowDialog() != DialogResult.OK) return;

                var shell = new MainForm(login.AuthenticatedUser);
                shell.ShowDialog();
                // If shell returned DialogResult.Retry, sign out and loop;
                // otherwise quit.
                if (shell.DialogResult != DialogResult.Retry) return;
            }
        }
    }
}
