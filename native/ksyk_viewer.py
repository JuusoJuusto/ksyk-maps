"""
KSYK Maps Quick — native Windows utility app for students.

Lightweight thick-client. Not an embedded browser. No website loaded.
Talks to https://ksykmaps.fi/api/... over HTTPS for room lookup, lunch
menu and announcements; everything else is rendered in pure Tkinter
with the same Win-9x styling as the admin tool.

Build to a single .exe with:
    pyinstaller --onefile --noconsole --name "KSYK Maps Quick" ksyk_viewer.py
"""

from __future__ import annotations

import json
import os
import re
import threading
import tkinter as tk
import webbrowser
from tkinter import font as tkfont
from tkinter import messagebox, ttk
from typing import Any, Callable

import urllib.error
import urllib.request
from xml.etree import ElementTree as ET

API_BASE = os.environ.get("KSYK_API_BASE", "https://ksykmaps.fi/api")
SITE = "https://ksykmaps.fi"
APP_NAME = "KSYK Maps Quick"
VERSION = "1.0.0"

# Win-9x palette (matches admin app)
TEAL_DESKTOP = "#008080"
SILVER = "#c0c0c0"
NAVY_TITLEBAR = "#000080"
SHADOW_DARK = "#808080"
TEXT = "#000000"
TEXT_INV = "#ffffff"
RED = "#800000"
GREEN = "#008000"
BLUE = "#0000aa"


class APIError(Exception):
    """API failure."""


def api_request(path: str, timeout: float = 12.0) -> Any:
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(url, headers={
        "Accept": "application/json,application/xml,*/*",
        "User-Agent": f"{APP_NAME}/{VERSION} (native)",
    })
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            ctype = resp.headers.get("Content-Type", "")
            raw = resp.read()
            if not raw:
                return None
            text = raw.decode("utf-8", errors="replace")
            if "json" in ctype:
                return json.loads(text)
            return text
    except urllib.error.HTTPError as err:
        raise APIError(f"HTTP {err.code}: {err.reason}") from err
    except urllib.error.URLError as err:
        raise APIError(f"Couldn't reach server: {err.reason}") from err
    except TimeoutError as err:
        raise APIError("Request timed out") from err


# ── Win-9x widgets ─────────────────────────────────────────────────────

def w9_frame(parent: tk.Misc, **kw) -> tk.Frame:
    return tk.Frame(parent, bg=SILVER, relief="raised", bd=2, **kw)


def w9_inset(parent: tk.Misc, **kw) -> tk.Frame:
    return tk.Frame(parent, bg=SILVER, relief="sunken", bd=2, **kw)


def w9_button(parent: tk.Misc, text: str, command: Callable[[], None] | None = None,
              width: int | None = None) -> tk.Button:
    btn = tk.Button(parent, text=text, command=command, bg=SILVER, fg=TEXT,
                    activebackground=SILVER, relief="raised", bd=2,
                    font=("MS Sans Serif", 9), padx=8, pady=2,
                    cursor="hand2", width=width)
    btn.bind("<ButtonPress-1>",   lambda e: btn.config(relief="sunken"))
    btn.bind("<ButtonRelease-1>", lambda e: btn.config(relief="raised"))
    return btn


def w9_label(parent: tk.Misc, text: str, **kw) -> tk.Label:
    return tk.Label(parent, text=text, bg=SILVER, fg=TEXT,
                    font=("MS Sans Serif", 9), **kw)


def w9_titlebar(parent: tk.Misc, text: str) -> tk.Frame:
    bar = tk.Frame(parent, bg=NAVY_TITLEBAR, height=20)
    tk.Label(bar, text=text, bg=NAVY_TITLEBAR, fg=TEXT_INV,
             font=("MS Sans Serif", 9, "bold"),
             anchor="w", padx=4).pack(fill="x", side="left", expand=True)
    return bar


def w9_entry(parent: tk.Misc, textvariable: tk.StringVar | None = None,
             width: int = 24) -> tk.Entry:
    return tk.Entry(parent, textvariable=textvariable, bg="white", fg=TEXT,
                    font=("MS Sans Serif", 9), relief="sunken", bd=2,
                    width=width, highlightthickness=0)


# ── Panels ─────────────────────────────────────────────────────────────

class RoomFinderPanel(tk.Frame):
    """Search rooms by number / name / type. Tap Enter to look up."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        self.rooms: list[dict] = []

        bar = tk.Frame(self, bg=SILVER, padx=6, pady=6)
        bar.pack(fill="x")
        w9_label(bar, "Find a room (e.g. 'A201' or 'chemistry'):").pack(side="left")
        self.query = tk.StringVar()
        entry = w9_entry(bar, self.query, width=28)
        entry.pack(side="left", padx=(6, 0))
        entry.bind("<KeyRelease>", lambda e: self.render())
        w9_button(bar, "Refresh", command=self.reload).pack(side="right")

        body = w9_inset(self)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        cols = ("number", "name", "floor", "type", "status")
        self.tree = ttk.Treeview(body, columns=cols, show="headings")
        for c, w in zip(cols, (80, 240, 60, 110, 110)):
            self.tree.heading(c, text=c.capitalize())
            self.tree.column(c, width=w, anchor="w")
        scroll = ttk.Scrollbar(body, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", self.open_in_map)

        foot = tk.Frame(self, bg=SILVER, padx=6, pady=4)
        foot.pack(fill="x")
        self.status = w9_label(foot, "Loading…", fg=BLUE)
        self.status.pack(side="left")
        w9_button(foot, "Open in browser", command=self.open_in_map).pack(side="right")

        self.reload()

    def reload(self) -> None:
        self.status.config(text="Loading…", fg=BLUE)

        def worker():
            try:
                data = api_request("/rooms") or []
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            self.rooms = data
            self.after(0, self.render)
            self.after(0, lambda: self.status.config(
                text=f"{len(self.rooms)} rooms loaded.", fg=SHADOW_DARK))

        threading.Thread(target=worker, daemon=True).start()

    def render(self) -> None:
        q = self.query.get().strip().lower()
        results = self.rooms
        if q:
            results = [r for r in results
                       if q in str(r.get("roomNumber", "")).lower()
                       or q in str(r.get("name", "")).lower()
                       or q in str(r.get("type", "")).lower()]
        results = sorted(results, key=lambda r: str(r.get("roomNumber", "")))
        self.tree.delete(*self.tree.get_children())
        for r in results[:200]:
            self.tree.insert("", "end", iid=r.get("id", ""), values=(
                r.get("roomNumber", "—"),
                r.get("name", "") or "—",
                r.get("floor", "—"),
                r.get("type", "—"),
                r.get("currentStatus", "—"),
            ))

    def open_in_map(self, *_evt) -> None:
        sel = self.tree.selection()
        if sel:
            webbrowser.open(f"{SITE}/?room={sel[0]}")
        else:
            webbrowser.open(SITE)


class LunchPanel(tk.Frame):
    """Pulls the school lunch RSS feed and shows the current-week menu."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, padx=6, pady=6)
        bar.pack(fill="x")
        w9_label(bar, "School lunch menu — this week").pack(side="left")
        w9_button(bar, "Refresh", command=self.reload).pack(side="right")

        self.text = tk.Text(self, bg="white", fg=TEXT,
                            font=("MS Sans Serif", 10),
                            relief="sunken", bd=2, wrap="word", padx=10, pady=8)
        self.text.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        self.text.tag_configure("day", font=("MS Sans Serif", 11, "bold"),
                                foreground=NAVY_TITLEBAR, spacing1=10, spacing3=4)
        self.text.tag_configure("dish", lmargin1=20, lmargin2=20)

        self.status = w9_label(self, "", fg=SHADOW_DARK)
        self.status.pack(fill="x", padx=8, pady=(0, 4))
        self.reload()

    def reload(self) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", "Loading…")
        self.status.config(text="", fg=SHADOW_DARK)

        def worker():
            try:
                raw = api_request("/lunch-menu")
            except APIError as e:
                self.after(0, lambda: self._write_error(str(e)))
                return
            try:
                items = self._parse_rss(raw or "")
            except Exception as e:
                self.after(0, lambda: self._write_error(f"Couldn't parse menu: {e}"))
                return
            self.after(0, lambda: self._render(items))

        threading.Thread(target=worker, daemon=True).start()

    def _parse_rss(self, text: str) -> list[tuple[str, str]]:
        items: list[tuple[str, str]] = []
        if not text.strip().startswith("<"):
            return items
        root = ET.fromstring(text)
        # RSS items: <channel><item><title>...</title><description>...</description>
        for item in root.iter("item"):
            title = (item.findtext("title") or "").strip()
            desc = (item.findtext("description") or "").strip()
            # strip simple HTML tags from desc
            desc = re.sub(r"<[^>]+>", "\n", desc).strip()
            if title:
                items.append((title, desc))
        return items

    def _render(self, items: list[tuple[str, str]]) -> None:
        self.text.delete("1.0", "end")
        if not items:
            self.text.insert("end", "No menu entries found.")
            return
        for title, desc in items:
            self.text.insert("end", title + "\n", "day")
            self.text.insert("end", (desc or "—") + "\n\n", "dish")
        self.status.config(text=f"{len(items)} day(s) loaded.", fg=GREEN)

    def _write_error(self, msg: str) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", f"Error: {msg}")
        self.status.config(text="Failed.", fg=RED)


class AnnouncementsPanel(tk.Frame):
    """Latest announcements from /api/announcements."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, padx=6, pady=6)
        bar.pack(fill="x")
        w9_label(bar, "Latest announcements").pack(side="left")
        w9_button(bar, "Refresh", command=self.reload).pack(side="right")

        body = w9_inset(self)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        self.text = tk.Text(body, bg="white", fg=TEXT,
                            font=("MS Sans Serif", 9),
                            wrap="word", padx=10, pady=8)
        self.text.pack(side="left", fill="both", expand=True)
        scroll = ttk.Scrollbar(body, orient="vertical", command=self.text.yview)
        self.text.configure(yscrollcommand=scroll.set)
        scroll.pack(side="right", fill="y")
        self.text.tag_configure("title", font=("MS Sans Serif", 11, "bold"),
                                foreground=NAVY_TITLEBAR, spacing1=8, spacing3=2)
        self.text.tag_configure("meta", font=("MS Sans Serif", 8),
                                foreground=SHADOW_DARK)
        self.text.tag_configure("body", lmargin1=4, lmargin2=4, spacing3=10)

        self.status = w9_label(self, "", fg=SHADOW_DARK)
        self.status.pack(fill="x", padx=8, pady=(0, 4))
        self.reload()

    def reload(self) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", "Loading…")

        def worker():
            try:
                data = api_request("/announcements?limit=20") or []
            except APIError as e:
                self.after(0, lambda: self._error(str(e)))
                return
            self.after(0, lambda: self._render(data))

        threading.Thread(target=worker, daemon=True).start()

    def _render(self, items: list[dict]) -> None:
        self.text.delete("1.0", "end")
        if not items:
            self.text.insert("end", "No announcements.")
            return
        for a in items:
            self.text.insert("end", a.get("title", "Untitled") + "\n", "title")
            meta = str(a.get("createdAt", ""))[:19].replace("T", " ")
            self.text.insert("end", meta + "\n", "meta")
            self.text.insert("end", (a.get("content") or a.get("body") or "—") + "\n\n", "body")
        self.status.config(text=f"{len(items)} announcement(s).", fg=GREEN)

    def _error(self, msg: str) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", f"Error: {msg}")
        self.status.config(text="Failed.", fg=RED)


# ── Main shell ─────────────────────────────────────────────────────────

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("760x580")
        self.minsize(640, 480)
        self.configure(bg=TEAL_DESKTOP)

        default_font = tkfont.nametofont("TkDefaultFont")
        default_font.configure(family="MS Sans Serif", size=9)

        style = ttk.Style(self)
        try:
            style.theme_use("classic")
        except tk.TclError:
            pass
        style.configure("Treeview",
                        background="white", fieldbackground="white",
                        font=("MS Sans Serif", 9))
        style.configure("Treeview.Heading",
                        font=("MS Sans Serif", 9, "bold"),
                        background=SILVER, relief="raised")
        style.configure("TNotebook", background=SILVER, borderwidth=0)
        style.configure("TNotebook.Tab", background=SILVER,
                        padding=[10, 4], font=("MS Sans Serif", 9))
        style.map("TNotebook.Tab", background=[("selected", "white")])

        outer = tk.Frame(self, bg=SILVER)
        outer.pack(fill="both", expand=True, padx=4, pady=4)

        w9_titlebar(outer, f"  {APP_NAME} v{VERSION}").pack(fill="x")

        menu = tk.Frame(outer, bg=SILVER)
        menu.pack(fill="x", padx=4, pady=2)
        w9_button(menu, "Open ksykmaps.fi", command=lambda: webbrowser.open(SITE)).pack(side="left", padx=(0, 2))
        w9_button(menu, "About", command=self.about, width=8).pack(side="left", padx=(0, 2))
        w9_button(menu, "Quit", command=self.destroy, width=8).pack(side="right")

        notebook = ttk.Notebook(outer)
        notebook.pack(fill="both", expand=True, padx=4, pady=(2, 4))
        notebook.add(RoomFinderPanel(notebook), text="Find a room")
        notebook.add(LunchPanel(notebook), text="Lunch")
        notebook.add(AnnouncementsPanel(notebook), text="Announcements")

        status_bar = tk.Frame(outer, bg=SILVER, relief="sunken", bd=1, height=20)
        status_bar.pack(fill="x", side="bottom")
        tk.Label(status_bar, text=f"Ready — connected to {SITE}",
                 bg=SILVER, fg=TEXT, font=("MS Sans Serif", 8),
                 anchor="w", padx=4).pack(fill="x", side="left")

    def about(self) -> None:
        messagebox.showinfo(
            "About",
            f"{APP_NAME}\nVersion {VERSION}\n\n"
            f"Native Win9x-style utility for KSYK students.\n"
            f"Find rooms, see today's lunch, read announcements.\n\n"
            f"Connects to: {API_BASE}\n\n"
            f"© 2026 Nordbyte Studio"
        )


if __name__ == "__main__":
    App().mainloop()
