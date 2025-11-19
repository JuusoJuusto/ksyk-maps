# 🆘 KSYK Maps - Ongelmat ja Ratkaisut

## ❌ Yleisimmät Ongelmat

### 1. "Näkyy Vain Koodia" / "Valkoinen Sivu"

**Syy:** Vite dev server ei ole käynnissä tai buildia ei ole tehty.

**Ratkaisu:**

#### Kehitysympäristö (Development):
```bash
# Pysäytä kaikki terminaalit (Ctrl+C)

# Terminal 1: Käynnistä backend
npm run dev

# Odota kunnes näkyy:
# "serving on port 3000"
# "✅ Firebase initialized"

# Terminal 2: Käynnistä Cloudflare (jos haluat jakaa)
cloudflared tunnel --url http://localhost:3000
```

#### Tuotanto (Production):
```bash
# Buildaa ensin
npm run build

# Sitten käynnistä
npm start
```

**Tarkista:**
- ✅ Molemmat terminaalit käynnissä
- ✅ Ei virheviestejä terminaalissa
- ✅ Avaa: `http://localhost:5173` (dev) tai `http://localhost:3000` (prod)

---

### 2. "Firebase Error" / "Failed to Initialize"

**Syy:** Firebase credentials puuttuvat tai ovat väärin.

**Ratkaisu:**

1. **Tarkista `.env` tiedosto:**
```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=ksyk-maps.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ksyk-maps
VITE_FIREBASE_STORAGE_BUCKET=ksyk-maps.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

2. **Varmista että `VITE_` etuliite on kaikissa!**

3. **Tarkista Firebase Console:**
   - Mene: https://console.firebase.google.com
   - Valitse projektisi
   - Settings → Project settings
   - Kopioi credentials uudelleen

4. **Käynnistä uudelleen:**
```bash
# Pysäytä (Ctrl+C)
npm run dev
```

---

### 3. "Database Error" / "Storage Error"

**Syy:** Firebase Firestore ei ole käytössä tai service account key puuttuu.

**Ratkaisu:**

1. **Tarkista Firestore:**
   - Firebase Console → Firestore Database
   - Jos ei ole luotu → Klikkaa "Create database"
   - Valitse "Start in test mode"

2. **Tarkista Service Account Key:**
   - Firebase Console → Settings → Service accounts
   - Klikkaa "Generate new private key"
   - Tallenna nimellä: `serviceAccountKey.json`
   - Laita projektin juureen

3. **Tarkista `.env`:**
```env
DATABASE_URL=firebase
```

---

### 4. "Port 3000 Already in Use"

**Syy:** Toinen prosessi käyttää porttia 3000.

**Ratkaisu:**

#### Windows:
```powershell
# Etsi prosessi
netstat -ano | findstr :3000

# Tapa prosessi (vaihda PID)
taskkill /PID 12345 /F
```

#### Tai vaihda portti:
```bash
# Muokkaa package.json
"dev": "tsx server/index.ts --port 3001"
```

---

### 5. "Cloudflared Not Found"

**Syy:** Cloudflared ei ole asennettu tai PATH ei ole päivitetty.

**Ratkaisu:**

1. **Asenna uudelleen:**
```powershell
# PowerShell (Admin)
winget install --id Cloudflare.cloudflared
```

2. **Käynnistä terminaali uudelleen**

3. **Testaa:**
```bash
cloudflared --version
```

4. **Jos ei toimi, lisää PATH:**
   - Etsi: `C:\Program Files\cloudflared\cloudflared.exe`
   - Lisää PATH:iin Windows asetuksista

---

### 6. "npm install" Epäonnistuu

**Syy:** Node modules korruptoitunut tai väärä Node versio.

**Ratkaisu:**

```bash
# Poista node_modules
rmdir /s /q node_modules

# Poista package-lock
del package-lock.json

# Asenna uudelleen
npm install
```

**Tarkista Node versio:**
```bash
node --version
# Pitäisi olla v18 tai uudempi
```

**Päivitä Node:**
- Lataa: https://nodejs.org
- Asenna LTS versio

---

### 7. "Build Failed" Vercelissä

**Syy:** Environment variables puuttuvat tai build komento väärä.

**Ratkaisu:**

1. **Tarkista Environment Variables:**
   - Vercel → Settings → Environment Variables
   - Varmista että KAIKKI muuttujat on lisätty
   - Erityisesti `VITE_` alkuiset!

2. **Tarkista Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Katso Build Logs:**
   - Vercel → Deployments → Klikkaa deploymentia
   - Lue virheviestit
   - Korjaa ongelma

4. **Redeploy:**
   - Deployments → ... → Redeploy

---

### 8. "Cannot Login" / "Invalid Credentials"

**Syy:** Väärät tunnukset tai sessio ongelma.

**Ratkaisu:**

**Owner tunnukset (hardcoded):**
```
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!
```

**Jos ei toimi:**
1. Tyhjennä selaimen cache
2. Avaa incognito/private mode
3. Kokeile uudelleen

**Luo uusi admin:**
1. Kirjaudu ownerina
2. Admin Dashboard → Users
3. Klikkaa "Add User"
4. Luo uusi admin

---

### 9. "KSYK Builder Ei Toimi"

**Syy:** JavaScript virhe tai komponentti ei lataudu.

**Ratkaisu:**

1. **Avaa Browser Console:**
   - Paina F12
   - Mene Console välilehteen
   - Katso virheviestit

2. **Tyhjennä Cache:**
   - Ctrl + Shift + Delete
   - Tyhjennä kaikki
   - Päivitä sivu (F5)

3. **Tarkista että olet admin:**
   - Kirjaudu sisään
   - Mene `/admin`
   - Klikkaa "🏗️ KSYK Builder"

---

### 10. "Muutokset Eivät Näy"

**Syy:** Cache tai hot reload ei toimi.

**Ratkaisu:**

#### Kehitysympäristö:
```bash
# Pysäytä dev server (Ctrl+C)
# Käynnistä uudelleen
npm run dev
```

#### Selain:
- Paina Ctrl + Shift + R (hard refresh)
- Tai Ctrl + F5

#### Vercel:
- Muutokset päivittyvät automaattisesti kun pusket GitHubiin
- Odota 2-3 minuuttia

---

## 🔄 Auto-Update Tiedot

### Kehitysympäristö (npm run dev):
✅ **Päivittyy automaattisesti!**
- Muokkaa koodia
- Tallenna tiedosto
- Selain päivittyy automaattisesti (Hot Module Replacement)

**Jos ei päivity:**
- Paina F5 selaimessa
- Tai käynnistä dev server uudelleen

### Vercel (Production):
✅ **Päivittyy automaattisesti GitHubista!**

**Prosessi:**
1. Tee muutoksia koodiin
2. Tallenna
3. Push GitHubiin:
```bash
git add .
git commit -m "Päivitys"
git push
```
4. Vercel buildaa automaattisesti (2-3 min)
5. Valmis! Muutokset näkyvät `ksykmaps.vercel.app`

**Seuraa deploymentia:**
- Vercel Dashboard → Deployments
- Näet real-time statuksen

### Cloudflare Tunnel:
❌ **EI päivity automaattisesti**
- Pitää käynnistää dev server uudelleen
- Cloudflare tunnel pysyy samana

---

## 🛠️ Yleinen Ongelmanratkaisu

### 1. Käynnistä Kaikki Uudelleen
```bash
# Pysäytä kaikki (Ctrl+C)

# Tyhjennä node_modules (jos tarpeen)
rmdir /s /q node_modules
npm install

# Käynnistä uudelleen
npm run dev
```

### 2. Tarkista Logit
```bash
# Katso terminaali outputtia
# Etsi virheviestejä (punaisella)
# Lue mitä ne sanovat
```

### 3. Tarkista Browser Console
```
F12 → Console
Katso virheviestit
```

### 4. Tarkista Firebase Console
```
https://console.firebase.google.com
Katso onko virheitä
```

### 5. Tarkista Vercel Logs
```
Vercel → Deployments → Klikkaa deploymentia
Lue build logs
```

---

## 📞 Tuki

### Jos Mikään Ei Toimi:

1. **Tarkista kaikki yllä olevat ratkaisut**
2. **Lue virheviestit huolellisesti**
3. **Google virheilmoitus**
4. **Tarkista GitHub Issues**

### Debug Checklist:
- [ ] `.env` tiedosto on olemassa ja oikein
- [ ] Firebase credentials ovat oikein
- [ ] `npm install` on ajettu
- [ ] Node versio on v18+
- [ ] Molemmat terminaalit käynnissä
- [ ] Ei virheviestejä terminaalissa
- [ ] Selain console ei näytä virheitä
- [ ] Firebase Console ei näytä virheitä

---

## 💡 Vinkit

### Kehitysympäristö:
- Pidä terminaalit auki
- Katso virheviestejä
- Käytä browser consolea (F12)
- Hard refresh (Ctrl + Shift + R)

### Tuotanto (Vercel):
- Push GitHubiin → Päivittyy automaattisesti
- Tarkista Environment Variables
- Katso build logs
- Odota 2-3 min deploymentin jälkeen

### Cloudflare:
- Pidä PowerShell auki
- URL vaihtuu joka kerta
- Ei 24/7 automaattista

---

## ✅ Toimiva Setup

```bash
# Terminal 1: Backend + Frontend
npm run dev
# Odota: "serving on port 3000"

# Terminal 2: Cloudflare (valinnainen)
cloudflared tunnel --url http://localhost:3000
# Kopioi URL

# Selain:
http://localhost:5173
# Tai Cloudflare URL
```

**Kaikki pitäisi toimia! 🎉**
