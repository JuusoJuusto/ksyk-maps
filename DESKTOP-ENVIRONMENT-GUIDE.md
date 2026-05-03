# 🖥️ Wilma Desktop Environment - Complete Guide

## ✅ Status: FULLY IMPLEMENTED & DEPLOYED

The hidden desktop environment is now live and fully functional!

---

## 🚀 Quick Start

### For Admins:

1. **Enable Desktop Feature:**
   - Login to Wilma Admin
   - Navigate to **"Työpöytä"** tab in the sidebar
   - Toggle **"Työpöytä käytössä"** to ON
   - Click **"Tallenna asetukset"**

2. **Seed Default Apps (First Time Only):**
   ```bash
   npm run tsx server/seedDesktopApps.ts
   ```
   This creates 10 default apps automatically.

3. **Access Desktop:**
   - Go to: `/wilma-admin/:yourAdminId/desktop`
   - Example: `https://your-domain.com/wilma-admin/abc123/desktop`

### For Students/Teachers:

1. **Access Desktop:**
   - Go to: `/wilma/:studentId/desktop`
   - Example: `https://your-domain.com/wilma/123456/desktop`

---

## 📱 Default Apps Included

| App | Finnish Name | Category | Description |
|-----|--------------|----------|-------------|
| Calculator | Laskin | Utility | Basic calculator |
| Notepad | Muistio | Productivity | Text editor |
| Calendar | Kalenteri | Productivity | Schedule viewer |
| Music Player | Musiikkisoitin | Entertainment | YouTube music |
| Games | Pelit | Entertainment | Educational games |
| Code Editor | Koodieditori | Education | Online code editor |
| Library | Kirjasto | Education | Digital library |
| Mail | Sähköposti | Productivity | Email client |
| Settings | Asetukset | Utility | Desktop customization |
| Clock | Kello | Utility | World clock |

---

## 🎨 Admin Customization

### General Settings Tab:
- ✅ Enable/disable desktop globally
- ✅ Allow custom wallpapers
- ✅ Allow custom themes

### Applications Tab:
- ✅ Create new apps
- ✅ Edit existing apps
- ✅ Delete apps
- ✅ Toggle app availability
- ✅ Set default apps for new users

### Appearance Tab:
- ✅ Set default wallpaper URL
- ✅ Set default theme (light/dark/blue)

---

## 🛠️ Creating Custom Apps

### App Types:

**1. IFrame Apps** (Embed websites)
```json
{
  "appType": "iframe",
  "appUrl": "https://example.com",
  "width": 800,
  "height": 600
}
```

**2. Component Apps** (React components)
```json
{
  "appType": "component",
  "componentName": "MyCustomApp",
  "width": 600,
  "height": 500
}
```

**3. External Apps** (Open in new tab)
```json
{
  "appType": "external",
  "appUrl": "https://example.com"
}
```

### App Properties:
- **Name** (EN/FI): Display name
- **Icon**: Icon identifier (calculator, notepad, etc.)
- **Category**: utility, education, entertainment, productivity
- **Size**: Default window width/height
- **Controls**: Resizable, minimizable, maximizable
- **Roles**: Who can access (student, teacher, parent, admin)

---

## 🎯 Features

### Desktop UI:
- ✅ Windows-like interface
- ✅ Desktop icons (up to 16 visible)
- ✅ Taskbar with start menu
- ✅ System tray with clock
- ✅ Customizable wallpaper

### Window Management:
- ✅ Minimize/Maximize/Close
- ✅ Drag windows
- ✅ Click to bring to front
- ✅ Multiple windows open simultaneously

### User Customization:
- ✅ Install/uninstall apps
- ✅ Custom wallpaper (if allowed)
- ✅ Custom theme (if allowed)
- ✅ Desktop layout saved per user

---

## 🔗 Access URLs

### Students:
```
/wilma/:studentId/desktop
```

### Teachers/Admin:
```
/wilma-admin/:adminId/desktop
```

### Direct Navigation:
Users can access desktop by manually typing the URL or you can add a button/link in your Wilma views.

---

## 📊 Database Collections

### Firebase Collections:
- `wilmaDesktopSettings` - Global configuration
- `wilmaDesktopApps` - Available applications
- `wilmaUserDesktopConfig` - Per-user settings

### PostgreSQL Tables (if using Postgres):
- `wilma_desktop_settings`
- `wilma_desktop_apps`
- `wilma_user_desktop_config`

---

## 🎨 Customization Examples

### Add a Custom Calculator:
1. Go to Admin → Työpöytä → Sovellukset
2. Click "Lisää sovellus"
3. Fill in:
   - App ID: `my-calculator`
   - Name: `My Calculator`
   - Name (FI): `Oma Laskin`
   - Icon: `calculator`
   - Category: `utility`
   - App Type: `iframe`
   - URL: `https://www.calculator.net/`
   - Width: 400, Height: 600
4. Toggle "Saatavilla" ON
5. Save

### Change Default Wallpaper:
1. Go to Admin → Työpöytä → Ulkoasu
2. Enter wallpaper URL: `/your-custom-bg.jpg`
3. Save

---

## 🐛 Troubleshooting

### Desktop not showing?
- Check if desktop is enabled in admin settings
- Verify user has correct permissions
- Check browser console for errors

### Apps not loading?
- Verify app URLs are accessible
- Check if app is marked as "active"
- Ensure user role has permission

### Window not responding?
- Refresh the page
- Check if window is minimized (click taskbar)
- Clear browser cache

---

## 🚀 Future Enhancements

Potential additions:
- [ ] Drag-and-drop desktop icons
- [ ] Custom app shortcuts
- [ ] Desktop widgets
- [ ] Multi-monitor support
- [ ] Desktop notifications
- [ ] File system simulation
- [ ] More built-in apps

---

## 📝 Notes

- Desktop is **hidden** by default - users must know the URL
- Fully customizable by admins
- Works on all devices (desktop, tablet, mobile)
- All data saved per user
- Supports Finnish and English

---

## 🎉 You're All Set!

The desktop environment is now fully functional and ready to use. Enjoy your new OS-like experience inside Wilma! 🖥️✨
