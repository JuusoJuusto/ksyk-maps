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

    /// <summary>
    /// HTTP / JSON helper used by every API panel. Carries the auth token
    /// across requests, mimics a real Chrome browser so Cloudflare's bot
    /// fight doesn't 429 us, and translates non-2xx + JSON-shaped errors
    /// into a single <see cref="ApiException"/> the panels can render.
    /// </summary>
    public static class Api
    {
        public static string Base = "https://ksykmaps.fi/api";
        public static string SessionEmail = "";
        public static string SessionPassword = "";
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

        // Modern Chrome on Win10 — Cloudflare Bot Fight Mode whitelists the
        // exact UA pattern + sec-fetch headers a real Chromium sends.
        const string ChromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                              + "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

        static Api()
        {
            Json.MaxJsonLength = int.MaxValue;
            // TLS 1.2 — .NET 4.0 default is SSL3/TLS1.0 which Cloudflare rejects.
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072
                                                 | (SecurityProtocolType)12288;  // TLS 1.3 if available
            ServicePointManager.DefaultConnectionLimit = 16;
        }

        public static object Request(string path, string method = "GET", object body = null, int timeoutMs = 20000)
        {
            return RequestRaw(path, method, body, timeoutMs, false);
        }

        /// <summary>Returns null on 404 instead of throwing — for optional endpoints.</summary>
        public static object RequestOrNull(string path)
        {
            try { return RequestRaw(path, "GET", null, 12000, false); }
            catch (ApiException e)
            {
                if (e.StatusCode == 404 || e.StatusCode == 0) return null;
                return null;
            }
            catch { return null; }
        }

        static object RequestRaw(string path, string method, object body, int timeoutMs, bool isRetry)
        {
            var req = (HttpWebRequest)WebRequest.Create(Base + path);
            req.Method = method;
            req.Accept = "application/json, text/plain, */*";
            req.UserAgent = ChromeUA;
            req.Timeout = timeoutMs;
            req.ReadWriteTimeout = timeoutMs;
            req.KeepAlive = true;
            // Browser-like headers to defeat over-eager bot detection.
            req.Headers.Add("Accept-Language", "en-US,en;q=0.9,fi;q=0.8");
            req.Headers.Add("sec-ch-ua", "\"Chromium\";v=\"130\", \"Not-A.Brand\";v=\"99\", \"Google Chrome\";v=\"130\"");
            req.Headers.Add("sec-ch-ua-mobile", "?0");
            req.Headers.Add("sec-ch-ua-platform", "\"Windows\"");
            req.Headers.Add("Sec-Fetch-Site", "same-origin");
            req.Headers.Add("Sec-Fetch-Mode", "cors");
            req.Headers.Add("Sec-Fetch-Dest", "empty");
            req.Referer = "https://ksykmaps.fi/admin";
            // Custom client tag the user can pin a Cloudflare WAF allow-rule
            // to ("if header X-KSYK-Client present → skip Bot Fight").
            req.Headers.Add("X-KSYK-Client", "KSYK-Maps-Admin/1.0");

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
                int status = 0;
                string raw = "";
                var hr = ex.Response as HttpWebResponse;
                if (hr != null)
                {
                    status = (int)hr.StatusCode;
                    try { using (var sr = new StreamReader(ex.Response.GetResponseStream())) raw = sr.ReadToEnd(); }
                    catch { }
                }

                // 429 from Cloudflare: pause and retry once with a small backoff.
                if (status == 429 && !isRetry)
                {
                    Thread.Sleep(1500);
                    return RequestRaw(path, method, body, timeoutMs, true);
                }

                // Try to surface the server's message field if it's JSON.
                string nice = ex.Message;
                if (raw.Length > 0)
                {
                    try
                    {
                        var parsed = Json.DeserializeObject(raw) as IDictionary<string, object>;
                        if (parsed != null && parsed.ContainsKey("message"))
                            nice = parsed["message"].ToString();
                    }
                    catch { /* not JSON; fall back to message */ }
                }
                throw new ApiException(status, nice, raw);
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

        /// <summary>Friendly error message, including hints for common Cloudflare blocks.</summary>
        public static string Friendly(Exception ex)
        {
            var ae = ex as ApiException;
            if (ae == null) return ex.Message;
            switch (ae.StatusCode)
            {
                case 429:
                    return "Server is rate-limiting requests (429). Wait a moment and try again. "
                         + "If this keeps happening, add a Cloudflare WAF allow-rule for header X-KSYK-Client.";
                case 404:
                    return "Endpoint not deployed (404). Production might be running an older API build.";
                case 401:
                    return "Not signed in (401). Re-open the app to sign in.";
                case 403:
                    return "Forbidden (403). Your account doesn't have permission for this action.";
                case 500:
                case 502:
                case 503:
                case 504:
                    return "Server error (" + ae.StatusCode + "). Try again in a moment.";
                case 0:
                    return "Couldn't reach the server. Check your internet connection.";
                default:
                    return ae.Message;
            }
        }
    }

    /// <summary>Carries the HTTP status code so panels can branch on it.</summary>
    public class ApiException : Exception
    {
        public int StatusCode { get; private set; }
        public string RawBody { get; private set; }
        public ApiException(int status, string message, string raw) : base(message)
        {
            StatusCode = status;
            RawBody = raw;
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
                            Api.SessionEmail = email;
                            Api.SessionPassword = password;
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
                        lblStatus.Text = Api.Friendly(ex);
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
                        lblStatus.Text = Api.Friendly(ex);
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
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
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
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
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
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
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
                    BeginInvoke((Action)(() => MessageBox.Show(Api.Friendly(ex), "API error",
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
                    BeginInvoke((Action)(() => MessageBox.Show(Api.Friendly(ex), "API error",
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
                    BeginInvoke((Action)(() => MessageBox.Show(Api.Friendly(ex), "API error",
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

    // ── Smart Beacon Survey tab ────────────────────────────────────────
    //
    // The killer feature: pick a room, walk to a spot, hit Capture. The
    // app does everything else — reads the high-precision GPS from the
    // Windows Location API, runs `netsh wlan show networks mode=bssid` to
    // grab every BSSID in range, uploads the reading and a dot appears on
    // the campus map in real time. When the room has at least 4 captures
    // that look like corners, the app auto-labels them NW/NE/SW/SE from
    // the centroid + sign and draws the connecting outline. No manual
    // corner picking. No paste-from-phone. Same Firestore the web admin
    // and any phone client read.

    public class WifiPanel : UserControl
    {
        readonly ListView roomList = new ListView();
        readonly TextBox txtSearch = new TextBox();
        readonly Button btnRoomReload = new Button();
        readonly Button btnCapture = new Button();
        readonly Button btnDelete = new Button();
        readonly Button btnAutoMode = new Button();
        readonly Label lblStatus = new Label();
        readonly Label lblGps = new Label();
        readonly Label lblScan = new Label();
        readonly Label lblRoomTitle = new Label();
        readonly Label lblPositions = new Label();
        readonly CampusMapView campusMap = new CampusMapView();
        readonly ListView positionsList = new ListView();

        // Background workers
        System.Device.Location.GeoCoordinateWatcher gpsWatcher;
        System.Windows.Forms.Timer autoTimer;
        bool autoMode = false;
        DateTime lastCapture = DateTime.MinValue;

        // Current state
        List<IDictionary<string, object>> rooms = new List<IDictionary<string, object>>();
        List<object> buildings = new List<object>();
        IDictionary<string, object> selectedRoom;
        List<IDictionary<string, object>> positions = new List<IDictionary<string, object>>();

        // Latest scan / GPS fix
        List<string[]> lastScanRows = new List<string[]>();
        double lastLat = 0, lastLng = 0, lastAccuracy = 0;
        bool hasGps = false;

        public WifiPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            // ── Status bar (bottom) ─────────────────────────────────
            lblStatus.Dock = DockStyle.Bottom;
            lblStatus.Height = 22;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Padding = new Padding(8, 0, 0, 0);
            lblStatus.ForeColor = SystemColors.GrayText;
            lblStatus.Text = "Idle. Start GPS to begin.";
            Controls.Add(lblStatus);

            // ── Toolbar (top) ───────────────────────────────────────
            var tb = new Panel { Dock = DockStyle.Top, Height = 36, BackColor = SystemColors.Control };
            tb.Controls.Add(new Label { Text = "Smart beacon survey — pick a room, walk + capture, the app figures out the rest.", Location = new Point(10, 11), AutoSize = true });
            Controls.Add(tb);

            // ── Main split: rooms | map+controls ────────────────────
            var split1 = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Vertical,
                SplitterDistance = 240,
                FixedPanel = FixedPanel.Panel1,
            };
            Controls.Add(split1);
            split1.BringToFront();

            // ── Left: room picker ───────────────────────────────────
            var left = new Panel { Dock = DockStyle.Fill, BackColor = SystemColors.Control, Padding = new Padding(6) };
            split1.Panel1.Controls.Add(left);

            var leftBar = new Panel { Dock = DockStyle.Top, Height = 30 };
            leftBar.Controls.Add(new Label { Text = "Room:", Location = new Point(0, 6), AutoSize = true });
            txtSearch.Location = new Point(46, 4);
            txtSearch.Size = new Size(140, 22);
            txtSearch.TextChanged += (s, e) => RenderRoomList();
            leftBar.Controls.Add(txtSearch);
            btnRoomReload.Text = "↻";
            btnRoomReload.Size = new Size(26, 22);
            btnRoomReload.Location = new Point(190, 3);
            btnRoomReload.Click += (s, e) => LoadAll();
            leftBar.Controls.Add(btnRoomReload);
            left.Controls.Add(leftBar);
            leftBar.BringToFront();

            roomList.View = View.Details;
            roomList.FullRowSelect = true;
            roomList.HideSelection = false;
            roomList.MultiSelect = false;
            roomList.GridLines = true;
            roomList.Dock = DockStyle.Fill;
            roomList.Columns.Add("#", 50);
            roomList.Columns.Add("Name", 110);
            roomList.Columns.Add("F", 25);
            roomList.Columns.Add("●", 25);
            roomList.SelectedIndexChanged += (s, e) => OnRoomPicked();
            left.Controls.Add(roomList);
            roomList.BringToFront();

            // ── Right side: top map / bottom controls ────────────────
            var split2 = new SplitContainer
            {
                Dock = DockStyle.Fill,
                Orientation = Orientation.Horizontal,
                SplitterDistance = 380,
            };
            split1.Panel2.Controls.Add(split2);

            // ── Top right: campus map ───────────────────────────────
            campusMap.Dock = DockStyle.Fill;
            split2.Panel1.Controls.Add(campusMap);

            // ── Bottom right: control bar + positions list ──────────
            var bottomPanel = new Panel { Dock = DockStyle.Fill, Padding = new Padding(6) };
            split2.Panel2.Controls.Add(bottomPanel);

            var ctrlBar = new Panel { Dock = DockStyle.Top, Height = 96, BackColor = Color.FromArgb(247, 249, 253) };
            ctrlBar.BorderStyle = BorderStyle.FixedSingle;
            bottomPanel.Controls.Add(ctrlBar);
            ctrlBar.BringToFront();

            lblRoomTitle.Location = new Point(10, 8);
            lblRoomTitle.AutoSize = true;
            lblRoomTitle.Font = new Font("MS Sans Serif", 10F, FontStyle.Bold);
            lblRoomTitle.ForeColor = Color.FromArgb(15, 35, 80);
            lblRoomTitle.Text = "No room selected";
            ctrlBar.Controls.Add(lblRoomTitle);

            lblGps.Location = new Point(10, 32);
            lblGps.AutoSize = true;
            lblGps.ForeColor = Color.FromArgb(100, 110, 130);
            lblGps.Text = "GPS: not started";
            ctrlBar.Controls.Add(lblGps);

            lblScan.Location = new Point(10, 52);
            lblScan.AutoSize = true;
            lblScan.ForeColor = Color.FromArgb(100, 110, 130);
            lblScan.Text = "Last scan: —";
            ctrlBar.Controls.Add(lblScan);

            btnCapture.Text = "⦿ Capture position";
            btnCapture.Size = new Size(160, 32);
            btnCapture.Location = new Point(380, 8);
            btnCapture.BackColor = Color.FromArgb(37, 99, 235);
            btnCapture.ForeColor = Color.White;
            btnCapture.FlatStyle = FlatStyle.Flat;
            btnCapture.FlatAppearance.BorderSize = 0;
            btnCapture.Font = new Font("MS Sans Serif", 10F, FontStyle.Bold);
            btnCapture.Click += (s, e) => CapturePosition();
            ctrlBar.Controls.Add(btnCapture);

            btnAutoMode.Text = "Auto-capture: OFF";
            btnAutoMode.Size = new Size(160, 28);
            btnAutoMode.Location = new Point(380, 46);
            btnAutoMode.Click += (s, e) => ToggleAutoMode();
            ctrlBar.Controls.Add(btnAutoMode);

            btnDelete.Text = "Delete pos";
            btnDelete.Size = new Size(100, 26);
            btnDelete.Location = new Point(550, 8);
            btnDelete.Click += (s, e) => DeleteSelectedPosition();
            ctrlBar.Controls.Add(btnDelete);

            var btnStartGps = new Button
            {
                Text = "Start GPS",
                Size = new Size(100, 26),
                Location = new Point(550, 38),
            };
            btnStartGps.Click += (s, e) => StartGps();
            ctrlBar.Controls.Add(btnStartGps);

            lblPositions.Text = "Saved positions:";
            lblPositions.Location = new Point(10, 105);
            lblPositions.AutoSize = true;
            lblPositions.Font = new Font("MS Sans Serif", 9F, FontStyle.Bold);
            bottomPanel.Controls.Add(lblPositions);
            lblPositions.BringToFront();

            positionsList.View = View.Details;
            positionsList.FullRowSelect = true;
            positionsList.GridLines = true;
            positionsList.Dock = DockStyle.Bottom;
            positionsList.Height = 180;
            positionsList.Columns.Add("Label", 110);
            positionsList.Columns.Add("Auto-corner", 90);
            positionsList.Columns.Add("Readings", 70);
            positionsList.Columns.Add("GPS", 180);
            positionsList.Columns.Add("Captured", 130);
            bottomPanel.Controls.Add(positionsList);
            positionsList.BringToFront();

            LoadAll();
        }

        // ── Data loading ──────────────────────────────────────────────

        void LoadAll()
        {
            lblStatus.Text = "Loading rooms + buildings...";
            new Thread(() =>
            {
                try
                {
                    var rd = Api.Request("/rooms") as object[];
                    var bd = Api.Request("/buildings") as object[];
                    var rs = new List<IDictionary<string, object>>();
                    if (rd != null) foreach (var r in rd) rs.Add(r as IDictionary<string, object>);
                    var bs = new List<object>();
                    if (bd != null) bs.AddRange(bd);
                    BeginInvoke((Action)(() =>
                    {
                        rooms = rs;
                        buildings = bs;
                        campusMap.SetBuildings(bs);
                        RenderRoomList();
                        lblStatus.Text = string.Format("{0} rooms, {1} buildings loaded.", rs.Count, bs.Count);
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void RenderRoomList()
        {
            var q = txtSearch.Text.Trim().ToLower();
            roomList.BeginUpdate();
            roomList.Items.Clear();
            var filtered = new List<IDictionary<string, object>>();
            foreach (var r in rooms)
            {
                if (q.Length > 0)
                {
                    var num = Api.Str(r, "roomNumber").ToLower();
                    var nm = Api.Str(r, "name").ToLower();
                    if (!num.Contains(q) && !nm.Contains(q)) continue;
                }
                filtered.Add(r);
            }
            filtered.Sort((a, b) => string.Compare(Api.Str(a, "roomNumber"), Api.Str(b, "roomNumber"), StringComparison.Ordinal));
            foreach (var r in filtered)
            {
                var dotMark = ""; // could indicate how many positions saved
                var item = new ListViewItem(new[]
                {
                    Api.Str(r, "roomNumber"),
                    Api.Str(r, "name"),
                    Api.Int(r, "floor").ToString(),
                    dotMark,
                });
                item.Tag = Api.Str(r, "id");
                roomList.Items.Add(item);
            }
            roomList.EndUpdate();
        }

        void OnRoomPicked()
        {
            if (roomList.SelectedItems.Count == 0) return;
            var id = roomList.SelectedItems[0].Tag as string;
            selectedRoom = rooms.Find(r => Api.Str(r, "id") == id);
            if (selectedRoom == null) return;
            lblRoomTitle.Text = "Room " + Api.Str(selectedRoom, "roomNumber") + "  ·  " + Api.Str(selectedRoom, "name");
            campusMap.SetRoom(selectedRoom);
            LoadPositions(id);
        }

        void LoadPositions(string roomId)
        {
            new Thread(() =>
            {
                try
                {
                    var data = Api.RequestOrNull("/beacons/" + roomId + "/positions") as object[];
                    var list = new List<IDictionary<string, object>>();
                    if (data != null) foreach (var d in data) list.Add(d as IDictionary<string, object>);
                    BeginInvoke((Action)(() => { positions = list; RenderPositions(); campusMap.SetPositions(list); }));
                }
                catch { /* swallow */ }
            }) { IsBackground = true }.Start();
        }

        void RenderPositions()
        {
            // Auto-compute corner labels for positions tagged "Corner" or "Auto".
            var corners = new List<IDictionary<string, object>>();
            foreach (var p in positions)
            {
                if (!p.ContainsKey("lat") || p["lat"] == null) continue;
                var label = Api.Str(p, "positionLabel").ToLower();
                if (label.StartsWith("corner") || label.StartsWith("auto")) corners.Add(p);
            }
            var labels = new Dictionary<string, string>();
            if (corners.Count >= 4)
            {
                double cLat = 0, cLng = 0;
                foreach (var c in corners) { cLat += Api.Get<double>(c, "lat", 0); cLng += Api.Get<double>(c, "lng", 0); }
                cLat /= corners.Count; cLng /= corners.Count;
                foreach (var c in corners)
                {
                    var lat = Api.Get<double>(c, "lat", 0);
                    var lng = Api.Get<double>(c, "lng", 0);
                    var north = lat > cLat;
                    var east = lng > cLng;
                    var lab = north ? (east ? "NE" : "NW") : (east ? "SE" : "SW");
                    labels[Api.Str(c, "id")] = lab;
                }
            }
            campusMap.SetCornerLabels(labels);

            positionsList.BeginUpdate();
            positionsList.Items.Clear();
            foreach (var p in positions)
            {
                var captured = Api.Str(p, "capturedAt");
                if (captured.Length > 19) captured = captured.Substring(0, 19).Replace("T", " ");
                var readingsArr = p.ContainsKey("readings") ? p["readings"] as object[] : null;
                var lat = Api.Get<double>(p, "lat", 0);
                var lng = Api.Get<double>(p, "lng", 0);
                var gpsTxt = lat != 0 ? string.Format("{0:F6}, {1:F6}", lat, lng) : "—";
                var corner = "";
                var pid = Api.Str(p, "id");
                if (labels.ContainsKey(pid)) corner = labels[pid];
                var item = new ListViewItem(new[]
                {
                    Api.Str(p, "positionLabel"), corner,
                    (readingsArr != null ? readingsArr.Length : 0).ToString(),
                    gpsTxt, captured,
                });
                item.Tag = pid;
                positionsList.Items.Add(item);
            }
            positionsList.EndUpdate();
            lblPositions.Text = string.Format("Saved positions ({0}{1}):",
                positions.Count,
                corners.Count >= 4 ? " · corners auto-labelled" : "");
        }

        // ── GPS ──────────────────────────────────────────────────────

        void StartGps()
        {
            try
            {
                if (gpsWatcher == null)
                {
                    gpsWatcher = new System.Device.Location.GeoCoordinateWatcher(System.Device.Location.GeoPositionAccuracy.High);
                    gpsWatcher.PositionChanged += OnGpsChanged;
                    gpsWatcher.StatusChanged += OnGpsStatusChanged;
                    gpsWatcher.MovementThreshold = 1.0;  // metres
                    gpsWatcher.Start();
                    lblGps.Text = "GPS: starting...";
                }
                else
                {
                    gpsWatcher.Start();
                    lblGps.Text = "GPS: restarted.";
                }
            }
            catch (Exception ex)
            {
                lblGps.Text = "GPS error: " + ex.Message;
                lblGps.ForeColor = Color.Maroon;
            }
        }

        void OnGpsStatusChanged(object sender, System.Device.Location.GeoPositionStatusChangedEventArgs e)
        {
            BeginInvoke((Action)(() =>
            {
                switch (e.Status)
                {
                    case System.Device.Location.GeoPositionStatus.Ready:        lblGps.Text = "GPS: ready, waiting for fix..."; break;
                    case System.Device.Location.GeoPositionStatus.NoData:       lblGps.Text = "GPS: no data (turn on Location in Settings)"; break;
                    case System.Device.Location.GeoPositionStatus.Disabled:     lblGps.Text = "GPS: disabled (turn on Location Services)"; break;
                    case System.Device.Location.GeoPositionStatus.Initializing: lblGps.Text = "GPS: initialising..."; break;
                }
            }));
        }

        void OnGpsChanged(object sender, System.Device.Location.GeoPositionChangedEventArgs<System.Device.Location.GeoCoordinate> e)
        {
            if (e.Position.Location.IsUnknown) return;
            lastLat = e.Position.Location.Latitude;
            lastLng = e.Position.Location.Longitude;
            lastAccuracy = e.Position.Location.HorizontalAccuracy;
            hasGps = true;
            BeginInvoke((Action)(() =>
            {
                lblGps.Text = string.Format("GPS: {0:F6}, {1:F6}  ±{2:F1}m", lastLat, lastLng, lastAccuracy);
                lblGps.ForeColor = lastAccuracy < 20 ? Color.Green : (lastAccuracy < 50 ? Color.DarkGoldenrod : Color.Maroon);
                campusMap.SetMyLocation(lastLat, lastLng, lastAccuracy);
            }));
        }

        // ── WiFi scan ─────────────────────────────────────────────────

        List<string[]> ScanWifiSync()
        {
            var psi = new ProcessStartInfo("netsh", "wlan show networks mode=bssid")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8,
            };
            var p = Process.Start(psi);
            var output = p.StandardOutput.ReadToEnd();
            p.WaitForExit(15000);
            return ParseNetsh(output);
        }

        List<string[]> ParseNetsh(string text)
        {
            var nets = new List<string[]>();
            string ssid = "", bssid = "";
            int signal = 0;
            Action flush = () =>
            {
                if (bssid.Length > 0)
                {
                    int rssi = (int)Math.Round(-100 + signal * 0.5);
                    nets.Add(new[] { ssid, bssid, rssi.ToString(), signal.ToString() });
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
            nets.Sort((a, b) => int.Parse(b[3]) - int.Parse(a[3]));
            return nets;
        }

        // ── Capture flow ─────────────────────────────────────────────

        void CapturePosition()
        {
            if (selectedRoom == null) { MessageBox.Show("Pick a room first.", "Capture"); return; }
            if (!hasGps) { MessageBox.Show("Start GPS first and wait for a fix.", "Capture"); return; }

            btnCapture.Enabled = false;
            lblStatus.Text = "Scanning WiFi...";
            lblStatus.ForeColor = Color.Navy;

            // Snapshot GPS at the moment the user presses Capture so the
            // reading travels with the right fix even if GPS moves.
            var lat = lastLat;
            var lng = lastLng;
            var acc = lastAccuracy;
            var roomId = Api.Str(selectedRoom, "id");

            new Thread(() =>
            {
                List<string[]> scan = null;
                try { scan = ScanWifiSync(); } catch { scan = new List<string[]>(); }
                lastScanRows = scan;

                var readings = new List<object>();
                foreach (var r in scan)
                {
                    readings.Add(new Dictionary<string, object>
                    {
                        { "bssid", r[1] }, { "rssi", int.Parse(r[2]) }, { "ssid", r[0] },
                    });
                }

                // Position label: "Auto" + sequence number. The corner label
                // is computed client-side after the read-back.
                var nextIdx = positions.Count + 1;
                var body = new Dictionary<string, object>
                {
                    { "positionLabel", "Auto " + nextIdx },
                    { "capturedAt", DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ") },
                    { "readings", readings },
                    { "lat", lat }, { "lng", lng }, { "accuracyM", acc },
                };

                try
                {
                    Api.Request("/beacons/" + roomId + "/positions", "POST", body);
                    BeginInvoke((Action)(() =>
                    {
                        lblStatus.Text = string.Format("Captured: {0} BSSIDs, GPS ±{1:F1}m", scan.Count, acc);
                        lblStatus.ForeColor = Color.Green;
                        lblScan.Text = string.Format("Last scan: {0} BSSID(s)", scan.Count);
                        btnCapture.Enabled = true;
                        lastCapture = DateTime.Now;
                        LoadPositions(roomId);
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() =>
                    {
                        lblStatus.Text = Api.Friendly(ex);
                        lblStatus.ForeColor = Color.Maroon;
                        btnCapture.Enabled = true;
                    }));
                }
            }) { IsBackground = true }.Start();
        }

        void ToggleAutoMode()
        {
            autoMode = !autoMode;
            btnAutoMode.Text = autoMode ? "Auto-capture: ON" : "Auto-capture: OFF";
            btnAutoMode.BackColor = autoMode ? Color.FromArgb(34, 197, 94) : SystemColors.Control;
            btnAutoMode.ForeColor = autoMode ? Color.White : SystemColors.ControlText;

            if (autoMode && autoTimer == null)
            {
                autoTimer = new System.Windows.Forms.Timer();
                autoTimer.Interval = 6000;  // every 6 seconds while moving
                autoTimer.Tick += (s, e) =>
                {
                    // Capture only if we've moved at least ~3 m since last
                    // capture (the watcher's MovementThreshold guarantees a
                    // PositionChanged was raised since then) — avoid duplicates.
                    if (selectedRoom == null || !hasGps) return;
                    if ((DateTime.Now - lastCapture).TotalSeconds < 5) return;
                    CapturePosition();
                };
                autoTimer.Start();
            }
            else if (!autoMode && autoTimer != null)
            {
                autoTimer.Stop();
                autoTimer = null;
            }
        }

        void DeleteSelectedPosition()
        {
            if (positionsList.SelectedItems.Count == 0 || selectedRoom == null) return;
            var posId = positionsList.SelectedItems[0].Tag as string;
            var roomId = Api.Str(selectedRoom, "id");
            new Thread(() =>
            {
                try
                {
                    Api.Request("/beacons/" + roomId + "/positions/" + posId, "DELETE");
                    BeginInvoke((Action)(() => LoadPositions(roomId)));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => MessageBox.Show(Api.Friendly(ex), "Delete")));
                }
            }) { IsBackground = true }.Start();
        }
    }

    // ── Campus map view ────────────────────────────────────────────────
    //
    // Draws building outlines, captured positions (as coloured dots) and
    // the user's own GPS fix. All in pure GDI+ — no third-party plotting
    // lib. The view auto-scales to fit the loaded building polygons.
    // When 4+ positions look like room corners the app connects them so
    // the surveyor sees the room outline take shape as they walk.

    public class CampusMapView : Panel
    {
        List<object> buildings = new List<object>();
        List<IDictionary<string, object>> positions = new List<IDictionary<string, object>>();
        Dictionary<string, string> cornerLabels = new Dictionary<string, string>();
        IDictionary<string, object> activeRoom;
        double myLat = 0, myLng = 0, myAccuracyM = 0;
        bool haveMyLoc = false;

        double minLat = 60.18, maxLat = 60.19, minLng = 25.04, maxLng = 25.06; // sane KSYK defaults
        bool boundsComputed = false;

        public CampusMapView()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(245, 246, 249);
            BorderStyle = BorderStyle.FixedSingle;
        }

        public void SetBuildings(List<object> bs)
        {
            buildings = bs ?? new List<object>();
            ComputeBounds();
            Invalidate();
        }

        public void SetRoom(IDictionary<string, object> r)
        {
            activeRoom = r;
            Invalidate();
        }

        public void SetPositions(List<IDictionary<string, object>> p)
        {
            positions = p ?? new List<IDictionary<string, object>>();
            ComputeBounds();
            Invalidate();
        }

        public void SetCornerLabels(Dictionary<string, string> l)
        {
            cornerLabels = l ?? new Dictionary<string, string>();
            Invalidate();
        }

        public void SetMyLocation(double lat, double lng, double accuracyM)
        {
            myLat = lat; myLng = lng; myAccuracyM = accuracyM;
            haveMyLoc = true;
            ComputeBounds();
            Invalidate();
        }

        void ComputeBounds()
        {
            // Union all sources of coordinates so the auto-fit shows them all.
            var lats = new List<double>();
            var lngs = new List<double>();
            // From positions
            foreach (var p in positions)
            {
                var lat = Api.Get<double>(p, "lat", 0);
                var lng = Api.Get<double>(p, "lng", 0);
                if (lat != 0 && lng != 0) { lats.Add(lat); lngs.Add(lng); }
            }
            // From my GPS
            if (haveMyLoc) { lats.Add(myLat); lngs.Add(myLng); }
            // From buildings (lat/lng centroid if available)
            foreach (var b in buildings)
            {
                var d = b as IDictionary<string, object>;
                var lat = Api.Get<double>(d, "centerLat", 0);
                var lng = Api.Get<double>(d, "centerLng", 0);
                if (lat != 0) { lats.Add(lat); lngs.Add(lng); }
            }
            if (lats.Count >= 2)
            {
                lats.Sort(); lngs.Sort();
                minLat = lats[0]; maxLat = lats[lats.Count - 1];
                minLng = lngs[0]; maxLng = lngs[lngs.Count - 1];
                // Add a little padding so points aren't at the edge
                var latSpan = Math.Max(0.00005, maxLat - minLat);
                var lngSpan = Math.Max(0.00005, maxLng - minLng);
                minLat -= latSpan * 0.25; maxLat += latSpan * 0.25;
                minLng -= lngSpan * 0.25; maxLng += lngSpan * 0.25;
                boundsComputed = true;
            }
        }

        Point Project(double lat, double lng)
        {
            var w = ClientSize.Width - 20;
            var h = ClientSize.Height - 20;
            var x = 10 + (int)((lng - minLng) / Math.Max(0.0000001, maxLng - minLng) * w);
            // Flip Y so north is up
            var y = 10 + (int)((maxLat - lat) / Math.Max(0.0000001, maxLat - minLat) * h);
            return new Point(x, y);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            var g = e.Graphics;
            g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

            // Header strip
            g.FillRectangle(Brushes.White, 0, 0, ClientSize.Width, 24);
            using (var f = new Font("MS Sans Serif", 8.5F, FontStyle.Bold))
                g.DrawString("Campus map · live", f, Brushes.DimGray, 8, 4);
            if (activeRoom != null)
            {
                using (var f = new Font("MS Sans Serif", 8.5F))
                    g.DrawString("Room " + Api.Str(activeRoom, "roomNumber"), f, Brushes.SteelBlue, ClientSize.Width - 100, 4);
            }
            g.DrawLine(Pens.LightGray, 0, 24, ClientSize.Width, 24);

            if (!boundsComputed)
            {
                using (var f = new Font("MS Sans Serif", 9F))
                {
                    var s = "Start GPS or save a position to populate the map.";
                    var sz = g.MeasureString(s, f);
                    g.DrawString(s, f, Brushes.Gray,
                        (ClientSize.Width - sz.Width) / 2,
                        (ClientSize.Height - sz.Height) / 2);
                }
                return;
            }

            // Building dots (centroids only since we don't have polygon coords here)
            foreach (var b in buildings)
            {
                var d = b as IDictionary<string, object>;
                var lat = Api.Get<double>(d, "centerLat", 0);
                var lng = Api.Get<double>(d, "centerLng", 0);
                if (lat == 0) continue;
                var p = Project(lat, lng);
                using (var br = new SolidBrush(Color.FromArgb(60, 100, 116, 139)))
                    g.FillEllipse(br, p.X - 10, p.Y - 10, 20, 20);
                using (var br = new SolidBrush(Color.FromArgb(30, 41, 59)))
                using (var f = new Font("MS Sans Serif", 8F, FontStyle.Bold))
                    g.DrawString(Api.Str(d, "name"), f, br, p.X + 8, p.Y - 6);
            }

            // Corners polygon — connect labelled corners NW→NE→SE→SW→NW
            var corners = new Dictionary<string, Point>();
            foreach (var p in positions)
            {
                var pid = Api.Str(p, "id");
                if (!cornerLabels.ContainsKey(pid)) continue;
                var lat = Api.Get<double>(p, "lat", 0);
                var lng = Api.Get<double>(p, "lng", 0);
                if (lat == 0) continue;
                corners[cornerLabels[pid]] = Project(lat, lng);
            }
            if (corners.Count >= 4 && corners.ContainsKey("NW") && corners.ContainsKey("NE")
                && corners.ContainsKey("SE") && corners.ContainsKey("SW"))
            {
                var path = new Point[] { corners["NW"], corners["NE"], corners["SE"], corners["SW"], corners["NW"] };
                using (var pen = new Pen(Color.FromArgb(180, 37, 99, 235), 2.5f))
                    g.DrawLines(pen, path);
                using (var br = new SolidBrush(Color.FromArgb(35, 37, 99, 235)))
                    g.FillPolygon(br, new Point[] { corners["NW"], corners["NE"], corners["SE"], corners["SW"] });
            }

            // Captured positions
            foreach (var p in positions)
            {
                var lat = Api.Get<double>(p, "lat", 0);
                var lng = Api.Get<double>(p, "lng", 0);
                if (lat == 0) continue;
                var pt = Project(lat, lng);
                var pid = Api.Str(p, "id");
                var isCorner = cornerLabels.ContainsKey(pid);
                var color = isCorner ? Color.FromArgb(37, 99, 235) : Color.FromArgb(168, 85, 247);
                using (var br = new SolidBrush(color))
                    g.FillEllipse(br, pt.X - 5, pt.Y - 5, 10, 10);
                g.DrawEllipse(Pens.White, pt.X - 5, pt.Y - 5, 10, 10);
                if (isCorner)
                {
                    using (var f = new Font("MS Sans Serif", 7.5F, FontStyle.Bold))
                    using (var br = new SolidBrush(Color.FromArgb(15, 35, 80)))
                        g.DrawString(cornerLabels[pid], f, br, pt.X + 7, pt.Y - 6);
                }
            }

            // My GPS — pulsing blue dot with accuracy ring
            if (haveMyLoc)
            {
                var pt = Project(myLat, myLng);
                // Accuracy ring (rough — convert metres to pixels using current bounds)
                var degPerM = 1 / 111320.0;
                var accDeg = myAccuracyM * degPerM;
                var ringR = (int)(accDeg / Math.Max(0.0000001, maxLat - minLat) * (ClientSize.Height - 20));
                ringR = Math.Min(ringR, 80);
                if (ringR > 4)
                {
                    using (var br = new SolidBrush(Color.FromArgb(30, 59, 130, 246)))
                        g.FillEllipse(br, pt.X - ringR, pt.Y - ringR, ringR * 2, ringR * 2);
                    using (var pen = new Pen(Color.FromArgb(180, 59, 130, 246), 1f))
                        g.DrawEllipse(pen, pt.X - ringR, pt.Y - ringR, ringR * 2, ringR * 2);
                }
                using (var br = new SolidBrush(Color.FromArgb(59, 130, 246)))
                    g.FillEllipse(br, pt.X - 7, pt.Y - 7, 14, 14);
                g.DrawEllipse(new Pen(Color.White, 2), pt.X - 7, pt.Y - 7, 14, 14);
            }
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
                sb.AppendLine("ERROR — " + Api.Friendly(ex));
            }
            sb.AppendLine();
        }
    }

    // ── Users tab ──────────────────────────────────────────────────────
    //
    // Admin user CRUD via /api/users. Lists every admin/owner account,
    // lets you create new ones (with the "email password" flow that uses
    // the existing email service), and delete accounts.

    public class UsersPanel : UserControl
    {
        readonly ListView list = new ListView();
        readonly Label lblStatus = new Label();
        List<IDictionary<string, object>> users = new List<IDictionary<string, object>>();

        public UsersPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Admin user accounts", Location = new Point(8, 10), AutoSize = true });
            var btnReload = new Button { Text = "Reload", Location = new Point(150, 6), Size = new Size(75, 24) };
            btnReload.Click += (s, e) => Reload();
            tb.Controls.Add(btnReload);
            var btnNew = new Button { Text = "Create user", Location = new Point(230, 6), Size = new Size(95, 24) };
            btnNew.Click += (s, e) => CreateUser();
            tb.Controls.Add(btnNew);
            var btnDel = new Button { Text = "Delete selected", Location = new Point(330, 6), Size = new Size(110, 24) };
            btnDel.Click += (s, e) => DeleteSelected();
            tb.Controls.Add(btnDel);
            Controls.Add(tb);

            lblStatus.Dock = DockStyle.Bottom;
            lblStatus.Height = 22;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Padding = new Padding(8, 0, 0, 0);
            lblStatus.ForeColor = SystemColors.GrayText;
            Controls.Add(lblStatus);

            list.View = View.Details;
            list.FullRowSelect = true;
            list.GridLines = true;
            list.Dock = DockStyle.Fill;
            list.Columns.Add("Email", 280);
            list.Columns.Add("Name", 200);
            list.Columns.Add("Role", 90);
            list.Columns.Add("ID", 240);
            Controls.Add(list);
            list.BringToFront();

            Reload();
        }

        void Reload()
        {
            lblStatus.Text = "Loading..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/users") as object[];
                    users = new List<IDictionary<string, object>>();
                    if (data != null) foreach (var u in data) users.Add(u as IDictionary<string, object>);
                    BeginInvoke((Action)(() => { Render(); lblStatus.Text = users.Count + " user(s)"; lblStatus.ForeColor = SystemColors.GrayText; }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void Render()
        {
            list.BeginUpdate();
            list.Items.Clear();
            foreach (var u in users)
            {
                var fn = Api.Str(u, "firstName");
                var ln = Api.Str(u, "lastName");
                var name = (fn + " " + ln).Trim();
                var item = new ListViewItem(new[]
                {
                    Api.Str(u, "email"),
                    name.Length > 0 ? name : "—",
                    Api.Str(u, "role"),
                    Api.Str(u, "id"),
                });
                item.Tag = Api.Str(u, "id");
                list.Items.Add(item);
            }
            list.EndUpdate();
        }

        void CreateUser()
        {
            var email = InputBox.Show("Email:", "Create admin user", "");
            if (string.IsNullOrEmpty(email)) return;
            var firstName = InputBox.Show("First name:", "Create admin user", "");
            if (string.IsNullOrEmpty(firstName)) return;
            var lastName = InputBox.Show("Last name:", "Create admin user", "");
            if (string.IsNullOrEmpty(lastName)) return;
            var role = InputBox.Show("Role (admin / owner):", "Create admin user", "admin");
            if (string.IsNullOrEmpty(role)) role = "admin";

            var body = new Dictionary<string, object>
            {
                { "email", email }, { "firstName", firstName }, { "lastName", lastName },
                { "role", role }, { "passwordOption", "email" },
            };
            lblStatus.Text = "Creating user..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    var created = Api.Request("/users", "POST", body) as IDictionary<string, object>;
                    var pw = Api.Str(created, "password");
                    BeginInvoke((Action)(() =>
                    {
                        lblStatus.Text = "User created. Temp password emailed.";
                        lblStatus.ForeColor = Color.Green;
                        if (!string.IsNullOrEmpty(pw))
                            MessageBox.Show("Temporary password: " + pw +
                                "\r\n\r\n(Also emailed to the user.)", "User created");
                        Reload();
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void DeleteSelected()
        {
            if (list.SelectedItems.Count == 0) return;
            var id = list.SelectedItems[0].Tag as string;
            if (MessageBox.Show("Delete this user?", "Confirm",
                MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
            new Thread(() =>
            {
                try
                {
                    Api.Request("/users/" + id, "DELETE");
                    BeginInvoke((Action)(() => Reload()));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => MessageBox.Show(Api.Friendly(ex), "Delete user")));
                }
            }) { IsBackground = true }.Start();
        }
    }

    // ── Security tab ───────────────────────────────────────────────────
    //
    // Mirrors the web admin's Security Settings panel: time-window gate,
    // IP allow-list, login gate, allowed email domains, and tier choice
    // for outside-hours / off-network / guests. Everything saves through
    // /api/security-settings (the same Firestore doc the web uses).

    public class SecurityPanel : UserControl
    {
        readonly CheckBox cbEnabled = new CheckBox { Text = "Enable access control gate", AutoSize = true, Location = new Point(0, 0) };
        readonly CheckBox cbTimeWindow = new CheckBox { Text = "Enforce time window", AutoSize = true, Location = new Point(0, 30) };
        readonly CheckBox cbIpGate = new CheckBox { Text = "Enforce IP allow-list", AutoSize = true, Location = new Point(0, 60) };
        readonly CheckBox cbLoginGate = new CheckBox { Text = "Require sign-in", AutoSize = true, Location = new Point(0, 90) };
        readonly CheckBox cbDryRun = new CheckBox { Text = "Dry run (log, don't block)", AutoSize = true, Location = new Point(0, 120) };
        readonly TextBox txtAllowlist = new TextBox();
        readonly TextBox txtDomains = new TextBox();
        readonly ComboBox cmbGuest = new ComboBox();
        readonly ComboBox cmbOutside = new ComboBox();
        readonly ComboBox cmbOff = new ComboBox();
        readonly TextBox txtLockoutMsg = new TextBox();
        readonly Label lblStatus = new Label();
        IDictionary<string, object> current;

        static readonly string[] Tiers = new[] { "full", "restricted", "blocked" };

        public SecurityPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;
            Padding = new Padding(14);

            var top = new Panel { Dock = DockStyle.Top, Height = 36 };
            top.Controls.Add(new Label { Text = "Access control & security gates", Location = new Point(0, 10), AutoSize = true });
            var btnLoad = new Button { Text = "Reload", Location = new Point(200, 6), Size = new Size(75, 24) };
            btnLoad.Click += (s, e) => Load();
            top.Controls.Add(btnLoad);
            var btnSave = new Button { Text = "Save settings", Location = new Point(280, 6), Size = new Size(100, 24) };
            btnSave.Click += (s, e) => Save();
            top.Controls.Add(btnSave);
            Controls.Add(top);

            lblStatus.Dock = DockStyle.Bottom; lblStatus.Height = 22;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Padding = new Padding(8, 0, 0, 0);
            lblStatus.ForeColor = SystemColors.GrayText;
            Controls.Add(lblStatus);

            var scroll = new Panel { Dock = DockStyle.Fill, AutoScroll = true };
            Controls.Add(scroll);
            scroll.BringToFront();

            var col1 = new GroupBox
            {
                Text = "Gates",
                Location = new Point(0, 0),
                Size = new Size(360, 180),
                Padding = new Padding(12),
            };
            col1.Controls.Add(cbEnabled);
            col1.Controls.Add(cbTimeWindow);
            col1.Controls.Add(cbIpGate);
            col1.Controls.Add(cbLoginGate);
            col1.Controls.Add(cbDryRun);
            scroll.Controls.Add(col1);

            var col2 = new GroupBox
            {
                Text = "Tiers",
                Location = new Point(380, 0),
                Size = new Size(340, 180),
                Padding = new Padding(12),
            };
            col2.Controls.Add(new Label { Text = "Guest tier:", Location = new Point(0, 4), AutoSize = true });
            cmbGuest.Location = new Point(110, 0); cmbGuest.Size = new Size(120, 22);
            cmbGuest.DropDownStyle = ComboBoxStyle.DropDownList;
            foreach (var t in Tiers) cmbGuest.Items.Add(t);
            col2.Controls.Add(cmbGuest);

            col2.Controls.Add(new Label { Text = "Outside hours:", Location = new Point(0, 38), AutoSize = true });
            cmbOutside.Location = new Point(110, 34); cmbOutside.Size = new Size(120, 22);
            cmbOutside.DropDownStyle = ComboBoxStyle.DropDownList;
            foreach (var t in Tiers) cmbOutside.Items.Add(t);
            col2.Controls.Add(cmbOutside);

            col2.Controls.Add(new Label { Text = "Off network:", Location = new Point(0, 72), AutoSize = true });
            cmbOff.Location = new Point(110, 68); cmbOff.Size = new Size(120, 22);
            cmbOff.DropDownStyle = ComboBoxStyle.DropDownList;
            foreach (var t in Tiers) cmbOff.Items.Add(t);
            col2.Controls.Add(cmbOff);
            scroll.Controls.Add(col2);

            var col3 = new GroupBox
            {
                Text = "IP allow-list (one per line)",
                Location = new Point(0, 192),
                Size = new Size(360, 130),
                Padding = new Padding(12),
            };
            txtAllowlist.Multiline = true; txtAllowlist.Dock = DockStyle.Fill;
            txtAllowlist.ScrollBars = ScrollBars.Vertical;
            txtAllowlist.Font = new Font("Consolas", 9F);
            col3.Controls.Add(txtAllowlist);
            scroll.Controls.Add(col3);

            var col4 = new GroupBox
            {
                Text = "Allowed email domains (one per line, no @)",
                Location = new Point(380, 192),
                Size = new Size(340, 130),
                Padding = new Padding(12),
            };
            txtDomains.Multiline = true; txtDomains.Dock = DockStyle.Fill;
            txtDomains.ScrollBars = ScrollBars.Vertical;
            txtDomains.Font = new Font("Consolas", 9F);
            col4.Controls.Add(txtDomains);
            scroll.Controls.Add(col4);

            var col5 = new GroupBox
            {
                Text = "Lockout message (shown to blocked visitors)",
                Location = new Point(0, 332),
                Size = new Size(720, 100),
                Padding = new Padding(12),
            };
            txtLockoutMsg.Multiline = true; txtLockoutMsg.Dock = DockStyle.Fill;
            txtLockoutMsg.ScrollBars = ScrollBars.Vertical;
            col5.Controls.Add(txtLockoutMsg);
            scroll.Controls.Add(col5);

            Load();
        }

        void Load()
        {
            lblStatus.Text = "Loading..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/security-settings") as IDictionary<string, object>;
                    current = data ?? new Dictionary<string, object>();
                    BeginInvoke((Action)(() => Render()));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void Render()
        {
            cbEnabled.Checked    = Api.Get<bool>(current, "enabled", false);
            cbTimeWindow.Checked = Api.Get<bool>(current, "timeWindowEnabled", false);
            cbIpGate.Checked     = Api.Get<bool>(current, "ipGateEnabled", false);
            cbLoginGate.Checked  = Api.Get<bool>(current, "loginGateEnabled", false);
            cbDryRun.Checked     = Api.Get<bool>(current, "dryRun", false);
            cmbGuest.SelectedItem    = Api.Str(current, "guestTier");    if (cmbGuest.SelectedItem == null) cmbGuest.SelectedItem = "restricted";
            cmbOutside.SelectedItem  = Api.Str(current, "outsideHoursTier"); if (cmbOutside.SelectedItem == null) cmbOutside.SelectedItem = "restricted";
            cmbOff.SelectedItem      = Api.Str(current, "offNetworkTier"); if (cmbOff.SelectedItem == null) cmbOff.SelectedItem = "restricted";

            var ipArr = current != null && current.ContainsKey("ipAllowlist") ? current["ipAllowlist"] as object[] : null;
            txtAllowlist.Text = ipArr == null ? "" : string.Join("\r\n", Array.ConvertAll(ipArr, x => x == null ? "" : x.ToString()));
            var domArr = current != null && current.ContainsKey("allowedEmailDomains") ? current["allowedEmailDomains"] as object[] : null;
            txtDomains.Text = domArr == null ? "" : string.Join("\r\n", Array.ConvertAll(domArr, x => x == null ? "" : x.ToString()));
            txtLockoutMsg.Text = Api.Str(current, "lockoutMessage");

            lblStatus.Text = "Loaded settings."; lblStatus.ForeColor = SystemColors.GrayText;
        }

        void Save()
        {
            var ipAllowlist = new List<object>();
            foreach (var l in txtAllowlist.Text.Split('\n'))
            {
                var v = l.Trim(); if (v.Length > 0) ipAllowlist.Add(v);
            }
            var domains = new List<object>();
            foreach (var l in txtDomains.Text.Split('\n'))
            {
                var v = l.Trim(); if (v.Length > 0) domains.Add(v);
            }
            var body = new Dictionary<string, object>
            {
                { "enabled", cbEnabled.Checked },
                { "timeWindowEnabled", cbTimeWindow.Checked },
                { "ipGateEnabled", cbIpGate.Checked },
                { "loginGateEnabled", cbLoginGate.Checked },
                { "dryRun", cbDryRun.Checked },
                { "guestTier", cmbGuest.SelectedItem ?? "restricted" },
                { "outsideHoursTier", cmbOutside.SelectedItem ?? "restricted" },
                { "offNetworkTier", cmbOff.SelectedItem ?? "restricted" },
                { "ipAllowlist", ipAllowlist },
                { "allowedEmailDomains", domains },
                { "lockoutMessage", txtLockoutMsg.Text },
                // Preserve existing complex fields we don't show here.
                { "schedule", current != null && current.ContainsKey("schedule") ? current["schedule"] : new Dictionary<string, object>() },
                { "holidays", current != null && current.ContainsKey("holidays") ? current["holidays"] : new List<object>() },
                { "restrictedDisabledFeatures", current != null && current.ContainsKey("restrictedDisabledFeatures") ? current["restrictedDisabledFeatures"] : new Dictionary<string, object>() },
                { "userExceptions", current != null && current.ContainsKey("userExceptions") ? current["userExceptions"] : new List<object>() },
                { "accessRequests", current != null && current.ContainsKey("accessRequests") ? current["accessRequests"] : new List<object>() },
                { "loggedInTier", Api.Str(current, "loggedInTier") ?? "full" },
            };

            lblStatus.Text = "Saving..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    Api.Request("/security-settings", "PUT", body);
                    BeginInvoke((Action)(() => { lblStatus.Text = "Saved."; lblStatus.ForeColor = Color.Green; }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }
    }

    // ── Settings tab ───────────────────────────────────────────────────
    //
    // App-wide settings (the web admin's /api/settings + /api/map-defaults).
    // Lets admins set the OSM map home, default zoom, tile theme, pitch,
    // rotation, plus the Matterport tour URL and campus span.

    public class SettingsPanel : UserControl
    {
        readonly TextBox txtLat = new TextBox();
        readonly TextBox txtLng = new TextBox();
        readonly TextBox txtZoom = new TextBox();
        readonly TextBox txtMinZoom = new TextBox();
        readonly TextBox txtMaxZoom = new TextBox();
        readonly TextBox txtRotation = new TextBox();
        readonly TextBox txtPitch = new TextBox();
        readonly TextBox txtTileTheme = new TextBox();
        readonly TextBox txtSpan = new TextBox();
        readonly TextBox txtMatterport = new TextBox();
        readonly Label lblStatus = new Label();
        IDictionary<string, object> current;

        public SettingsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;
            Padding = new Padding(14);

            var top = new Panel { Dock = DockStyle.Top, Height = 36 };
            top.Controls.Add(new Label { Text = "Map defaults & app settings", Location = new Point(0, 10), AutoSize = true });
            var btnLoad = new Button { Text = "Reload", Location = new Point(180, 6), Size = new Size(75, 24) };
            btnLoad.Click += (s, e) => Load();
            top.Controls.Add(btnLoad);
            var btnSave = new Button { Text = "Save", Location = new Point(260, 6), Size = new Size(75, 24) };
            btnSave.Click += (s, e) => Save();
            top.Controls.Add(btnSave);
            Controls.Add(top);

            lblStatus.Dock = DockStyle.Bottom; lblStatus.Height = 22;
            lblStatus.TextAlign = ContentAlignment.MiddleLeft;
            lblStatus.Padding = new Padding(8, 0, 0, 0);
            lblStatus.ForeColor = SystemColors.GrayText;
            Controls.Add(lblStatus);

            var grid = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 4,
                RowCount = 10,
                Padding = new Padding(8),
            };
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 130));
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));

            AddRow(grid, 0, "Center latitude:", txtLat,    "Center longitude:", txtLng);
            AddRow(grid, 1, "Default zoom:",    txtZoom,   "Min zoom:",         txtMinZoom);
            AddRow(grid, 2, "Max zoom:",        txtMaxZoom,"Rotation (deg):",   txtRotation);
            AddRow(grid, 3, "Pitch (deg):",     txtPitch,  "Tile theme:",       txtTileTheme);
            AddRow(grid, 4, "Campus span (m):", txtSpan,   "Matterport URL:",   txtMatterport);

            Controls.Add(grid);
            grid.BringToFront();

            Load();
        }

        void AddRow(TableLayoutPanel g, int row, string lbl1, TextBox tb1, string lbl2, TextBox tb2)
        {
            g.Controls.Add(new Label { Text = lbl1, Anchor = AnchorStyles.Left, AutoSize = true, Padding = new Padding(0, 6, 0, 0) }, 0, row);
            tb1.Dock = DockStyle.Top; tb1.Margin = new Padding(0, 3, 8, 3);
            g.Controls.Add(tb1, 1, row);
            g.Controls.Add(new Label { Text = lbl2, Anchor = AnchorStyles.Left, AutoSize = true, Padding = new Padding(0, 6, 0, 0) }, 2, row);
            tb2.Dock = DockStyle.Top; tb2.Margin = new Padding(0, 3, 0, 3);
            g.Controls.Add(tb2, 3, row);
        }

        void Load()
        {
            lblStatus.Text = "Loading..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/map-defaults") as IDictionary<string, object>;
                    current = data ?? new Dictionary<string, object>();
                    BeginInvoke((Action)(() => Render()));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void Render()
        {
            txtLat.Text       = Api.Str(current, "osmCenterLat");
            txtLng.Text       = Api.Str(current, "osmCenterLng");
            txtZoom.Text      = Api.Str(current, "osmDefaultZoom");
            txtMinZoom.Text   = Api.Str(current, "osmMinZoom");
            txtMaxZoom.Text   = Api.Str(current, "osmMaxZoom");
            txtRotation.Text  = Api.Str(current, "osmRotationDeg");
            txtPitch.Text     = Api.Str(current, "osmPitchDeg");
            txtTileTheme.Text = Api.Str(current, "osmTileTheme");
            txtSpan.Text      = Api.Str(current, "osmCampusSpanMeters");
            txtMatterport.Text= Api.Str(current, "matterportTourUrl");
            lblStatus.Text = "Loaded."; lblStatus.ForeColor = SystemColors.GrayText;
        }

        void Save()
        {
            var body = new Dictionary<string, object>();
            AddIfFilled(body, "osmCenterLat", txtLat.Text, true);
            AddIfFilled(body, "osmCenterLng", txtLng.Text, true);
            AddIfFilled(body, "osmDefaultZoom", txtZoom.Text, true);
            AddIfFilled(body, "osmMinZoom", txtMinZoom.Text, true);
            AddIfFilled(body, "osmMaxZoom", txtMaxZoom.Text, true);
            AddIfFilled(body, "osmRotationDeg", txtRotation.Text, true);
            AddIfFilled(body, "osmPitchDeg", txtPitch.Text, true);
            AddIfFilled(body, "osmTileTheme", txtTileTheme.Text, false);
            AddIfFilled(body, "osmCampusSpanMeters", txtSpan.Text, true);
            AddIfFilled(body, "matterportTourUrl", txtMatterport.Text, false);

            lblStatus.Text = "Saving..."; lblStatus.ForeColor = Color.Navy;
            new Thread(() =>
            {
                try
                {
                    Api.Request("/map-defaults", "PUT", body);
                    BeginInvoke((Action)(() => { lblStatus.Text = "Saved."; lblStatus.ForeColor = Color.Green; }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { lblStatus.Text = Api.Friendly(ex); lblStatus.ForeColor = Color.Maroon; }));
                }
            }) { IsBackground = true }.Start();
        }

        void AddIfFilled(Dictionary<string, object> body, string key, string val, bool numeric)
        {
            val = (val ?? "").Trim();
            if (val.Length == 0) return;
            if (numeric)
            {
                double n;
                if (double.TryParse(val, System.Globalization.NumberStyles.Any,
                                    System.Globalization.CultureInfo.InvariantCulture, out n))
                    body[key] = n;
            }
            else body[key] = val;
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
            tabs.TabPages.Add(MakeTab("Users", new UsersPanel()));
            tabs.TabPages.Add(MakeTab("Security", new SecurityPanel()));
            tabs.TabPages.Add(MakeTab("Settings", new SettingsPanel()));
            tabs.TabPages.Add(MakeTab("Analytics", new AnalyticsPanel()));
            tabs.TabPages.Add(MakeTab("Beacons", new WifiPanel()));
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
