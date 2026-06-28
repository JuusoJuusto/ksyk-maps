// KSYK Maps — native Setup.exe installer wizard.
//
// A self-contained Windows installer compiled with csc.exe. Embeds the
// payload .exe(s) as managed resources, then on install:
//   1. Copies them into  %LOCALAPPDATA%\Programs\KSYK Maps
//   2. Writes a tiny Uninstall.exe next to them
//   3. Creates a Start-Menu shortcut + (optional) desktop shortcut
//   4. Registers an Add/Remove Programs entry pointing at Uninstall.exe
//
// Run with /uninstall to take the same path back out.
//
// Build:
//   csc.exe /target:winexe /out:Setup.exe ^
//     /resource:KSYK-Maps-Admin.exe ^
//     /resource:KSYK-Maps-Quick.exe ^
//     /reference:System.Windows.Forms.dll ^
//     /reference:System.Drawing.dll ^
//     Setup.cs

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Microsoft.Win32;
using System.Windows.Forms;

namespace KsykSetup
{
    public static class Manifest
    {
        public const string ProductName = "KSYK Maps";
        public const string Version = "1.0.0";
        public const string Publisher = "Nordbyte Studio";
        public const string Website = "https://ksykmaps.fi";
        public const string UninstallKey =
            @"Software\Microsoft\Windows\CurrentVersion\Uninstall\KSYKMaps";

        // The payload .exes are embedded with these resource names. They're
        // the same filenames the build script puts next to Setup.cs.
        public static readonly Payload[] Apps = new[]
        {
            new Payload {
                ResourceName = "KSYK-Maps-Admin.exe",
                ExeName      = "KSYK-Maps-Admin.exe",
                ShortcutName = "KSYK Maps Admin",
            },
            new Payload {
                ResourceName = "KSYK-Maps-Quick.exe",
                ExeName      = "KSYK-Maps-Quick.exe",
                ShortcutName = "KSYK Maps",
            },
        };
    }

    public class Payload
    {
        public string ResourceName;
        public string ExeName;
        public string ShortcutName;
    }

    public static class Paths
    {
        public static string DefaultInstallDir
        {
            get
            {
                var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                return Path.Combine(local, "Programs", Manifest.ProductName);
            }
        }

        public static string StartMenuDir
        {
            get
            {
                var p = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
                return Path.Combine(p, "Programs", Manifest.ProductName);
            }
        }

        public static string Desktop
        {
            get { return Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory); }
        }
    }

    // ── Shortcut creator (no external deps; talks to WSH via COM) ──────

    public static class Shortcuts
    {
        public static void Create(string lnkPath, string target, string description, string iconPath)
        {
            // Use WScript.Shell so we don't need IWshRuntimeLibrary.dll.
            var t = Type.GetTypeFromProgID("WScript.Shell");
            if (t == null) return;
            dynamic shell = Activator.CreateInstance(t);
            var dir = Path.GetDirectoryName(lnkPath);
            if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
            dynamic lnk = shell.CreateShortcut(lnkPath);
            lnk.TargetPath = target;
            lnk.WorkingDirectory = Path.GetDirectoryName(target);
            lnk.Description = description;
            if (!string.IsNullOrEmpty(iconPath)) lnk.IconLocation = iconPath;
            lnk.Save();
        }
    }

    // ── Wizard pages ───────────────────────────────────────────────────
    //
    // The wizard uses a docked layout with a TableLayoutPanel as the
    // footer so buttons auto-right-align and never clip regardless of
    // form size or DPI. Sidebar carries the KSYK Maps logo bitmap; the
    // header strip has a coloured rule under it for a modern feel.

    public class WizardForm : Form
    {
        readonly Panel content = new Panel { Dock = DockStyle.Fill, BackColor = SystemColors.Control };
        readonly Button btnBack = new Button { Text = "Back", Size = new Size(96, 32), FlatStyle = FlatStyle.System };
        readonly Button btnNext = new Button { Text = "Next", Size = new Size(96, 32), FlatStyle = FlatStyle.System };
        readonly Button btnCancel = new Button { Text = "Cancel", Size = new Size(96, 32), FlatStyle = FlatStyle.System };
        readonly Label headerTitle = new Label();
        readonly Label headerSub = new Label();
        readonly Panel headerBar = new Panel { BackColor = Color.White, Dock = DockStyle.Top, Height = 72 };
        readonly Panel sidebar = new Panel { BackColor = Color.FromArgb(15, 35, 80), Dock = DockStyle.Left, Width = 200 };

        // KSYK accent
        static readonly Color Accent = Color.FromArgb(37, 99, 235);
        static readonly Color AccentDark = Color.FromArgb(29, 78, 216);

        int page = 0;
        string installDir = Paths.DefaultInstallDir;
        bool installAdmin = true;
        bool installQuick = true;
        bool createDesktop = true;
        bool launchAfter = true;
        bool pinStartMenu = true;
        bool installing = false;
        bool installFailed = false;
        string installError = "";

        public WizardForm()
        {
            Text = Manifest.ProductName + " Setup";
            ClientSize = new Size(720, 500);
            MinimumSize = new Size(720, 500);
            MaximumSize = new Size(720, 500);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = SystemColors.Control;
            Font = new Font(SystemFonts.MessageBoxFont.FontFamily, 9F);
            try
            {
                using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                    if (s != null) Icon = new Icon(s);
            }
            catch { }
            if (Icon == null) Icon = SystemIcons.Application;

            BuildFooter();
            BuildSidebar();
            BuildHeader();

            content.Padding = new Padding(28, 88, 28, 16);
            Controls.Add(content);
            content.BringToFront();

            ShowPage();
        }

        // ── Chrome ───────────────────────────────────────────────────────

        void BuildFooter()
        {
            // TableLayoutPanel auto-handles spacing; no x-coordinate math
            // means no clipping at any DPI or form size.
            var foot = new Panel { Dock = DockStyle.Bottom, Height = 56, BackColor = Color.FromArgb(245, 246, 249) };
            var rule = new Panel { Dock = DockStyle.Top, Height = 1, BackColor = Color.FromArgb(220, 224, 232) };
            foot.Controls.Add(rule);

            var row = new TableLayoutPanel
            {
                Dock = DockStyle.Fill,
                ColumnCount = 5,
                RowCount = 1,
                Padding = new Padding(20, 10, 20, 10),
                BackColor = Color.Transparent,
            };
            row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));        // spacer (push right)
            row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));             // Cancel
            row.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 12));         // gap
            row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));             // Back
            row.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));             // Next/Install/Finish

            btnCancel.Margin = new Padding(0);
            btnBack.Margin = new Padding(0);
            btnNext.Margin = new Padding(0, 0, 0, 0);
            btnCancel.Click += (s, e) => CancelInstall();
            btnBack.Click += (s, e) => Back();
            btnNext.Click += (s, e) => Next();

            // Primary (Next) gets a coloured fill so users notice it.
            btnNext.FlatStyle = FlatStyle.Flat;
            btnNext.BackColor = Accent;
            btnNext.ForeColor = Color.White;
            btnNext.FlatAppearance.BorderSize = 0;
            btnNext.FlatAppearance.MouseOverBackColor = AccentDark;
            btnNext.Font = new Font(Font, FontStyle.Bold);

            row.Controls.Add(new Panel { Dock = DockStyle.Fill, BackColor = Color.Transparent }, 0, 0);
            row.Controls.Add(btnCancel, 1, 0);
            row.Controls.Add(new Panel { Width = 12, BackColor = Color.Transparent }, 2, 0);
            row.Controls.Add(btnBack, 3, 0);
            row.Controls.Add(btnNext, 4, 0);
            foot.Controls.Add(row);
            row.BringToFront();
            Controls.Add(foot);
        }

        void BuildSidebar()
        {
            Controls.Add(sidebar);

            // Try to draw the KSYK Maps logo bitmap embedded as a resource.
            // Falls back to "KSYK Maps" text if the image can't be loaded.
            PictureBox logo = null;
            try
            {
                using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.png"))
                {
                    if (s != null)
                    {
                        logo = new PictureBox
                        {
                            Image = Image.FromStream(s),
                            SizeMode = PictureBoxSizeMode.Zoom,
                            Location = new Point(28, 40),
                            Size = new Size(144, 144),
                            BackColor = Color.Transparent,
                        };
                    }
                }
            }
            catch { }

            if (logo != null) sidebar.Controls.Add(logo);
            else
            {
                sidebar.Controls.Add(new Label
                {
                    Text = "KSYK\nMaps",
                    Font = new Font(Font.FontFamily, 28F, FontStyle.Bold),
                    ForeColor = Color.White,
                    BackColor = Color.Transparent,
                    Location = new Point(24, 60),
                    Size = new Size(160, 110),
                });
            }

            sidebar.Controls.Add(new Label
            {
                Text = "Setup",
                Font = new Font(Font.FontFamily, 18F, FontStyle.Bold),
                ForeColor = Color.White,
                BackColor = Color.Transparent,
                Location = new Point(28, 210),
                AutoSize = true,
            });
            sidebar.Controls.Add(new Label
            {
                Text = "Version " + Manifest.Version,
                ForeColor = Color.FromArgb(170, 195, 240),
                BackColor = Color.Transparent,
                Location = new Point(28, 244),
                AutoSize = true,
            });

            sidebar.Controls.Add(new Label
            {
                Text = Manifest.Publisher,
                ForeColor = Color.FromArgb(150, 175, 220),
                BackColor = Color.Transparent,
                Location = new Point(28, 400),
                AutoSize = true,
                Font = new Font(Font.FontFamily, 8F),
            });
            sidebar.Controls.Add(new Label
            {
                Text = "ksykmaps.fi",
                ForeColor = Color.FromArgb(150, 175, 220),
                BackColor = Color.Transparent,
                Location = new Point(28, 416),
                AutoSize = true,
                Font = new Font(Font.FontFamily, 8F),
            });
        }

        void BuildHeader()
        {
            headerBar.Padding = new Padding(28, 14, 28, 0);
            var accent = new Panel { Dock = DockStyle.Bottom, Height = 2, BackColor = Accent };
            headerBar.Controls.Add(accent);

            headerTitle.Font = new Font(Font.FontFamily, 14F, FontStyle.Bold);
            headerTitle.ForeColor = Color.FromArgb(15, 35, 80);
            headerTitle.AutoSize = true;
            headerTitle.Location = new Point(28, 12);

            headerSub.Font = new Font(Font.FontFamily, 9F);
            headerSub.ForeColor = Color.FromArgb(100, 110, 130);
            headerSub.AutoSize = true;
            headerSub.Location = new Point(28, 42);

            headerBar.Controls.Add(headerTitle);
            headerBar.Controls.Add(headerSub);
            Controls.Add(headerBar);
            headerBar.BringToFront();
        }

        // ── Page rendering ───────────────────────────────────────────────

        void ShowPage()
        {
            content.SuspendLayout();
            content.Controls.Clear();

            switch (page)
            {
                case 0: BuildWelcome(); break;
                case 1: BuildOptions(); break;
                case 2: BuildConfirm(); break;
                case 3: BuildInstall(); break;
                case 4: BuildDone(); break;
            }

            btnBack.Enabled = page > 0 && page < 3;
            btnBack.Visible = page < 4;
            btnNext.Enabled = page < 4 && !installing;
            btnCancel.Visible = page < 3;
            btnNext.Text = page == 2 ? "Install" : page == 4 ? "Finish" : "Next";
            content.ResumeLayout();
        }

        void BuildWelcome()
        {
            headerTitle.Text = "Welcome to " + Manifest.ProductName;
            headerSub.Text = "This wizard will guide you through the installation.";

            int y = 16;
            content.Controls.Add(new Label
            {
                Text = "What's included",
                Font = new Font(Font.FontFamily, 11F, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 40, 60),
                Location = new Point(0, y),
                AutoSize = true,
            });
            y += 28;

            content.Controls.Add(MakeFeatureCard(
                0, y, 460, 78,
                "KSYK Maps",
                "Find a classroom, see the lunch menu, read the latest school announcements."));
            y += 86;

            content.Controls.Add(MakeFeatureCard(
                0, y, 460, 78,
                "KSYK Maps Admin",
                "Manage rooms, buildings, tickets, analytics and WiFi survey data."));
            y += 100;

            content.Controls.Add(new Label
            {
                Text = "Click Next to continue.",
                ForeColor = Color.FromArgb(100, 110, 130),
                Location = new Point(0, y),
                AutoSize = true,
            });
        }

        Panel MakeFeatureCard(int x, int y, int w, int h, string title, string sub)
        {
            var card = new Panel
            {
                Location = new Point(x, y),
                Size = new Size(w, h),
                BackColor = Color.FromArgb(247, 249, 253),
                BorderStyle = BorderStyle.FixedSingle,
            };
            var accent = new Panel { Dock = DockStyle.Left, Width = 4, BackColor = Accent };
            card.Controls.Add(accent);
            card.Controls.Add(new Label
            {
                Text = title,
                Font = new Font(Font.FontFamily, 10F, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 35, 80),
                Location = new Point(18, 14),
                AutoSize = true,
            });
            content.Controls.Add(card);
            card.Controls.Add(new Label
            {
                Text = sub,
                ForeColor = Color.FromArgb(80, 90, 110),
                Location = new Point(18, 38),
                Size = new Size(w - 30, 36),
                AutoSize = false,
            });
            return card;
        }

        TextBox txtDir;
        CheckBox cbDesktop;
        CheckBox cbLaunch;
        CheckBox cbStartMenu;
        CheckBox cbInstallAdmin;
        CheckBox cbInstallQuick;
        Label lblSpace;

        void BuildOptions()
        {
            headerTitle.Text = "Installation options";
            headerSub.Text = "Choose what to install, where, and which shortcuts to create.";

            // ── Component selection group ────────────────────────────
            var grpComp = new GroupBox
            {
                Text = "Components",
                Location = new Point(0, 6),
                Size = new Size(460, 86),
                Padding = new Padding(10),
            };
            cbInstallQuick = new CheckBox
            {
                Text = "KSYK Maps  — student utility (recommended)",
                Checked = installQuick,
                Location = new Point(14, 22),
                AutoSize = true,
            };
            cbInstallAdmin = new CheckBox
            {
                Text = "KSYK Maps Admin  — admin tools (rooms, tickets, analytics, WiFi)",
                Checked = installAdmin,
                Location = new Point(14, 50),
                AutoSize = true,
            };
            grpComp.Controls.Add(cbInstallQuick);
            grpComp.Controls.Add(cbInstallAdmin);
            content.Controls.Add(grpComp);

            // ── Install location ─────────────────────────────────────
            var grpLoc = new GroupBox
            {
                Text = "Install location",
                Location = new Point(0, 102),
                Size = new Size(460, 78),
                Padding = new Padding(10),
            };
            txtDir = new TextBox
            {
                Text = installDir,
                Location = new Point(14, 30),
                Size = new Size(340, 22),
            };
            txtDir.TextChanged += (s, e) => UpdateSpace();
            var browse = new Button
            {
                Text = "Browse...",
                Location = new Point(362, 29),
                Size = new Size(82, 24),
                FlatStyle = FlatStyle.System,
            };
            browse.Click += (s, e) =>
            {
                using (var fb = new FolderBrowserDialog())
                {
                    fb.Description = "Choose install folder";
                    try { fb.SelectedPath = txtDir.Text; } catch { }
                    if (fb.ShowDialog() == DialogResult.OK) txtDir.Text = fb.SelectedPath;
                }
            };
            lblSpace = new Label
            {
                Location = new Point(14, 58),
                Size = new Size(420, 16),
                ForeColor = Color.FromArgb(100, 110, 130),
                AutoSize = false,
                Font = new Font(Font.FontFamily, 8F),
            };
            grpLoc.Controls.Add(txtDir);
            grpLoc.Controls.Add(browse);
            grpLoc.Controls.Add(lblSpace);
            content.Controls.Add(grpLoc);

            // ── Shortcuts + post-install ─────────────────────────────
            var grpExtras = new GroupBox
            {
                Text = "Shortcuts",
                Location = new Point(0, 190),
                Size = new Size(460, 100),
                Padding = new Padding(10),
            };
            cbStartMenu = new CheckBox
            {
                Text = "Create Start Menu shortcuts",
                Checked = pinStartMenu,
                Location = new Point(14, 22),
                AutoSize = true,
            };
            cbDesktop = new CheckBox
            {
                Text = "Create a desktop shortcut",
                Checked = createDesktop,
                Location = new Point(14, 46),
                AutoSize = true,
            };
            cbLaunch = new CheckBox
            {
                Text = "Launch KSYK Maps when finished",
                Checked = launchAfter,
                Location = new Point(14, 70),
                AutoSize = true,
            };
            grpExtras.Controls.Add(cbStartMenu);
            grpExtras.Controls.Add(cbDesktop);
            grpExtras.Controls.Add(cbLaunch);
            content.Controls.Add(grpExtras);

            UpdateSpace();
        }

        void UpdateSpace()
        {
            if (lblSpace == null || txtDir == null) return;
            var dir = txtDir.Text;
            var space = GetFreeSpaceMb(dir);
            lblSpace.Text = "About 1 MB required."
                + (space > 0 ? "    Available on this drive: " + space.ToString("N0") + " MB." : "");
        }

        long GetFreeSpaceMb(string p)
        {
            try
            {
                var root = Path.GetPathRoot(Path.GetFullPath(p));
                if (string.IsNullOrEmpty(root)) return 0;
                var drive = new DriveInfo(root);
                return drive.IsReady ? drive.AvailableFreeSpace / (1024 * 1024) : 0;
            }
            catch { return 0; }
        }

        void BuildConfirm()
        {
            headerTitle.Text = "Ready to install";
            headerSub.Text = "Review your choices, then click Install to begin.";

            int y = 4;

            content.Controls.Add(SummaryRow(0, y, "Install to", installDir));
            y += 56;

            var comps = new List<string>();
            if (installQuick) comps.Add("KSYK Maps (student utility)");
            if (installAdmin) comps.Add("KSYK Maps Admin (admin tools)");
            content.Controls.Add(SummaryRow(0, y, "Components",
                comps.Count > 0 ? string.Join("\r\n", comps.ToArray()) : "— none selected —"));
            y += 80;

            var actions = new List<string>();
            if (pinStartMenu) actions.Add("Start Menu folder \"" + Manifest.ProductName + "\"");
            if (createDesktop) actions.Add("Desktop shortcut");
            actions.Add("Add or Remove Programs entry");
            if (launchAfter) actions.Add("Launch when finished");
            content.Controls.Add(SummaryRow(0, y, "Will also create", string.Join("\r\n", actions.ToArray())));
        }

        Panel SummaryRow(int x, int y, string title, string value)
        {
            var p = new Panel
            {
                Location = new Point(x, y),
                Size = new Size(460, value.Split('\n').Length * 18 + 30),
                BackColor = Color.FromArgb(247, 249, 253),
                BorderStyle = BorderStyle.FixedSingle,
            };
            p.Controls.Add(new Label
            {
                Text = title,
                Font = new Font(Font.FontFamily, 8F, FontStyle.Bold),
                ForeColor = Color.FromArgb(100, 110, 130),
                Location = new Point(14, 8),
                AutoSize = true,
            });
            p.Controls.Add(new Label
            {
                Text = value,
                ForeColor = Color.FromArgb(20, 30, 50),
                Location = new Point(14, 24),
                Size = new Size(430, p.Height - 26),
                AutoSize = false,
                Font = new Font(Font.FontFamily, 9F),
            });
            return p;
        }

        Label statusLine;
        Label statusDetail;
        ProgressBar progress;
        TextBox installLog;

        void BuildInstall()
        {
            headerTitle.Text = "Installing";
            headerSub.Text = "Setup is copying files and creating shortcuts. This takes a few seconds.";
            installing = true; installFailed = false; installError = "";

            // Install card — progress bar + animated status + live log
            var card = new Panel
            {
                Location = new Point(0, 16),
                Size = new Size(460, 360),
                BackColor = Color.FromArgb(247, 249, 253),
                BorderStyle = BorderStyle.FixedSingle,
            };
            var accent = new Panel { Dock = DockStyle.Left, Width = 4, BackColor = Accent };
            card.Controls.Add(accent);

            // KSYK logo on the install page so it doesn't feel generic.
            try
            {
                using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("icon.ico"))
                {
                    if (s != null)
                    {
                        var pic = new PictureBox
                        {
                            Image = new Icon(s, 48, 48).ToBitmap(),
                            SizeMode = PictureBoxSizeMode.CenterImage,
                            Location = new Point(20, 16),
                            Size = new Size(48, 48),
                            BackColor = Color.Transparent,
                        };
                        card.Controls.Add(pic);
                    }
                }
            }
            catch { }

            card.Controls.Add(new Label
            {
                Text = "Installing " + Manifest.ProductName,
                Font = new Font(Font.FontFamily, 13F, FontStyle.Bold),
                ForeColor = Color.FromArgb(15, 35, 80),
                Location = new Point(80, 22),
                AutoSize = true,
            });
            card.Controls.Add(new Label
            {
                Text = "Version " + Manifest.Version + " · " + Manifest.Publisher,
                Font = new Font(Font.FontFamily, 8F),
                ForeColor = Color.FromArgb(110, 120, 140),
                Location = new Point(80, 46),
                AutoSize = true,
            });

            progress = new ProgressBar
            {
                Location = new Point(20, 84),
                Size = new Size(420, 18),
                Style = ProgressBarStyle.Continuous,
            };
            card.Controls.Add(progress);

            statusLine = new Label
            {
                Location = new Point(20, 110),
                Size = new Size(420, 18),
                Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                ForeColor = Color.FromArgb(30, 40, 60),
                AutoSize = false,
            };
            card.Controls.Add(statusLine);

            statusDetail = new Label
            {
                Location = new Point(20, 128),
                Size = new Size(420, 18),
                ForeColor = Color.FromArgb(100, 110, 130),
                AutoSize = false,
                Font = new Font(Font.FontFamily, 8.5F),
            };
            card.Controls.Add(statusDetail);

            // Live installation log — shows what's happening as it happens,
            // useful when something fails so the user can copy the trace.
            card.Controls.Add(new Label
            {
                Text = "Activity log",
                Font = new Font(Font.FontFamily, 8F, FontStyle.Bold),
                ForeColor = Color.FromArgb(110, 120, 140),
                Location = new Point(20, 156),
                AutoSize = true,
            });
            installLog = new TextBox
            {
                Location = new Point(20, 174),
                Size = new Size(420, 168),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                Font = new Font("Consolas", 8F),
                BackColor = Color.White,
                ForeColor = Color.FromArgb(60, 70, 90),
            };
            card.Controls.Add(installLog);

            content.Controls.Add(card);

            var t = new Thread(() => RunInstall());
            t.IsBackground = true;
            t.Start();
        }

        void BuildDone()
        {
            if (installFailed)
            {
                headerTitle.Text = "Setup failed";
                headerSub.Text = "Something went wrong during installation.";

                var card = new Panel
                {
                    Location = new Point(0, 24),
                    Size = new Size(460, 280),
                    BackColor = Color.FromArgb(254, 242, 242),
                    BorderStyle = BorderStyle.FixedSingle,
                };
                var accent = new Panel { Dock = DockStyle.Left, Width = 4, BackColor = Color.FromArgb(220, 38, 38) };
                card.Controls.Add(accent);
                card.Controls.Add(new Label
                {
                    Text = "✕",
                    Font = new Font(Font.FontFamily, 32F, FontStyle.Bold),
                    ForeColor = Color.FromArgb(220, 38, 38),
                    Location = new Point(24, 14),
                    AutoSize = true,
                });
                card.Controls.Add(new Label
                {
                    Text = "Installation could not complete",
                    Font = new Font(Font.FontFamily, 12F, FontStyle.Bold),
                    ForeColor = Color.FromArgb(80, 14, 14),
                    Location = new Point(64, 24),
                    AutoSize = true,
                });
                card.Controls.Add(new Label
                {
                    Text = installError,
                    Location = new Point(24, 80),
                    Size = new Size(420, 180),
                    ForeColor = Color.FromArgb(60, 10, 10),
                    Font = new Font("Consolas", 8.5F),
                    AutoSize = false,
                });
                content.Controls.Add(card);
            }
            else
            {
                headerTitle.Text = "All set";
                headerSub.Text = "Setup finished successfully.";

                var card = new Panel
                {
                    Location = new Point(0, 24),
                    Size = new Size(460, 280),
                    BackColor = Color.FromArgb(240, 253, 244),
                    BorderStyle = BorderStyle.FixedSingle,
                };
                var accent = new Panel { Dock = DockStyle.Left, Width = 4, BackColor = Color.FromArgb(34, 197, 94) };
                card.Controls.Add(accent);
                card.Controls.Add(new Label
                {
                    Text = "✓",
                    Font = new Font(Font.FontFamily, 32F, FontStyle.Bold),
                    ForeColor = Color.FromArgb(34, 197, 94),
                    Location = new Point(24, 14),
                    AutoSize = true,
                });
                card.Controls.Add(new Label
                {
                    Text = Manifest.ProductName + " is installed",
                    Font = new Font(Font.FontFamily, 14F, FontStyle.Bold),
                    ForeColor = Color.FromArgb(15, 90, 50),
                    Location = new Point(64, 22),
                    AutoSize = true,
                });
                card.Controls.Add(new Label
                {
                    Text = "Version " + Manifest.Version,
                    Location = new Point(64, 50),
                    ForeColor = Color.FromArgb(80, 110, 90),
                    AutoSize = true,
                });

                var bullets = new StringBuilder();
                bullets.AppendLine("• Find the apps in the Start Menu (search “KSYK”).");
                if (createDesktop)
                    bullets.AppendLine("• A desktop shortcut was created.");
                bullets.AppendLine("• Uninstall from Add or Remove Programs at any time.");
                card.Controls.Add(new Label
                {
                    Text = bullets.ToString(),
                    Location = new Point(24, 90),
                    Size = new Size(420, 80),
                    ForeColor = Color.FromArgb(30, 80, 50),
                    Font = new Font(Font.FontFamily, 9.5F),
                    AutoSize = false,
                });

                // Action buttons — open install folder + launch app now.
                var btnFolder = new Button
                {
                    Text = "📁  Open install folder",
                    Location = new Point(24, 184),
                    Size = new Size(200, 36),
                    BackColor = Color.White,
                    FlatStyle = FlatStyle.Flat,
                    Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                    ForeColor = Color.FromArgb(15, 90, 50),
                };
                btnFolder.FlatAppearance.BorderColor = Color.FromArgb(34, 197, 94);
                btnFolder.FlatAppearance.BorderSize = 1;
                btnFolder.Click += (s, e) =>
                {
                    try { Process.Start("explorer.exe", "\"" + installDir + "\""); }
                    catch { }
                };
                card.Controls.Add(btnFolder);

                if (installAdmin)
                {
                    var btnLaunchAdmin = new Button
                    {
                        Text = "🚀  Launch Admin",
                        Location = new Point(234, 184),
                        Size = new Size(200, 36),
                        BackColor = Color.FromArgb(15, 90, 50),
                        ForeColor = Color.White,
                        FlatStyle = FlatStyle.Flat,
                        Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                    };
                    btnLaunchAdmin.FlatAppearance.BorderSize = 0;
                    btnLaunchAdmin.Click += (s, e) =>
                    {
                        try { Process.Start(Path.Combine(installDir, "KSYK-Maps-Admin.exe")); }
                        catch { }
                    };
                    card.Controls.Add(btnLaunchAdmin);
                }
                else if (installQuick)
                {
                    var btnLaunchQuick = new Button
                    {
                        Text = "🚀  Launch KSYK Maps",
                        Location = new Point(234, 184),
                        Size = new Size(200, 36),
                        BackColor = Color.FromArgb(15, 90, 50),
                        ForeColor = Color.White,
                        FlatStyle = FlatStyle.Flat,
                        Font = new Font(Font.FontFamily, 9F, FontStyle.Bold),
                    };
                    btnLaunchQuick.FlatAppearance.BorderSize = 0;
                    btnLaunchQuick.Click += (s, e) =>
                    {
                        try { Process.Start(Path.Combine(installDir, "KSYK-Maps-Quick.exe")); }
                        catch { }
                    };
                    card.Controls.Add(btnLaunchQuick);
                }

                content.Controls.Add(card);
            }
        }

        // ── Wizard nav ───────────────────────────────────────────────────

        void Next()
        {
            if (page == 1)
            {
                installDir = txtDir.Text.Trim();
                createDesktop = cbDesktop.Checked;
                launchAfter = cbLaunch.Checked;
                pinStartMenu = cbStartMenu.Checked;
                installAdmin = cbInstallAdmin.Checked;
                installQuick = cbInstallQuick.Checked;
                if (installDir.Length == 0)
                {
                    MessageBox.Show("Install location is required.", "Setup");
                    return;
                }
                if (!installAdmin && !installQuick)
                {
                    MessageBox.Show("Select at least one component to install.", "Setup");
                    return;
                }
            }
            if (page == 4)
            {
                if (!installFailed && launchAfter && installQuick)
                {
                    try { Process.Start(Path.Combine(installDir, "KSYK-Maps-Quick.exe")); } catch { }
                }
                else if (!installFailed && launchAfter && installAdmin)
                {
                    try { Process.Start(Path.Combine(installDir, "KSYK-Maps-Admin.exe")); } catch { }
                }
                Close();
                return;
            }
            page++;
            ShowPage();
        }

        void Back()
        {
            if (page > 0) { page--; ShowPage(); }
        }

        void CancelInstall()
        {
            if (page >= 3) return;
            if (MessageBox.Show("Cancel installation?", "Setup",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes) Close();
        }

        // ── Real install ─────────────────────────────────────────────────

        void RunInstall()
        {
            try
            {
                Step(5, "Preparing", "Creating install folder " + installDir);
                if (!Directory.Exists(installDir)) Directory.CreateDirectory(installDir);

                var picked = new List<Payload>();
                foreach (var p in Manifest.Apps)
                {
                    if (p.ResourceName == "KSYK-Maps-Admin.exe" && !installAdmin) continue;
                    if (p.ResourceName == "KSYK-Maps-Quick.exe" && !installQuick) continue;
                    picked.Add(p);
                }

                int written = 0;
                foreach (var p in picked)
                {
                    Step(15 + (written * 50 / Math.Max(1, picked.Count)),
                         "Extracting application files",
                         "Installing " + p.ShortcutName);
                    ExtractResource(p.ResourceName, Path.Combine(installDir, p.ExeName));
                    written++;
                }

                Step(70, "Writing uninstaller", "Uninstall.exe");
                var unPath = Path.Combine(installDir, "Uninstall.exe");
                File.Copy(Assembly.GetExecutingAssembly().Location, unPath, true);

                if (pinStartMenu || createDesktop)
                {
                    Step(80, "Creating shortcuts",
                         (pinStartMenu ? "Start Menu" : "")
                         + (pinStartMenu && createDesktop ? " + " : "")
                         + (createDesktop ? "desktop" : ""));
                    CreateAllShortcuts();
                }

                Step(90, "Registering", "Adding entry to Add or Remove Programs");
                RegisterUninstall(unPath);

                Step(100, "Done", "Installation complete.");
            }
            catch (Exception ex)
            {
                installFailed = true;
                installError = ex.Message + "\r\n\r\n" + ex.StackTrace;
            }
            finally
            {
                installing = false;
                BeginInvoke((Action)(() => { page = 4; ShowPage(); }));
            }
        }

        void Step(int pct, string title, string detail)
        {
            BeginInvoke((Action)(() =>
            {
                if (progress != null) progress.Value = Math.Min(100, pct);
                if (statusLine != null) statusLine.Text = title;
                if (statusDetail != null) statusDetail.Text = detail;
                if (installLog != null)
                {
                    var line = string.Format("[{0:HH:mm:ss}] {1,3}%  {2} — {3}",
                        DateTime.Now, pct, title, detail);
                    installLog.AppendText(line + Environment.NewLine);
                }
            }));
        }

        void ExtractResource(string name, string outPath)
        {
            var asm = Assembly.GetExecutingAssembly();
            using (var s = asm.GetManifestResourceStream(name))
            {
                if (s == null) throw new IOException("Missing embedded resource: " + name);
                using (var fs = new FileStream(outPath, FileMode.Create, FileAccess.Write))
                    s.CopyTo(fs);
            }
        }

        void CreateAllShortcuts()
        {
            if (pinStartMenu)
            {
                var smDir = Paths.StartMenuDir;
                if (!Directory.Exists(smDir)) Directory.CreateDirectory(smDir);

                foreach (var p in Manifest.Apps)
                {
                    if (p.ResourceName == "KSYK-Maps-Admin.exe" && !installAdmin) continue;
                    if (p.ResourceName == "KSYK-Maps-Quick.exe" && !installQuick) continue;
                    var target = Path.Combine(installDir, p.ExeName);
                    Shortcuts.Create(Path.Combine(smDir, p.ShortcutName + ".lnk"),
                                      target, p.ShortcutName, target);
                }
                Shortcuts.Create(Path.Combine(smDir, "Uninstall " + Manifest.ProductName + ".lnk"),
                                  Path.Combine(installDir, "Uninstall.exe"),
                                  "Uninstall " + Manifest.ProductName,
                                  Path.Combine(installDir, "Uninstall.exe"));
            }

            // Desktop shortcut points at the student utility — the most common
            // launch surface; admins know how to find the admin app.
            if (createDesktop)
            {
                Shortcuts.Create(Path.Combine(Paths.Desktop, "KSYK Maps.lnk"),
                                  Path.Combine(installDir, "KSYK-Maps-Quick.exe"),
                                  "KSYK Maps",
                                  Path.Combine(installDir, "KSYK-Maps-Quick.exe"));
            }
        }

        void RegisterUninstall(string uninstallExe)
        {
            using (var key = Registry.CurrentUser.CreateSubKey(Manifest.UninstallKey))
            {
                key.SetValue("DisplayName", Manifest.ProductName);
                key.SetValue("DisplayVersion", Manifest.Version);
                key.SetValue("Publisher", Manifest.Publisher);
                key.SetValue("URLInfoAbout", Manifest.Website);
                key.SetValue("InstallLocation", installDir);
                key.SetValue("UninstallString", "\"" + uninstallExe + "\" /uninstall");
                key.SetValue("QuietUninstallString", "\"" + uninstallExe + "\" /uninstall /silent");
                key.SetValue("DisplayIcon", Path.Combine(installDir, "KSYK-Maps-Quick.exe"));
                key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                key.SetValue("EstimatedSize", 100, RegistryValueKind.DWord);
            }
        }
    }

    // ── Silent install ─────────────────────────────────────────────────

    public static class SilentInstall
    {
        public static void Run(string installDir)
        {
            if (!Directory.Exists(installDir)) Directory.CreateDirectory(installDir);

            foreach (var p in Manifest.Apps)
            {
                var outPath = Path.Combine(installDir, p.ExeName);
                using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream(p.ResourceName))
                {
                    if (s == null) throw new IOException("Missing embedded resource: " + p.ResourceName);
                    using (var fs = new FileStream(outPath, FileMode.Create, FileAccess.Write))
                        s.CopyTo(fs);
                }
            }

            var unPath = Path.Combine(installDir, "Uninstall.exe");
            File.Copy(Assembly.GetExecutingAssembly().Location, unPath, true);

            // Shortcuts (Start Menu + desktop for Quick).
            var smDir = Paths.StartMenuDir;
            if (!Directory.Exists(smDir)) Directory.CreateDirectory(smDir);
            foreach (var p in Manifest.Apps)
            {
                var target = Path.Combine(installDir, p.ExeName);
                Shortcuts.Create(Path.Combine(smDir, p.ShortcutName + ".lnk"),
                                  target, p.ShortcutName, target);
            }
            Shortcuts.Create(Path.Combine(smDir, "Uninstall " + Manifest.ProductName + ".lnk"),
                              unPath, "Uninstall " + Manifest.ProductName, unPath);
            Shortcuts.Create(Path.Combine(Paths.Desktop, "KSYK Maps.lnk"),
                              Path.Combine(installDir, "KSYK-Maps-Quick.exe"),
                              "KSYK Maps",
                              Path.Combine(installDir, "KSYK-Maps-Quick.exe"));

            // Add/Remove Programs entry.
            using (var key = Registry.CurrentUser.CreateSubKey(Manifest.UninstallKey))
            {
                key.SetValue("DisplayName", Manifest.ProductName);
                key.SetValue("DisplayVersion", Manifest.Version);
                key.SetValue("Publisher", Manifest.Publisher);
                key.SetValue("URLInfoAbout", Manifest.Website);
                key.SetValue("InstallLocation", installDir);
                key.SetValue("UninstallString", "\"" + unPath + "\" /uninstall");
                key.SetValue("QuietUninstallString", "\"" + unPath + "\" /uninstall /silent");
                key.SetValue("DisplayIcon", Path.Combine(installDir, "KSYK-Maps-Quick.exe"));
                key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                key.SetValue("EstimatedSize", 100, RegistryValueKind.DWord);
            }
        }
    }

    // ── Uninstaller flow ───────────────────────────────────────────────

    public class UninstallForm : Form
    {
        readonly Label status = new Label();
        readonly ProgressBar progress = new ProgressBar();
        readonly Button btnOk = new Button { Text = "Close", Enabled = false };
        readonly bool silent;

        public UninstallForm(bool silent)
        {
            this.silent = silent;
            Text = "Uninstall " + Manifest.ProductName;
            Size = new Size(440, 220);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = SystemColors.Control;
            Font = new Font("MS Sans Serif", 9F);
            Icon = SystemIcons.Application;

            var lbl = new Label
            {
                Text = "Removing " + Manifest.ProductName + "...",
                Location = new Point(14, 14),
                AutoSize = true,
                Font = new Font("MS Sans Serif", 10F, FontStyle.Bold),
            };
            Controls.Add(lbl);

            progress.Location = new Point(14, 50);
            progress.Size = new Size(400, 22);
            Controls.Add(progress);

            status.Location = new Point(14, 80);
            status.Size = new Size(400, 22);
            Controls.Add(status);

            btnOk.Location = new Point(335, 140);
            btnOk.Size = new Size(85, 26);
            btnOk.Click += (s, e) => Close();
            Controls.Add(btnOk);

            Shown += (s, e) =>
            {
                var t = new Thread(Run); t.IsBackground = true; t.Start();
            };
        }

        void Run()
        {
            try
            {
                Step(10, "Looking up installation...");
                string installDir = null;
                using (var key = Registry.CurrentUser.OpenSubKey(Manifest.UninstallKey))
                    if (key != null) installDir = key.GetValue("InstallLocation") as string;
                if (string.IsNullOrEmpty(installDir)) installDir = Paths.DefaultInstallDir;

                Step(25, "Closing running apps...");
                KillIfRunning("KSYK-Maps-Admin");
                KillIfRunning("KSYK-Maps-Quick");

                Step(40, "Removing shortcuts...");
                RemoveShortcuts();

                Step(60, "Removing files...");
                if (Directory.Exists(installDir))
                {
                    // Defer self-deletion: we can't delete the running exe
                    // directly, so we drop a tiny batch that does it after.
                    var selfExe = Path.Combine(installDir, "Uninstall.exe");
                    var batch = Path.Combine(Path.GetTempPath(), "ksyk-uninstall-" + Guid.NewGuid().ToString("N").Substring(0, 8) + ".cmd");
                    File.WriteAllText(batch,
                        "@echo off\r\n" +
                        "timeout /t 1 /nobreak >nul\r\n" +
                        ":retry\r\n" +
                        "del /q \"" + selfExe + "\" 2>nul\r\n" +
                        "if exist \"" + selfExe + "\" (timeout /t 1 /nobreak >nul & goto retry)\r\n" +
                        "rmdir /s /q \"" + installDir + "\" 2>nul\r\n" +
                        "del \"%~f0\" 2>nul\r\n", Encoding.ASCII);

                    foreach (var f in Directory.GetFiles(installDir))
                    {
                        if (string.Equals(Path.GetFileName(f), "Uninstall.exe", StringComparison.OrdinalIgnoreCase)) continue;
                        try { File.Delete(f); } catch { }
                    }

                    // Schedule self-delete
                    var psi = new ProcessStartInfo("cmd.exe", "/c \"" + batch + "\"")
                    {
                        CreateNoWindow = true,
                        UseShellExecute = false,
                        WindowStyle = ProcessWindowStyle.Hidden,
                    };
                    Process.Start(psi);
                }

                Step(85, "Removing Add/Remove Programs entry...");
                try { Registry.CurrentUser.DeleteSubKeyTree(Manifest.UninstallKey, false); } catch { }

                Step(100, "Done.");
                BeginInvoke((Action)(() => { btnOk.Enabled = true; }));
                if (silent) BeginInvoke((Action)(() => Close()));
            }
            catch (Exception ex)
            {
                BeginInvoke((Action)(() =>
                {
                    status.Text = ex.Message;
                    status.ForeColor = Color.Maroon;
                    btnOk.Enabled = true;
                }));
            }
        }

        void Step(int pct, string text)
        {
            BeginInvoke((Action)(() => { progress.Value = pct; status.Text = text; }));
        }

        void KillIfRunning(string procName)
        {
            try
            {
                foreach (var p in Process.GetProcessesByName(procName))
                {
                    try { p.Kill(); p.WaitForExit(2000); } catch { }
                }
            }
            catch { }
        }

        void RemoveShortcuts()
        {
            // Start menu folder
            try
            {
                var smDir = Paths.StartMenuDir;
                if (Directory.Exists(smDir)) Directory.Delete(smDir, true);
            }
            catch { }
            // Desktop
            try
            {
                var lnk = Path.Combine(Paths.Desktop, "KSYK Maps.lnk");
                if (File.Exists(lnk)) File.Delete(lnk);
            }
            catch { }
        }
    }

    // ── Entry point ────────────────────────────────────────────────────

    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            Application.SetCompatibleTextRenderingDefault(false);

            bool uninstall = false;
            bool silent = false;
            string installDirOverride = null;
            foreach (var a in args)
            {
                if (string.Equals(a, "/uninstall", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(a, "-uninstall", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(a, "--uninstall", StringComparison.OrdinalIgnoreCase))
                    uninstall = true;
                if (string.Equals(a, "/silent", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(a, "/S", StringComparison.OrdinalIgnoreCase))
                    silent = true;
                if (a.StartsWith("/dir=", StringComparison.OrdinalIgnoreCase))
                    installDirOverride = a.Substring(5).Trim('"');
            }

            if (uninstall) { Application.Run(new UninstallForm(silent)); return; }

            if (silent)
            {
                // Headless install — used by IT for unattended deployment
                // and by the build's smoke test. No UI, no prompts.
                SilentInstall.Run(installDirOverride ?? Paths.DefaultInstallDir);
                return;
            }

            Application.Run(new WizardForm());
        }
    }
}
