"""
KSYK Maps Admin — native Windows admin tool.

A thick-client desktop app for school admins. NOT an embedded browser:
this is pure Tkinter with native Win32 widgets, styled to match the
retro Win-9x look the old browser "Toolbench" page had. Every panel
talks to https://ksykmaps.fi/api/... directly using HTTPS — no Vercel
preview, no Electron, no web view.

Panels:
  • Login        — POST /api/auth/admin-login, stores returned user
  • Rooms        — list / search / edit (number, name, floor, type, w, h)
  • Buildings    — list / edit
  • Tickets      — list incoming support tickets
  • Analytics    — summary numbers from /api/analytics/summary
  • WiFi Scan    — native `netsh wlan show networks` for beacon survey
  • System       — quick env / health probe

Build to a single .exe with:
    pyinstaller --onefile --noconsole --name "KSYK Maps Admin" ksyk_admin.py
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import threading
import tkinter as tk
from tkinter import font as tkfont
from tkinter import messagebox, simpledialog, ttk
from typing import Any, Callable

import urllib.error
import urllib.request

# ── Config ──────────────────────────────────────────────────────────────
API_BASE = os.environ.get("KSYK_API_BASE", "https://ksykmaps.fi/api")
APP_NAME = "KSYK Maps Admin"
VERSION = "1.0.0"

# Win-9x palette
TEAL_DESKTOP = "#008080"
SILVER = "#c0c0c0"
NAVY_TITLEBAR = "#000080"
SHADOW_DARK = "#808080"
SHADOW_DARKER = "#000000"
HIGHLIGHT_LIGHT = "#ffffff"
TEXT = "#000000"
TEXT_INV = "#ffffff"
RED = "#800000"
GREEN = "#008000"
BLUE = "#0000aa"


# ── HTTP helper ─────────────────────────────────────────────────────────

class APIError(Exception):
    """Raised when an API call returns non-2xx or fails to reach the server."""


def api_request(path: str, method: str = "GET", body: dict | None = None,
                timeout: float = 12.0) -> Any:
    """Plain stdlib HTTPS call. Mirrors the React-Query fetches the web
    admin uses, including the JSON body and standard headers. Returns the
    parsed JSON; raises APIError on any failure so callers don't have to
    juggle status codes."""
    url = f"{API_BASE}{path}"
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "Accept": "application/json",
        "User-Agent": f"{APP_NAME}/{VERSION} (native)",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if not raw:
                return None
            try:
                return json.loads(raw.decode("utf-8"))
            except json.JSONDecodeError:
                return raw.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as err:
        body_text = ""
        try:
            body_text = err.read().decode("utf-8", errors="replace")
        except Exception:
            pass
        raise APIError(f"HTTP {err.code}: {body_text or err.reason}") from err
    except urllib.error.URLError as err:
        raise APIError(f"Couldn't reach server: {err.reason}") from err
    except TimeoutError as err:
        raise APIError("Request timed out") from err


# ── Win-9x styled widgets ──────────────────────────────────────────────

def w9_frame(parent: tk.Misc, **kw) -> tk.Frame:
    """Sunken 'group box' panel — the standard chunky Win9x container."""
    return tk.Frame(parent, bg=SILVER, relief="raised", bd=2, **kw)


def w9_inset(parent: tk.Misc, **kw) -> tk.Frame:
    """Inset (sunken) frame for inputs / lists."""
    return tk.Frame(parent, bg=SILVER, relief="sunken", bd=2, **kw)


def w9_button(parent: tk.Misc, text: str, command: Callable[[], None] | None = None,
              width: int | None = None) -> tk.Button:
    btn = tk.Button(
        parent, text=text, command=command, bg=SILVER, fg=TEXT,
        activebackground=SILVER, activeforeground=TEXT,
        relief="raised", bd=2, font=("MS Sans Serif", 9),
        padx=8, pady=2, cursor="hand2", width=width,
    )
    # Pressed effect
    btn.bind("<ButtonPress-1>", lambda e: btn.config(relief="sunken"))
    btn.bind("<ButtonRelease-1>", lambda e: btn.config(relief="raised"))
    return btn


def w9_label(parent: tk.Misc, text: str, **kw) -> tk.Label:
    return tk.Label(parent, text=text, bg=SILVER, fg=TEXT,
                    font=("MS Sans Serif", 9), **kw)


def w9_titlebar(parent: tk.Misc, text: str) -> tk.Frame:
    """Classic navy title bar with bright white text."""
    bar = tk.Frame(parent, bg=NAVY_TITLEBAR, height=20)
    tk.Label(bar, text=text, bg=NAVY_TITLEBAR, fg=TEXT_INV,
             font=("MS Sans Serif", 9, "bold"),
             anchor="w", padx=4).pack(fill="x", side="left", expand=True)
    return bar


def w9_entry(parent: tk.Misc, textvariable: tk.StringVar | None = None,
             show: str | None = None, width: int = 24) -> tk.Entry:
    return tk.Entry(parent, textvariable=textvariable, show=show,
                    bg="white", fg=TEXT, font=("MS Sans Serif", 9),
                    relief="sunken", bd=2, width=width,
                    highlightthickness=0, insertbackground=TEXT)


# ── App state ───────────────────────────────────────────────────────────

class AppState:
    """Holds the authenticated user across panels."""
    user: dict | None = None
    cached_rooms: list[dict] = []
    cached_buildings: list[dict] = []


# ── Panels ──────────────────────────────────────────────────────────────

class LoginPanel(tk.Frame):
    """Sign-in window — POSTs to /api/auth/admin-login."""

    def __init__(self, parent: tk.Misc, on_success: Callable[[dict], None]):
        super().__init__(parent, bg=TEAL_DESKTOP)
        self.on_success = on_success

        outer = w9_frame(self)
        outer.place(relx=0.5, rely=0.5, anchor="center")

        # Title bar
        bar = w9_titlebar(outer, "🔒 Sign in to KSYK Maps Admin")
        bar.pack(fill="x")

        body = tk.Frame(outer, bg=SILVER, padx=20, pady=18)
        body.pack()

        w9_label(body, "Email").grid(row=0, column=0, sticky="w", pady=(0, 2))
        self.email_var = tk.StringVar()
        w9_entry(body, self.email_var, width=32).grid(row=1, column=0, columnspan=2, pady=(0, 10), sticky="we")

        w9_label(body, "Password").grid(row=2, column=0, sticky="w", pady=(0, 2))
        self.password_var = tk.StringVar()
        pw_entry = w9_entry(body, self.password_var, show="*", width=32)
        pw_entry.grid(row=3, column=0, columnspan=2, pady=(0, 14), sticky="we")
        pw_entry.bind("<Return>", lambda e: self.attempt())

        self.status = w9_label(body, "", fg=RED)
        self.status.grid(row=4, column=0, columnspan=2, sticky="w", pady=(0, 8))

        btn_row = tk.Frame(body, bg=SILVER)
        btn_row.grid(row=5, column=0, columnspan=2, sticky="e")
        w9_button(btn_row, "Cancel", command=lambda: parent.master.destroy(), width=8).pack(side="right", padx=(6, 0))
        w9_button(btn_row, "Sign in", command=self.attempt, width=8).pack(side="right")

        # Footer
        foot = tk.Frame(outer, bg=SILVER)
        foot.pack(fill="x")
        w9_label(foot, f"  v{VERSION} · {API_BASE}",
                 font=("MS Sans Serif", 8), fg=SHADOW_DARK).pack(side="left", pady=(0, 4))

    def attempt(self) -> None:
        email = self.email_var.get().strip()
        password = self.password_var.get()
        if not email or not password:
            self.status.config(text="Email and password required.")
            return
        self.status.config(text="Signing in…", fg=BLUE)
        self.update_idletasks()

        def worker():
            try:
                result = api_request("/auth/admin-login", method="POST",
                                     body={"email": email, "password": password})
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            if result and result.get("success"):
                self.after(0, lambda: self.on_success(result.get("user") or {"email": email}))
            else:
                msg = (result or {}).get("message", "Invalid credentials.")
                self.after(0, lambda: self.status.config(text=msg, fg=RED))

        threading.Thread(target=worker, daemon=True).start()


class RoomsPanel(tk.Frame):
    """Read / edit room records via /api/rooms."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        self.rooms: list[dict] = []
        self.filtered: list[dict] = []
        self.selected_id: str | None = None

        # Toolbar
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Search:").pack(side="left", padx=(0, 4))
        self.query = tk.StringVar()
        self.query.trace_add("write", lambda *_: self.apply_filter())
        w9_entry(bar, self.query, width=24).pack(side="left")
        w9_button(bar, "Reload", command=self.reload).pack(side="right", padx=(4, 0))
        self.status = w9_label(bar, "", fg=SHADOW_DARK)
        self.status.pack(side="right", padx=(8, 8))

        # Body — list left, form right
        body = tk.Frame(self, bg=SILVER)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))

        left = w9_inset(body)
        left.pack(side="left", fill="both", expand=True, padx=(0, 6))

        cols = ("number", "name", "floor", "type", "x", "y", "w", "h")
        self.tree = ttk.Treeview(left, columns=cols, show="headings", selectmode="browse")
        for col, w in zip(cols, (60, 200, 50, 90, 60, 60, 50, 50)):
            self.tree.heading(col, text=col.capitalize())
            self.tree.column(col, width=w, anchor="w")
        scroll = ttk.Scrollbar(left, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        self.tree.bind("<<TreeviewSelect>>", self.on_pick)

        # Editor panel
        editor = w9_frame(body, width=260)
        editor.pack(side="right", fill="y")
        editor.pack_propagate(False)

        w9_titlebar(editor, "Edit room").pack(fill="x")
        form = tk.Frame(editor, bg=SILVER, padx=10, pady=10)
        form.pack(fill="both", expand=True)

        self.vars = {
            "roomNumber": tk.StringVar(),
            "name": tk.StringVar(),
            "floor": tk.StringVar(),
            "type": tk.StringVar(),
            "mapPositionX": tk.StringVar(),
            "mapPositionY": tk.StringVar(),
            "width": tk.StringVar(),
            "height": tk.StringVar(),
        }
        labels = [
            ("Room number", "roomNumber"),
            ("Display name", "name"),
            ("Floor", "floor"),
            ("Type", "type"),
            ("X", "mapPositionX"),
            ("Y", "mapPositionY"),
            ("Width", "width"),
            ("Height", "height"),
        ]
        for i, (lbl, key) in enumerate(labels):
            w9_label(form, lbl).grid(row=i, column=0, sticky="w", pady=2)
            w9_entry(form, self.vars[key], width=22).grid(row=i, column=1, sticky="we", pady=2, padx=(6, 0))
        form.grid_columnconfigure(1, weight=1)

        btn_row = tk.Frame(form, bg=SILVER, pady=10)
        btn_row.grid(row=len(labels), column=0, columnspan=2, sticky="we")
        w9_button(btn_row, "Save", command=self.save).pack(side="right", padx=(6, 0))
        w9_button(btn_row, "Delete", command=self.delete).pack(side="right", padx=(6, 0))
        w9_button(btn_row, "New", command=self.new_room).pack(side="right")

        self.reload()

    def reload(self) -> None:
        self.status.config(text="Loading…", fg=BLUE)
        self.update_idletasks()

        def worker():
            try:
                data = api_request("/rooms")
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            self.rooms = data or []
            AppState.cached_rooms = self.rooms
            self.after(0, self.apply_filter)
            self.after(0, lambda: self.status.config(
                text=f"{len(self.rooms)} rooms", fg=SHADOW_DARK))

        threading.Thread(target=worker, daemon=True).start()

    def apply_filter(self) -> None:
        q = self.query.get().strip().lower()
        if q:
            self.filtered = [r for r in self.rooms
                             if q in str(r.get("roomNumber", "")).lower()
                             or q in str(r.get("name", "")).lower()
                             or q in str(r.get("type", "")).lower()]
        else:
            self.filtered = list(self.rooms)
        self.filtered.sort(key=lambda r: str(r.get("roomNumber", "")))
        self.tree.delete(*self.tree.get_children())
        for r in self.filtered:
            self.tree.insert("", "end", iid=r.get("id", ""), values=(
                r.get("roomNumber", ""), r.get("name", ""), r.get("floor", ""),
                r.get("type", ""),
                r.get("mapPositionX", ""), r.get("mapPositionY", ""),
                r.get("width", ""), r.get("height", ""),
            ))

    def on_pick(self, _evt) -> None:
        sel = self.tree.selection()
        if not sel:
            return
        rid = sel[0]
        self.selected_id = rid
        room = next((r for r in self.rooms if r.get("id") == rid), {})
        for key, var in self.vars.items():
            v = room.get(key, "")
            var.set("" if v is None else str(v))

    def save(self) -> None:
        if not self.selected_id:
            return
        patch: dict[str, Any] = {}
        for key, var in self.vars.items():
            raw = var.get().strip()
            if key in ("floor", "mapPositionX", "mapPositionY", "width", "height"):
                if raw == "":
                    continue
                try:
                    patch[key] = int(raw)
                except ValueError:
                    messagebox.showerror("Validation", f"{key} must be a number.")
                    return
            else:
                patch[key] = raw
        self.status.config(text="Saving…", fg=BLUE)

        def worker():
            try:
                api_request(f"/rooms/{self.selected_id}", method="PUT", body=patch)
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            self.after(0, lambda: self.status.config(text="Saved.", fg=GREEN))
            self.after(0, self.reload)

        threading.Thread(target=worker, daemon=True).start()

    def delete(self) -> None:
        if not self.selected_id:
            return
        if not messagebox.askyesno("Confirm", "Delete this room? Can't be undone."):
            return
        self.status.config(text="Deleting…", fg=BLUE)

        def worker():
            try:
                api_request(f"/rooms/{self.selected_id}", method="DELETE")
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            self.after(0, lambda: self.status.config(text="Deleted.", fg=GREEN))
            self.after(0, lambda: setattr(self, "selected_id", None))
            self.after(0, self.reload)

        threading.Thread(target=worker, daemon=True).start()

    def new_room(self) -> None:
        number = simpledialog.askstring("New room", "Room number:", parent=self)
        if not number:
            return
        try:
            floor = int(simpledialog.askstring("New room", "Floor:", parent=self) or "1")
        except (TypeError, ValueError):
            floor = 1
        body = {"roomNumber": number, "floor": floor, "type": "classroom",
                "name": "", "currentStatus": "unknown",
                "width": 56, "height": 40, "mapPositionX": 100, "mapPositionY": 100}
        self.status.config(text="Creating…", fg=BLUE)

        def worker():
            try:
                api_request("/rooms", method="POST", body=body)
            except APIError as e:
                self.after(0, lambda: self.status.config(text=str(e), fg=RED))
                return
            self.after(0, lambda: self.status.config(text="Created.", fg=GREEN))
            self.after(0, self.reload)

        threading.Thread(target=worker, daemon=True).start()


class BuildingsPanel(tk.Frame):
    """List campus buildings."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Campus buildings — read-only").pack(side="left")
        w9_button(bar, "Reload", command=self.reload).pack(side="right")

        body = w9_inset(self)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        cols = ("name", "type", "rooms")
        self.tree = ttk.Treeview(body, columns=cols, show="headings")
        for c, w in zip(cols, (180, 180, 80)):
            self.tree.heading(c, text=c.capitalize())
            self.tree.column(c, width=w, anchor="w")
        scroll = ttk.Scrollbar(body, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        self.reload()

    def reload(self) -> None:
        def worker():
            try:
                buildings = api_request("/buildings") or []
                rooms = AppState.cached_rooms or api_request("/rooms") or []
            except APIError as e:
                self.after(0, lambda: messagebox.showerror("API error", str(e)))
                return
            AppState.cached_buildings = buildings
            counts: dict[str, int] = {}
            for r in rooms:
                bid = r.get("buildingId")
                if bid:
                    counts[bid] = counts.get(bid, 0) + 1
            self.after(0, lambda: self._render(buildings, counts))

        threading.Thread(target=worker, daemon=True).start()

    def _render(self, buildings: list[dict], counts: dict[str, int]) -> None:
        self.tree.delete(*self.tree.get_children())
        for b in buildings:
            self.tree.insert("", "end", values=(
                b.get("name", "—"),
                b.get("type", "—"),
                counts.get(b.get("id", ""), 0),
            ))


class TicketsPanel(tk.Frame):
    """Show open support tickets."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Support tickets").pack(side="left")
        w9_button(bar, "Reload", command=self.reload).pack(side="right")

        body = w9_inset(self)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        cols = ("id", "type", "status", "title", "email", "created")
        self.tree = ttk.Treeview(body, columns=cols, show="headings")
        for c, w in zip(cols, (160, 70, 90, 280, 200, 140)):
            self.tree.heading(c, text=c.capitalize())
            self.tree.column(c, width=w, anchor="w")
        scroll = ttk.Scrollbar(body, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", self.on_open)
        self.tickets: list[dict] = []
        self.reload()

    def reload(self) -> None:
        def worker():
            try:
                data = api_request("/tickets") or []
            except APIError as e:
                self.after(0, lambda: messagebox.showerror("API error", str(e)))
                return
            self.tickets = data
            self.after(0, self._render)

        threading.Thread(target=worker, daemon=True).start()

    def _render(self) -> None:
        self.tree.delete(*self.tree.get_children())
        for t in self.tickets:
            self.tree.insert("", "end", iid=t.get("id", ""), values=(
                t.get("ticketId", "—"),
                str(t.get("type", "—")).upper(),
                str(t.get("status", "—")).upper(),
                t.get("title", "—"),
                t.get("email", "—"),
                str(t.get("createdAt", ""))[:19].replace("T", " "),
            ))

    def on_open(self, _evt) -> None:
        sel = self.tree.selection()
        if not sel:
            return
        t = next((x for x in self.tickets if x.get("id") == sel[0]), {})
        msg = (
            f"Ticket: {t.get('ticketId', '—')}\n"
            f"Type:   {t.get('type', '—')}\n"
            f"Status: {t.get('status', '—')}\n"
            f"From:   {t.get('name', 'Anonymous')} <{t.get('email', '—')}>\n"
            f"Title:  {t.get('title', '—')}\n\n"
            f"{t.get('description', '(no description)')}"
        )
        messagebox.showinfo(f"Ticket {t.get('ticketId', '')}", msg)


class AnalyticsPanel(tk.Frame):
    """Compact summary stat cards from /api/analytics/summary."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Range:").pack(side="left", padx=(0, 4))
        self.range_var = tk.StringVar(value="24h")
        for r in ("24h", "7d", "30d"):
            tk.Radiobutton(bar, text=r, variable=self.range_var, value=r,
                           bg=SILVER, font=("MS Sans Serif", 9),
                           command=self.reload).pack(side="left")
        w9_button(bar, "Reload", command=self.reload).pack(side="right")

        self.body = tk.Frame(self, bg=SILVER, padx=6, pady=6)
        self.body.pack(fill="both", expand=True)
        self.reload()

    def reload(self) -> None:
        def worker():
            try:
                data = api_request(f"/analytics/summary?range={self.range_var.get()}") or {}
                ext = api_request(f"/analytics/external?range={self.range_var.get()}") or {}
            except APIError as e:
                self.after(0, lambda: messagebox.showerror("API error", str(e)))
                return
            self.after(0, lambda: self._render(data, ext))

        threading.Thread(target=worker, daemon=True).start()

    def _render(self, summary: dict, external: dict) -> None:
        for child in self.body.winfo_children():
            child.destroy()

        cards = [
            ("Total visitors",
             summary.get("totalVisitors") or summary.get("visitors24h") or
             summary.get("uniqueVisitors") or 0),
            ("Page views", summary.get("pageviews") or summary.get("pageviews24h") or 0),
            ("Sessions", summary.get("sessions") or 0),
            ("Avg duration (s)", summary.get("avgSessionDuration") or 0),
        ]
        for i, (label, value) in enumerate(cards):
            card = w9_frame(self.body)
            card.grid(row=0, column=i, padx=4, pady=4, sticky="we")
            w9_titlebar(card, label).pack(fill="x")
            inner = tk.Frame(card, bg=SILVER, padx=12, pady=10)
            inner.pack(fill="both", expand=True)
            tk.Label(inner, text=str(value), bg=SILVER, fg=NAVY_TITLEBAR,
                     font=("MS Sans Serif", 16, "bold")).pack()
        for i in range(len(cards)):
            self.body.grid_columnconfigure(i, weight=1)

        # External providers
        cf = external.get("cloudflare") or {}
        fs = external.get("firestore") or {}
        ext_frame = w9_frame(self.body)
        ext_frame.grid(row=1, column=0, columnspan=len(cards), padx=4, pady=(8, 4), sticky="we")
        w9_titlebar(ext_frame, "External providers").pack(fill="x")
        ext_inner = tk.Frame(ext_frame, bg=SILVER, padx=10, pady=8)
        ext_inner.pack(fill="x")

        def line(label, snap):
            if not snap or not snap.get("configured"):
                txt = f"{label}: not configured"
                color = SHADOW_DARK
            elif snap.get("error"):
                txt = f"{label}: error — {snap['error']}"
                color = RED
            else:
                v = snap.get("visitors24h") or snap.get("visitors7d") or 0
                p = snap.get("pageviews24h") or snap.get("pageviews7d") or 0
                txt = f"{label}: {v} visitors · {p} pageviews"
                color = GREEN
            tk.Label(ext_inner, text=txt, bg=SILVER, fg=color,
                     font=("MS Sans Serif", 9), anchor="w").pack(fill="x", anchor="w")

        line("Cloudflare", cf)
        line("Firestore (own)", fs)


class WifiPanel(tk.Frame):
    """Run `netsh wlan show networks mode=bssid` and parse it. Used by
    admins doing the beacon survey — same parser logic as the Electron
    app, just bundled into the native tool."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Scan nearby WiFi access points (for beacon fingerprinting).").pack(side="left")
        w9_button(bar, "Scan", command=self.scan).pack(side="right")
        w9_button(bar, "Copy", command=self.copy).pack(side="right", padx=(0, 6))

        body = w9_inset(self)
        body.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        cols = ("ssid", "bssid", "rssi", "signal")
        self.tree = ttk.Treeview(body, columns=cols, show="headings")
        for c, w in zip(cols, (200, 160, 80, 80)):
            self.tree.heading(c, text=c.upper())
            self.tree.column(c, width=w, anchor="w")
        scroll = ttk.Scrollbar(body, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scroll.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        self.status = w9_label(self, "Idle.", fg=SHADOW_DARK)
        self.status.pack(fill="x", padx=8, pady=(0, 4))

        self.networks: list[dict] = []

    def scan(self) -> None:
        self.status.config(text="Scanning…", fg=BLUE)
        self.update_idletasks()

        def worker():
            try:
                out = subprocess.run(
                    ["netsh", "wlan", "show", "networks", "mode=bssid"],
                    capture_output=True, text=True, timeout=15, check=False,
                )
            except FileNotFoundError:
                self.after(0, lambda: self.status.config(
                    text="netsh not available on this OS.", fg=RED))
                return
            except subprocess.TimeoutExpired:
                self.after(0, lambda: self.status.config(text="Scan timed out.", fg=RED))
                return
            self.networks = self._parse(out.stdout or "")
            self.after(0, self._render)

        threading.Thread(target=worker, daemon=True).start()

    def _parse(self, output: str) -> list[dict]:
        networks: list[dict] = []
        current_ssid = ""
        current_bssid = ""
        current_signal = 0

        def flush():
            nonlocal current_bssid, current_signal
            if current_bssid:
                rssi = round(-100 + current_signal * 0.5)
                networks.append({
                    "ssid": current_ssid,
                    "bssid": current_bssid,
                    "rssi": rssi,
                    "signal": current_signal,
                })
            current_bssid = ""
            current_signal = 0

        ssid_re = re.compile(r"^SSID\s+\d+\s*:\s*(.*)$")
        bssid_re = re.compile(r"^BSSID\s+\d+\s*:\s*([0-9a-f:]+)$", re.IGNORECASE)
        sig_re = re.compile(r"^Signal\s*:\s*(\d+)%")

        for raw in output.splitlines():
            line = raw.strip()
            m = ssid_re.match(line)
            if m:
                flush()
                current_ssid = m.group(1).strip()
                continue
            m = bssid_re.match(line)
            if m:
                flush()
                current_bssid = m.group(1).lower()
                continue
            m = sig_re.match(line)
            if m and current_bssid:
                current_signal = int(m.group(1))
        flush()
        networks.sort(key=lambda n: -n["signal"])
        return networks

    def _render(self) -> None:
        self.tree.delete(*self.tree.get_children())
        for n in self.networks:
            self.tree.insert("", "end", values=(
                n["ssid"] or "(hidden)", n["bssid"], f"{n['rssi']} dBm", f"{n['signal']}%",
            ))
        self.status.config(
            text=f"Found {len(self.networks)} BSSID(s). "
                 f"Paste into BeaconSurveyor at ksykmaps.fi/admin/beacons.", fg=GREEN)

    def copy(self) -> None:
        if not self.networks:
            return
        # Format matches BeaconSurveyor's paste parser: "<bssid> <rssi> <ssid>"
        lines = [f"{n['bssid']} {n['rssi']} {n['ssid']}".strip() for n in self.networks]
        self.clipboard_clear()
        self.clipboard_append("\n".join(lines))
        self.status.config(text=f"Copied {len(lines)} line(s) to clipboard.", fg=GREEN)


class SystemPanel(tk.Frame):
    """Quick health probe + env summary from the API."""

    def __init__(self, parent: tk.Misc):
        super().__init__(parent, bg=SILVER)
        bar = tk.Frame(self, bg=SILVER, pady=6, padx=6)
        bar.pack(fill="x")
        w9_label(bar, "Server health & environment").pack(side="left")
        w9_button(bar, "Reload", command=self.reload).pack(side="right")

        self.text = tk.Text(self, bg="white", fg=TEXT, font=("Consolas", 9),
                            relief="sunken", bd=2, height=20)
        self.text.pack(fill="both", expand=True, padx=6, pady=(0, 6))
        self.reload()

    def reload(self) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", f"API base: {API_BASE}\n\nProbing…\n")
        self.update_idletasks()

        def worker():
            lines = [f"API base: {API_BASE}\n"]
            try:
                root = api_request("")
                lines.append("Root: " + json.dumps(root, indent=2))
            except APIError as e:
                lines.append(f"Root: ERROR — {e}")
            try:
                diag = api_request("/email-diagnostic")
                lines.append("\nEmail: " + json.dumps(diag, indent=2))
            except APIError as e:
                lines.append(f"\nEmail: ERROR — {e}")
            try:
                cl = api_request("/client-info")
                lines.append("\nClient info: " + json.dumps(cl, indent=2))
            except APIError as e:
                lines.append(f"\nClient info: ERROR — {e}")
            self.after(0, lambda: self._write("\n".join(lines)))

        threading.Thread(target=worker, daemon=True).start()

    def _write(self, text: str) -> None:
        self.text.delete("1.0", "end")
        self.text.insert("end", text)


# ── Main shell ──────────────────────────────────────────────────────────

class MainShell(tk.Frame):
    """Tabbed dashboard shown after sign-in."""

    def __init__(self, parent: tk.Misc, user: dict):
        super().__init__(parent, bg=SILVER)
        AppState.user = user

        # Status / title bar
        top = w9_titlebar(self, f"  KSYK Maps Admin — signed in as {user.get('email', '—')}")
        top.pack(fill="x")

        # Menu strip
        menu = tk.Frame(self, bg=SILVER)
        menu.pack(fill="x", padx=4, pady=2)
        for label, action in [
            ("File", lambda: messagebox.showinfo("File", "Use the tabs to navigate.")),
            ("Refresh", lambda: messagebox.showinfo("Refresh", "Use the Reload button in each tab.")),
            ("About", lambda: messagebox.showinfo(
                "About",
                f"{APP_NAME}\nVersion {VERSION}\n\n"
                f"Native Win9x-style admin client for KSYK Maps.\n"
                f"Connects to: {API_BASE}\n\n"
                f"© 2026 Nordbyte Studio"
            )),
            ("Sign out", lambda: self.master.signout()),
        ]:
            w9_button(menu, label, command=action, width=8).pack(side="left", padx=(0, 2))

        # Notebook of panels
        style = ttk.Style()
        # Native default theme — keeps the chunky look on Windows.
        try:
            style.theme_use("classic")
        except tk.TclError:
            pass

        notebook = ttk.Notebook(self)
        notebook.pack(fill="both", expand=True, padx=4, pady=(2, 4))

        notebook.add(RoomsPanel(notebook), text="Rooms")
        notebook.add(BuildingsPanel(notebook), text="Buildings")
        notebook.add(TicketsPanel(notebook), text="Tickets")
        notebook.add(AnalyticsPanel(notebook), text="Analytics")
        notebook.add(WifiPanel(notebook), text="WiFi Scan")
        notebook.add(SystemPanel(notebook), text="System")

        # Status bar at the bottom
        status_bar = tk.Frame(self, bg=SILVER, relief="sunken", bd=1, height=20)
        status_bar.pack(fill="x", side="bottom")
        tk.Label(status_bar, text=f"Ready — connected to {API_BASE}",
                 bg=SILVER, fg=SHADOW_DARKER, font=("MS Sans Serif", 8),
                 anchor="w", padx=4).pack(fill="x", side="left")


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("1100x700")
        self.minsize(900, 600)
        self.configure(bg=TEAL_DESKTOP)

        # Default font
        default_font = tkfont.nametofont("TkDefaultFont")
        default_font.configure(family="MS Sans Serif", size=9)

        # ttk styling for classic look
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
        style.map("TNotebook.Tab",
                  background=[("selected", "white")])

        self.current: tk.Frame | None = None
        self.show_login()

    def show_login(self) -> None:
        if self.current is not None:
            self.current.destroy()
        self.current = LoginPanel(self, self.show_shell)
        self.current.pack(fill="both", expand=True)

    def show_shell(self, user: dict) -> None:
        if self.current is not None:
            self.current.destroy()
        self.current = MainShell(self, user)
        self.current.pack(fill="both", expand=True)

    def signout(self) -> None:
        AppState.user = None
        self.show_login()


if __name__ == "__main__":
    App().mainloop()
