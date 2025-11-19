# ⚡ KSYK Maps - Pika-aloitus

## 🚀 Käynnistä Sovellus (2 Komentoa)

```bash
# 1. Käynnistä app
npm run dev

# 2. Jaa muille (uusi ikkuna)
.\START-CLOUDFLARE.bat
```

**Valmis!** Avaa: `http://localhost:5173`

---

## 🌐 Jaa URL

Cloudflare antaa URL:n:
```
https://random-words.trycloudflare.com
```

Jaa tämä muille!

---

## 🔑 Admin Kirjautuminen

```
URL: /admin-login
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!
```

---

## 🆘 Ongelmat?

### Näkyy vain koodia?
```bash
npm run dev
# Odota 10 sek, päivitä sivu
```

### Firebase error?
```bash
# Tarkista .env tiedosto
# Varmista VITE_ etuliite
```

### Port 3000 käytössä?
```powershell
netstat -ano | findstr :3000
taskkill /PID [numero] /F
npm run dev
```

---

## 📝 Lisäohjeet

- **Vercel deployment:** `VERCEL-DEPLOY.md`
- **Kaikki ongelmat:** `ONGELMAT-JA-RATKAISUT.md`
- **24/7 käynti:** `24-7-KAYNTI-OHJE.md`
