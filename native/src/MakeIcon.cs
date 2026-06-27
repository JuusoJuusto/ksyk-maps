// Tiny PNG-to-multi-resolution-ICO converter.
//
// Used at build time to turn the KSYK Maps logo PNGs into a single
// icon.ico that csc.exe embeds via /win32icon:icon.ico. The result
// gives the .exes the right icon in Explorer, the task bar, the
// Start Menu, and File Properties.
//
// Build:
//   csc.exe /target:exe /out:MakeIcon.exe /reference:System.Drawing.dll MakeIcon.cs
//
// Run:
//   MakeIcon.exe <icon.ico> <16.png> <32.png> <48.png> <64.png> <128.png> <256.png>

using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

class MakeIcon
{
    static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("usage: MakeIcon.exe <out.ico> <png1> [png2 ...]");
            Environment.Exit(1);
        }

        var outPath = args[0];
        var pngPaths = new string[args.Length - 1];
        Array.Copy(args, 1, pngPaths, 0, pngPaths.Length);

        // Read each PNG, scale to a known icon size if needed, and pack
        // into the ICONDIR / ICONDIRENTRY layout Windows expects.
        var entries = new System.Collections.Generic.List<byte[]>();
        var sizes = new System.Collections.Generic.List<int>();

        foreach (var p in pngPaths)
        {
            using (var img = Image.FromFile(p))
            {
                int sz = Math.Max(img.Width, img.Height);
                int target = sz;
                // Pick the nearest "icon" size if the PNG is non-square / off.
                int[] preferred = new[] { 16, 24, 32, 48, 64, 128, 256 };
                int best = preferred[0];
                foreach (var s in preferred)
                    if (Math.Abs(s - sz) < Math.Abs(best - sz)) best = s;
                target = best;

                // Embed the original PNG bytes directly (Vista+ ICO format
                // allows PNG payloads for any size; older sizes <= 48 are
                // safer as BMP but PNG is widely supported).
                using (var ms = new MemoryStream())
                {
                    if (img.Width != target || img.Height != target)
                    {
                        using (var resized = new Bitmap(target, target))
                        {
                            using (var g = Graphics.FromImage(resized))
                            {
                                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.HighQuality;
                                g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
                                g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
                                g.DrawImage(img, 0, 0, target, target);
                            }
                            resized.Save(ms, ImageFormat.Png);
                        }
                    }
                    else
                    {
                        img.Save(ms, ImageFormat.Png);
                    }
                    entries.Add(ms.ToArray());
                    sizes.Add(target);
                }
            }
        }

        using (var fs = new FileStream(outPath, FileMode.Create, FileAccess.Write))
        using (var bw = new BinaryWriter(fs))
        {
            // ICONDIR
            bw.Write((ushort)0);             // reserved
            bw.Write((ushort)1);             // type = ICO
            bw.Write((ushort)entries.Count); // count

            // The first ICONDIRENTRY starts after the directory.
            int headerSize = 6;
            int entrySize  = 16;
            int offset = headerSize + (entries.Count * entrySize);

            for (int i = 0; i < entries.Count; i++)
            {
                byte w = (byte)(sizes[i] >= 256 ? 0 : sizes[i]);
                byte h = (byte)(sizes[i] >= 256 ? 0 : sizes[i]);
                bw.Write(w);
                bw.Write(h);
                bw.Write((byte)0);  // colour count
                bw.Write((byte)0);  // reserved
                bw.Write((ushort)1); // colour planes
                bw.Write((ushort)32); // bits per pixel
                bw.Write((uint)entries[i].Length);
                bw.Write((uint)offset);
                offset += entries[i].Length;
            }

            foreach (var blob in entries) bw.Write(blob);
        }

        Console.WriteLine("Wrote " + outPath + "  (" + entries.Count + " sizes, " + new FileInfo(outPath).Length + " bytes)");
    }
}
