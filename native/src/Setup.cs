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

    public class WizardForm : Form
    {
        readonly Panel content = new Panel { Dock = DockStyle.Fill };
        readonly Button btnBack = new Button { Text = "< Back", Size = new Size(85, 28) };
        readonly Button btnNext = new Button { Text = "Next >", Size = new Size(85, 28) };
        readonly Button btnCancel = new Button { Text = "Cancel", Size = new Size(85, 28) };
        readonly Label banner = new Label();
        readonly Panel sidebar = new Panel { BackColor = Color.FromArgb(0, 51, 102), Dock = DockStyle.Left, Width = 160 };

        int page = 0;
        string installDir = Paths.DefaultInstallDir;
        bool createDesktop = true;
        bool launchAfter = true;
        bool installing = false;
        bool installFailed = false;
        string installError = "";

        public WizardForm()
        {
            Text = Manifest.ProductName + " " + Manifest.Version + " Setup";
            Size = new Size(560, 420);
            MinimumSize = new Size(560, 420);
            MaximumSize = new Size(560, 420);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = SystemColors.Control;
            Font = new Font("MS Sans Serif", 9F);
            Icon = SystemIcons.Application;

            // Footer
            var foot = new Panel { Dock = DockStyle.Bottom, Height = 48, BackColor = SystemColors.Control };
            var rule = new Panel { Dock = DockStyle.Top, Height = 1, BackColor = SystemColors.ControlDark };
            foot.Controls.Add(rule);
            btnCancel.Location = new Point(450, 10);
            btnNext.Location   = new Point(360, 10);
            btnBack.Location   = new Point(270, 10);
            btnCancel.Click += (s, e) => CancelInstall();
            btnNext.Click += (s, e) => Next();
            btnBack.Click += (s, e) => Back();
            foot.Controls.Add(btnCancel);
            foot.Controls.Add(btnNext);
            foot.Controls.Add(btnBack);
            Controls.Add(foot);

            // Sidebar logo
            Controls.Add(sidebar);
            var sl = new Label
            {
                Text = "KSYK\nMaps",
                Font = new Font("MS Sans Serif", 22F, FontStyle.Bold),
                ForeColor = Color.White,
                BackColor = Color.Transparent,
                Location = new Point(18, 24),
                Size = new Size(140, 80),
            };
            sidebar.Controls.Add(sl);
            var sv = new Label
            {
                Text = "v" + Manifest.Version,
                ForeColor = Color.FromArgb(180, 200, 230),
                BackColor = Color.Transparent,
                Location = new Point(20, 100),
                AutoSize = true,
            };
            sidebar.Controls.Add(sv);
            var spub = new Label
            {
                Text = Manifest.Publisher,
                ForeColor = Color.FromArgb(180, 200, 230),
                BackColor = Color.Transparent,
                Location = new Point(20, 320),
                AutoSize = true,
                Font = new Font("MS Sans Serif", 8F),
            };
            sidebar.Controls.Add(spub);

            // Banner
            banner.Dock = DockStyle.Top;
            banner.Height = 38;
            banner.Font = new Font("MS Sans Serif", 11F, FontStyle.Bold);
            banner.TextAlign = ContentAlignment.MiddleLeft;
            banner.Padding = new Padding(20, 0, 0, 0);
            banner.BackColor = Color.White;
            content.Controls.Add(banner);

            // Content
            content.BackColor = SystemColors.Control;
            content.Padding = new Padding(20, 50, 20, 10);
            Controls.Add(content);
            content.BringToFront();

            ShowPage();
        }

        // ── Page rendering ───────────────────────────────────────────────

        void ShowPage()
        {
            content.SuspendLayout();
            // Remove everything except the banner.
            var toRemove = new List<Control>();
            foreach (Control c in content.Controls) if (c != banner) toRemove.Add(c);
            foreach (var c in toRemove) content.Controls.Remove(c);

            switch (page)
            {
                case 0: BuildWelcome(); break;
                case 1: BuildOptions(); break;
                case 2: BuildConfirm(); break;
                case 3: BuildInstall(); break;
                case 4: BuildDone(); break;
            }

            // Buttons
            btnBack.Enabled = page > 0 && page < 3;
            btnNext.Enabled = page < 4 && !installing;
            btnCancel.Enabled = page < 3;
            btnNext.Text = page == 2 ? "Install" : page == 4 ? "Finish" : "Next >";

            content.ResumeLayout();
        }

        void BuildWelcome()
        {
            banner.Text = "  Welcome";
            content.Controls.Add(new Label
            {
                Text = "This wizard will install " + Manifest.ProductName + " "
                       + Manifest.Version + " on your computer.",
                Location = new Point(20, 50),
                Size = new Size(360, 40),
                AutoSize = false,
                Font = new Font("MS Sans Serif", 9F),
            });
            content.Controls.Add(new Label
            {
                Text = "Two applications will be installed:\r\n\r\n"
                     + "   • KSYK Maps  — student utility (room finder, lunch, news)\r\n"
                     + "   • KSYK Maps Admin  — admin tool (rooms, tickets, analytics, WiFi)\r\n\r\n"
                     + "Both are native Windows apps. They talk directly to ksykmaps.fi "
                     + "over HTTPS — no web view, no Electron.",
                Location = new Point(20, 100),
                Size = new Size(360, 160),
                Font = new Font("MS Sans Serif", 9F),
            });
            content.Controls.Add(new Label
            {
                Text = "Click Next to continue, or Cancel to exit Setup.",
                Location = new Point(20, 280),
                AutoSize = true,
            });
        }

        TextBox txtDir;
        CheckBox cbDesktop;
        CheckBox cbLaunch;

        void BuildOptions()
        {
            banner.Text = "  Choose install location";

            content.Controls.Add(new Label
            {
                Text = "Setup will install " + Manifest.ProductName + " into the following folder. "
                     + "To install in a different folder, click Browse and select one.",
                Location = new Point(20, 50),
                Size = new Size(360, 40),
                AutoSize = false,
            });

            content.Controls.Add(new Label { Text = "Install location:", Location = new Point(20, 110), AutoSize = true });
            txtDir = new TextBox { Text = installDir, Location = new Point(20, 130), Size = new Size(280, 22) };
            content.Controls.Add(txtDir);
            var browse = new Button { Text = "Browse...", Location = new Point(305, 129), Size = new Size(75, 24) };
            browse.Click += (s, e) =>
            {
                using (var fb = new FolderBrowserDialog())
                {
                    fb.Description = "Choose install folder";
                    fb.SelectedPath = txtDir.Text;
                    if (fb.ShowDialog() == DialogResult.OK) txtDir.Text = fb.SelectedPath;
                }
            };
            content.Controls.Add(browse);

            cbDesktop = new CheckBox
            {
                Text = "Create a desktop shortcut",
                Checked = createDesktop,
                Location = new Point(20, 180),
                AutoSize = true,
            };
            content.Controls.Add(cbDesktop);

            cbLaunch = new CheckBox
            {
                Text = "Launch KSYK Maps when finished",
                Checked = launchAfter,
                Location = new Point(20, 205),
                AutoSize = true,
            };
            content.Controls.Add(cbLaunch);

            var space = GetFreeSpaceMb(installDir);
            content.Controls.Add(new Label
            {
                Text = "Required disk space:  about 1 MB" + (space > 0 ? "      Available: " + space + " MB" : ""),
                ForeColor = SystemColors.GrayText,
                Location = new Point(20, 250),
                AutoSize = true,
                Font = new Font("MS Sans Serif", 8F),
            });
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
            banner.Text = "  Ready to install";
            content.Controls.Add(new Label
            {
                Text = "Setup is ready to install " + Manifest.ProductName + ". Review the settings below and click Install to proceed.",
                Location = new Point(20, 50),
                Size = new Size(360, 40),
                AutoSize = false,
            });
            content.Controls.Add(new Label
            {
                Text = "Install location:",
                Font = new Font("MS Sans Serif", 9F, FontStyle.Bold),
                Location = new Point(20, 110),
                AutoSize = true,
            });
            content.Controls.Add(new Label
            {
                Text = installDir,
                Location = new Point(20, 128),
                Size = new Size(360, 18),
                AutoSize = false,
            });
            content.Controls.Add(new Label
            {
                Text = "Will create:",
                Font = new Font("MS Sans Serif", 9F, FontStyle.Bold),
                Location = new Point(20, 160),
                AutoSize = true,
            });
            var what = new StringBuilder();
            what.AppendLine("  • Start Menu folder: " + Manifest.ProductName);
            if (createDesktop) what.AppendLine("  • Desktop shortcut: KSYK Maps");
            what.AppendLine("  • Uninstall entry in Add/Remove Programs");
            content.Controls.Add(new Label
            {
                Text = what.ToString(),
                Location = new Point(20, 180),
                Size = new Size(360, 80),
                AutoSize = false,
            });
        }

        Label statusLine;
        ProgressBar progress;

        void BuildInstall()
        {
            banner.Text = "  Installing";
            installing = true; installFailed = false; installError = "";
            content.Controls.Add(new Label
            {
                Text = "Please wait while Setup installs " + Manifest.ProductName + " on your computer.",
                Location = new Point(20, 50),
                Size = new Size(360, 40),
                AutoSize = false,
            });
            progress = new ProgressBar { Location = new Point(20, 110), Size = new Size(360, 22), Style = ProgressBarStyle.Continuous };
            content.Controls.Add(progress);
            statusLine = new Label { Location = new Point(20, 140), Size = new Size(360, 22), AutoSize = false };
            content.Controls.Add(statusLine);

            var t = new Thread(() => RunInstall());
            t.IsBackground = true;
            t.Start();
        }

        void BuildDone()
        {
            banner.Text = installFailed ? "  Setup failed" : "  Setup complete";
            if (installFailed)
            {
                content.Controls.Add(new Label
                {
                    Text = "The installation could not complete.",
                    Font = new Font("MS Sans Serif", 10F, FontStyle.Bold),
                    Location = new Point(20, 50),
                    AutoSize = true,
                });
                content.Controls.Add(new Label
                {
                    Text = installError,
                    Location = new Point(20, 90),
                    Size = new Size(360, 200),
                    AutoSize = false,
                    ForeColor = Color.Maroon,
                });
            }
            else
            {
                content.Controls.Add(new Label
                {
                    Text = "Thank you for installing " + Manifest.ProductName + " " + Manifest.Version + ".",
                    Font = new Font("MS Sans Serif", 10F, FontStyle.Bold),
                    Location = new Point(20, 50),
                    AutoSize = true,
                });
                content.Controls.Add(new Label
                {
                    Text = "Click Finish to exit the wizard. You can launch the apps from "
                         + "the Start Menu" + (createDesktop ? " or the desktop shortcut." : "."),
                    Location = new Point(20, 90),
                    Size = new Size(360, 50),
                    AutoSize = false,
                });
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
                if (installDir.Length == 0) { MessageBox.Show("Install location is required.", "Setup"); return; }
            }
            if (page == 4)
            {
                if (!installFailed && launchAfter)
                {
                    try { Process.Start(Path.Combine(installDir, "KSYK-Maps-Quick.exe")); } catch { }
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
                Step(5, "Creating install folder...");
                if (!Directory.Exists(installDir)) Directory.CreateDirectory(installDir);

                Step(15, "Extracting application files...");
                int written = 0;
                foreach (var p in Manifest.Apps)
                {
                    ExtractResource(p.ResourceName, Path.Combine(installDir, p.ExeName));
                    written++;
                    Step(15 + (written * 25), "Installed " + p.ExeName);
                }

                Step(70, "Writing uninstaller...");
                var unPath = Path.Combine(installDir, "Uninstall.exe");
                // We re-use Setup.exe as the uninstaller; passing /uninstall flips
                // it into uninstall mode. Copying it keeps Add/Remove Programs
                // working after the user moves or deletes the original.
                File.Copy(Assembly.GetExecutingAssembly().Location, unPath, true);

                Step(80, "Creating shortcuts...");
                CreateAllShortcuts();

                Step(90, "Registering in Add/Remove Programs...");
                RegisterUninstall(unPath);

                Step(100, "Done.");
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

        void Step(int pct, string text)
        {
            BeginInvoke((Action)(() =>
            {
                if (progress != null) progress.Value = Math.Min(100, pct);
                if (statusLine != null) statusLine.Text = text;
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
            var smDir = Paths.StartMenuDir;
            if (!Directory.Exists(smDir)) Directory.CreateDirectory(smDir);

            foreach (var p in Manifest.Apps)
            {
                var target = Path.Combine(installDir, p.ExeName);
                Shortcuts.Create(Path.Combine(smDir, p.ShortcutName + ".lnk"),
                                  target, p.ShortcutName, target);
            }
            // Uninstall shortcut in Start Menu
            Shortcuts.Create(Path.Combine(smDir, "Uninstall " + Manifest.ProductName + ".lnk"),
                              Path.Combine(installDir, "Uninstall.exe"),
                              "Uninstall " + Manifest.ProductName,
                              Path.Combine(installDir, "Uninstall.exe"));

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
