# 🆘 KSYK Maps - Ongelmat (Pika-ratkaisu)

## ❌ Näkyy Vain Koodia

```bash
npm run dev
# Odota "serving on port 3000"
# Avaa: http://localhost:5173
```

---

## ❌ Firebase Error

```bash
# Tarkista .env:
VITE_FIREBASE_API_KEY=...  # VITE_ etuliite!
VITE_FIREBASE_PROJECT_ID=...
```

Käynnistä uudelleen: `npm run dev`

---

## ❌ Port 3000 Käytössä

```powershell
# Etsi prosessi
netstat -ano | findstr :3000

# Tapa (vaihda PID)
taskkill /PID 12345 /F

# Käynnistä
npm run dev
```

---

## ❌ Cloudflared Not Found

```powershell
# Asenna
winget install --id Cloudflare.cloudflared

# Käynnistä terminaali uudelleen
cloudflared --version
```

---

## ❌ npm install Epäonnistuu

```bash
# Poista ja asenna uudelleen
rmdir /s /q node_modules
del package-lock.json
npm install
```

---

## ❌ Cannot Login

```
Oikeat tunnukset:
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!

Tyhjennä cache: Ctrl+Shift+Delete
Kokeile incognito mode
```

---

## ❌ Vercel Build Failed

1. Settings → Environment Variables
2. Lisää KAIKKI muuttujat
3. Varmista `VITE_` etuliite
4. Redeploy

---

## ❌ Muutokset Eivät Näy

**Development:**
```bash
# Käynnistä uudelleen
npm run dev
# Tai paina Ctrl+Shift+R selaimessa
```

**Vercel:**
```bash
git add .
git commit -m "Päivitys"
git push
# Odota 2-3 min
```

---

## 🔧 Yleinen Ratkaisu

```bash
# Pysäytä kaikki (Ctrl+C)
# Tyhjennä ja asenna
rmdir /s /q node_modules
npm install
# Käynnistä
npm run dev
```

---

## 💡 Debug Checklist

- [ ] `.env` tiedosto on olemassa
- [ ] `VITE_` etuliite Firebase muuttujissa
- [ ] `npm install` ajettu
- [ ] Node v18+
- [ ] Ei virheitä terminaalissa
- [ ] Selain console (F12) ei näytä virheitä

---

## 📞 Lisäapu

**Yksityiskohtaiset ratkaisut:**
→ `ONGELMAT-JA-RATKAISUT.md`

**Vercel ongelmat:**
→ `VERCEL-DEPLOY.md`
