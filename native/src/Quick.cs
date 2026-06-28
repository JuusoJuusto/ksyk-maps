// KSYK Maps Quick — native Windows utility for students.
//
// Pure C# 5 WinForms compiled with Windows' built-in csc.exe.
// Connects to https://ksykmaps.fi/api/* directly via HttpWebRequest.
//
// Tabs: Find a room · Lunch · Announcements

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Xml;

namespace KsykQuick
{
    public static class Api
    {
        public static string Base = "https://ksykmaps.fi/api";
        private static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

        static Api()
        {
            Json.MaxJsonLength = int.MaxValue;
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
        }

        public static object Request(string path, int timeoutMs = 12000)
        {
            var req = (HttpWebRequest)WebRequest.Create(Base + path);
            req.Accept = "application/json,application/xml,*/*";
            req.UserAgent = "KSYK-Maps-Quick/1.0 (native)";
            req.Timeout = timeoutMs;
            using (var resp = (HttpWebResponse)req.GetResponse())
            using (var sr = new StreamReader(resp.GetResponseStream()))
            {
                var text = sr.ReadToEnd();
                if (text.TrimStart().StartsWith("<")) return text;
                return Json.DeserializeObject(text);
            }
        }

        public static string Str(object o, string key)
        {
            var d = o as IDictionary<string, object>;
            if (d == null || !d.ContainsKey(key) || d[key] == null) return "";
            return d[key].ToString();
        }
    }

    public class RoomFinder : UserControl
    {
        readonly TextBox txt = new TextBox();
        readonly ListView list = new ListView();
        readonly Label status = new Label();
        List<IDictionary<string, object>> rooms = new List<IDictionary<string, object>>();

        public RoomFinder()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Find a room:", Location = new Point(8, 10), AutoSize = true });
            txt.Location = new Point(85, 7);
            txt.Size = new Size(260, 22);
            txt.TextChanged += (s, e) => Render();
            tb.Controls.Add(txt);
            var btn = new Button { Text = "Reload", Location = new Point(355, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            status.Dock = DockStyle.Bottom;
            status.Height = 22;
            status.TextAlign = ContentAlignment.MiddleLeft;
            status.Padding = new Padding(8, 0, 0, 0);
            status.ForeColor = SystemColors.GrayText;
            Controls.Add(status);

            var btnOpen = new Button
            {
                Text = "Open on web map",
                Dock = DockStyle.Bottom,
                Height = 28,
            };
            btnOpen.Click += (s, e) => OpenSelected();
            Controls.Add(btnOpen);

            list.View = View.Details;
            list.FullRowSelect = true;
            list.GridLines = true;
            list.Dock = DockStyle.Fill;
            list.Columns.Add("Number", 80);
            list.Columns.Add("Name", 260);
            list.Columns.Add("Floor", 50);
            list.Columns.Add("Type", 110);
            list.Columns.Add("Status", 110);
            list.DoubleClick += (s, e) => OpenSelected();
            Controls.Add(list);
            list.BringToFront();

            Load();
        }

        void Load()
        {
            status.Text = "Loading...";
            status.ForeColor = Color.Navy;
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
                        status.Text = rooms.Count + " rooms loaded.";
                        status.ForeColor = SystemColors.GrayText;
                        Render();
                    }));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { status.Text = ex.Message; status.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Render()
        {
            var q = txt.Text.Trim().ToLower();
            list.BeginUpdate();
            list.Items.Clear();
            foreach (var r in rooms)
            {
                var num = Api.Str(r, "roomNumber");
                var nm = Api.Str(r, "name");
                var tp = Api.Str(r, "type");
                if (q.Length > 0 && !(num.ToLower().Contains(q) || nm.ToLower().Contains(q) || tp.ToLower().Contains(q)))
                    continue;
                var item = new ListViewItem(new[] { num, nm, Api.Str(r, "floor"), tp, Api.Str(r, "currentStatus") });
                item.Tag = Api.Str(r, "id");
                list.Items.Add(item);
                if (list.Items.Count >= 200) break;
            }
            list.EndUpdate();
        }

        void OpenSelected()
        {
            string url = "https://ksykmaps.fi";
            if (list.SelectedItems.Count > 0)
                url = "https://ksykmaps.fi/?room=" + list.SelectedItems[0].Tag;
            try { Process.Start(url); } catch { }
        }
    }

    public class LunchPanel : UserControl
    {
        readonly RichTextBox text = new RichTextBox();
        readonly Label status = new Label();
        public LunchPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "School lunch — this week", Location = new Point(8, 10), AutoSize = true });
            var btn = new Button { Text = "Reload", Location = new Point(180, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            status.Dock = DockStyle.Bottom;
            status.Height = 22;
            status.TextAlign = ContentAlignment.MiddleLeft;
            status.Padding = new Padding(8, 0, 0, 0);
            status.ForeColor = SystemColors.GrayText;
            Controls.Add(status);

            text.Dock = DockStyle.Fill;
            text.Font = new Font("MS Sans Serif", 10F);
            text.ReadOnly = true;
            text.BackColor = Color.White;
            text.BorderStyle = BorderStyle.Fixed3D;
            Controls.Add(text);
            text.BringToFront();

            Load();
        }

        void Load()
        {
            text.Text = "Loading...";
            var t = new Thread(() =>
            {
                try
                {
                    var raw = Api.Request("/lunch-menu") as string;
                    var items = ParseRss(raw ?? "");
                    BeginInvoke((Action)(() => Render(items)));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { text.Text = "Error: " + ex.Message; status.Text = "Failed."; status.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        List<KeyValuePair<string, string>> ParseRss(string xml)
        {
            var result = new List<KeyValuePair<string, string>>();
            if (string.IsNullOrEmpty(xml)) return result;
            var doc = new XmlDocument();
            try { doc.LoadXml(xml); } catch { return result; }
            foreach (XmlNode item in doc.GetElementsByTagName("item"))
            {
                string title = "";
                string desc = "";
                foreach (XmlNode c in item.ChildNodes)
                {
                    if (c.Name == "title") title = c.InnerText;
                    else if (c.Name == "description") desc = c.InnerText;
                }
                desc = Regex.Replace(desc ?? "", "<[^>]+>", "\n").Trim();
                if (title.Length > 0) result.Add(new KeyValuePair<string, string>(title, desc));
            }
            return result;
        }

        void Render(List<KeyValuePair<string, string>> items)
        {
            text.SuspendLayout();
            text.Text = "";
            if (items.Count == 0)
            {
                text.AppendText("No menu entries found.");
                status.Text = "Empty.";
                status.ForeColor = SystemColors.GrayText;
                text.ResumeLayout();
                return;
            }
            foreach (var kv in items)
            {
                text.SelectionFont = new Font("MS Sans Serif", 11F, FontStyle.Bold);
                text.SelectionColor = Color.Navy;
                text.AppendText(kv.Key + "\r\n");
                text.SelectionFont = new Font("MS Sans Serif", 10F);
                text.SelectionColor = Color.Black;
                text.AppendText((kv.Value.Length > 0 ? kv.Value : "—") + "\r\n\r\n");
            }
            text.SelectionStart = 0;
            text.ScrollToCaret();
            text.ResumeLayout();
            status.Text = items.Count + " day(s) loaded.";
            status.ForeColor = Color.Green;
        }
    }

    public class AnnouncementsPanel : UserControl
    {
        readonly RichTextBox text = new RichTextBox();
        readonly Label status = new Label();
        public AnnouncementsPanel()
        {
            BackColor = SystemColors.Control;
            Dock = DockStyle.Fill;

            var tb = new Panel { Dock = DockStyle.Top, Height = 36 };
            tb.Controls.Add(new Label { Text = "Latest announcements", Location = new Point(8, 10), AutoSize = true });
            var btn = new Button { Text = "Reload", Location = new Point(180, 6), Size = new Size(75, 24) };
            btn.Click += (s, e) => Load();
            tb.Controls.Add(btn);
            Controls.Add(tb);

            status.Dock = DockStyle.Bottom;
            status.Height = 22;
            status.TextAlign = ContentAlignment.MiddleLeft;
            status.Padding = new Padding(8, 0, 0, 0);
            status.ForeColor = SystemColors.GrayText;
            Controls.Add(status);

            text.Dock = DockStyle.Fill;
            text.Font = new Font("MS Sans Serif", 9F);
            text.ReadOnly = true;
            text.BackColor = Color.White;
            text.BorderStyle = BorderStyle.Fixed3D;
            Controls.Add(text);
            text.BringToFront();

            Load();
        }

        void Load()
        {
            text.Text = "Loading...";
            var t = new Thread(() =>
            {
                try
                {
                    var data = Api.Request("/announcements?limit=20") as object[];
                    var items = new List<IDictionary<string, object>>();
                    if (data != null) foreach (var a in data) items.Add(a as IDictionary<string, object>);
                    BeginInvoke((Action)(() => Render(items)));
                }
                catch (Exception ex)
                {
                    BeginInvoke((Action)(() => { text.Text = "Error: " + ex.Message; status.Text = "Failed."; status.ForeColor = Color.Maroon; }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        void Render(List<IDictionary<string, object>> items)
        {
            text.SuspendLayout();
            text.Text = "";
            if (items.Count == 0)
            {
                text.AppendText("No announcements.");
                text.ResumeLayout();
                return;
            }
            foreach (var a in items)
            {
                text.SelectionFont = new Font("MS Sans Serif", 11F, FontStyle.Bold);
                text.SelectionColor = Color.Navy;
                text.AppendText((Api.Str(a, "title").Length > 0 ? Api.Str(a, "title") : "Untitled") + "\r\n");
                var created = Api.Str(a, "createdAt");
                if (created.Length > 19) created = created.Substring(0, 19).Replace("T", " ");
                text.SelectionFont = new Font("MS Sans Serif", 8F);
                text.SelectionColor = SystemColors.GrayText;
                text.AppendText(created + "\r\n");
                var body = Api.Str(a, "content");
                if (body.Length == 0) body = Api.Str(a, "body");
                text.SelectionFont = new Font("MS Sans Serif", 9F);
                text.SelectionColor = Color.Black;
                text.AppendText((body.Length > 0 ? body : "—") + "\r\n\r\n");
            }
            text.SelectionStart = 0;
            text.ScrollToCaret();
            text.ResumeLayout();
            status.Text = items.Count + " announcement(s).";
            status.ForeColor = Color.Green;
        }
    }

    public class MainForm : Form
    {
        public MainForm()
        {
            Text = "KSYK Maps Quick";
            Size = new Size(820, 600);
            MinimumSize = new Size(640, 480);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = SystemColors.Control;
            Font = new Font("MS Sans Serif", 9F);

            // Pull the .exe's own embedded Win32 icon at runtime so the
            // taskbar and alt-tab switcher show the KSYK Maps logo.
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch { }
            if (Icon == null)
            {
                try
                {
                    using (var s = System.Reflection.Assembly.GetExecutingAssembly()
                                .GetManifestResourceStream("KsykQuick.app.ico"))
                        if (s != null) Icon = new Icon(s);
                }
                catch { }
            }

            var menu = new MenuStrip();
            var file = new ToolStripMenuItem("&File");
            file.DropDownItems.Add("Open &ksykmaps.fi", null, (s, e) => { try { Process.Start("https://ksykmaps.fi"); } catch { } });
            file.DropDownItems.Add("-");
            file.DropDownItems.Add("&About", null, (s, e) => MessageBox.Show(
                "KSYK Maps Quick\r\nVersion 1.0.0\r\n\r\nNative Windows utility for KSYK students.\r\nFind rooms · lunch menu · announcements.\r\n\r\nConnects to " + Api.Base + "\r\n\r\n© 2026 Nordbyte Studio",
                "About"));
            file.DropDownItems.Add("E&xit", null, (s, e) => Close());
            menu.Items.Add(file);
            MainMenuStrip = menu;
            Controls.Add(menu);

            var tabs = new TabControl { Dock = DockStyle.Fill };
            var t1 = new TabPage("Find a room"); t1.Controls.Add(new RoomFinder()); tabs.TabPages.Add(t1);
            var t2 = new TabPage("Lunch"); t2.Controls.Add(new LunchPanel()); tabs.TabPages.Add(t2);
            var t3 = new TabPage("Announcements"); t3.Controls.Add(new AnnouncementsPanel()); tabs.TabPages.Add(t3);
            Controls.Add(tabs);
            tabs.BringToFront();

            // ── Branded footer bar ───────────────────────────────────
            var ss = new StatusStrip
            {
                BackColor = Color.FromArgb(15, 35, 80),
                ForeColor = Color.White,
                Padding = new Padding(8, 2, 8, 2),
                SizingGrip = false,
            };
            try
            {
                using (var s = System.Reflection.Assembly.GetExecutingAssembly()
                    .GetManifestResourceStream("KsykQuick.app.ico"))
                {
                    if (s != null)
                    {
                        var icoStrip = new ToolStripStatusLabel
                        {
                            Image = new Icon(s, 16, 16).ToBitmap(),
                            ImageScaling = ToolStripItemImageScaling.None,
                            DisplayStyle = ToolStripItemDisplayStyle.Image,
                        };
                        ss.Items.Add(icoStrip);
                    }
                }
            }
            catch { }
            ss.Items.Add(new ToolStripStatusLabel("KSYK Maps Quick")
            {
                Font = new Font("Segoe UI", 8.5F, FontStyle.Bold),
                ForeColor = Color.White,
            });
            ss.Items.Add(new ToolStripStatusLabel("●  ksykmaps.fi")
            {
                Font = new Font("Segoe UI", 8F),
                ForeColor = Color.FromArgb(180, 200, 230),
            });
            ss.Items.Add(new ToolStripStatusLabel { Spring = true });
            ss.Items.Add(new ToolStripStatusLabel("v1.0.0")
            {
                Font = new Font("Segoe UI", 8F),
                ForeColor = Color.FromArgb(180, 200, 230),
            });
            ss.Items.Add(new ToolStripStatusLabel("·") { ForeColor = Color.FromArgb(120, 140, 170) });
            var clockLabel = new ToolStripStatusLabel(DateTime.Now.ToString("HH:mm"))
            {
                Font = new Font("Consolas", 8.5F),
                ForeColor = Color.White,
            };
            ss.Items.Add(clockLabel);
            Controls.Add(ss);

            var clock = new System.Windows.Forms.Timer { Interval = 30000 };
            clock.Tick += (s, e) => clockLabel.Text = DateTime.Now.ToString("HH:mm");
            clock.Start();
        }
    }

    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            var envBase = Environment.GetEnvironmentVariable("KSYK_API_BASE");
            if (!string.IsNullOrEmpty(envBase)) Api.Base = envBase;
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MainForm());
        }
    }
}
