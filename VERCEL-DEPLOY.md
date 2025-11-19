# 🚀 KSYK Maps - Vercel Deployment (Vaihe Vaiheelta)

## ✅ Valmistelut Tehty!

Olen luonut sinulle:
- ✅ `vercel.json` - Vercel konfiguraatio
- ✅ `.vercelignore` - Tiedostot joita ei lähetetä
- ✅ Kaikki tarvittavat asetukset

## 📋 Mitä Tarvitset:

1. GitHub tili
2. Vercel tili (ilmainen)
3. Firebase credentials (.env tiedostosta)

---

## 🎯 Vaihe 1: Luo GitHub Repository

### Vaihtoehto A: GitHub Desktop (Helpoin)
1. Lataa GitHub Desktop: https://desktop.github.com
2. Avaa GitHub Desktop
3. File → Add Local Repository
4. Valitse KSYK-Map kansio
5. Klikkaa "Publish repository"
6. Nimeä: `ksyk-maps`
7. Klikkaa "Publish"

### Vaihtoehto B: Komentorivi
```bash
# Projektin kansiossa
git init
git add .
git commit -m "Initial commit - KSYK Maps"
git branch -M main

# Luo repo GitHubissa: https://github.com/new
# Sitten:
git remote add origin https://github.com/SINUN-KÄYTTÄJÄ/ksyk-maps.git
git push -u origin main
```

---

## 🎯 Vaihe 2: Luo Vercel Tili

1. Mene: **https://vercel.com**
2. Klikkaa **"Sign Up"**
3. Valitse **"Continue with GitHub"**
4. Hyväksy GitHub yhteys
5. Valmis!

---

## 🎯 Vaihe 3: Deploy Projekti

1. Vercel dashboardissa klikkaa **"Add New..."**
2. Valitse **"Project"**
3. Klikkaa **"Import Git Repository"**
4. Etsi ja valitse **"ksyk-maps"**
5. Klikkaa **"Import"**

### Asetukset:
- **Framework Preset**: Vite (automaattisesti)
- **Build Command**: `npm run build` (automaattisesti)
- **Output Directory**: `dist` (automaattisesti)
- **Install Command**: `npm install` (automaattisesti)

6. Klikkaa **"Deploy"**

⏳ Odota 2-3 minuuttia...

---

## 🎯 Vaihe 4: Lisää Environment Variables

❌ **Deployment epäonnistuu ensimmäisellä kerralla!** Tämä on normaalia.

1. Mene **Settings** → **Environment Variables**
2. Lisää nämä muuttujat (kopioi .env tiedostosta):

```
VITE_FIREBASE_API_KEY=sinun_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=sinun_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=sinun_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=sinun_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=sinun_firebase_sender_id
VITE_FIREBASE_APP_ID=sinun_firebase_app_id
DATABASE_URL=sinun_database_url
SESSION_SECRET=satunnainen_salaisuus_123
NODE_ENV=production
```

### Miten Lisätä:
- Klikkaa **"Add New"**
- **Key**: `VITE_FIREBASE_API_KEY`
- **Value**: Kopioi .env tiedostosta
- **Environment**: Valitse kaikki (Production, Preview, Development)
- Klikkaa **"Save"**
- Toista jokaiselle muuttujalle

---

## 🎯 Vaihe 5: Redeploy

1. Mene **Deployments** välilehteen
2. Klikkaa uusinta deploymentia
3. Klikkaa **"..."** (kolme pistettä)
4. Valitse **"Redeploy"**
5. Klikkaa **"Redeploy"**

⏳ Odota 2-3 minuuttia...

✅ **Deployment Successful!**

---

## 🎯 Vaihe 6: Vaihda URL "ksykmaps"

1. Mene **Settings** → **Domains**
2. Näet nykyisen URL:n (esim. `ksyk-maps-abc123.vercel.app`)
3. Klikkaa **"Edit"** projektin nimen vieressä
4. Vaihda nimeksi: **`ksykmaps`**
5. Klikkaa **"Save"**

**Uusi URL:** `https://ksykmaps.vercel.app`

---

## 🎉 VALMIS!

### Testaa:
1. Avaa: `https://ksykmaps.vercel.app`
2. Pitäisi näkyä KSYK Maps!
3. Testaa admin: `https://ksykmaps.vercel.app/admin-login`

### Jaa Muille:
```
Main App: https://ksykmaps.vercel.app
Admin: https://ksykmaps.vercel.app/admin-login

Admin Credentials:
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!
```

---

## 🔄 Automaattiset Päivitykset

### ✅ Vercel Päivittää Automaattisesti!

**Kun teet muutoksia:**

1. **Muokkaa koodia** (esim. lisää rakennus, muuta väriä)
2. **Tallenna tiedostot**
3. **Push GitHubiin:**
```bash
git add .
git commit -m "Lisätty uusi rakennus"
git push
```

4. **Vercel huomaa muutoksen automaattisesti!**
   - Alkaa buildaamaan (2-3 min)
   - Deployaa automaattisesti
   - Päivittää `ksykmaps.vercel.app`

5. **Valmis!** Muutokset näkyvät sivulla

### 📊 Seuraa Deploymentia:

1. Mene Vercel Dashboardiin
2. Klikkaa "Deployments"
3. Näet real-time statuksen:
   - 🟡 Building... (2-3 min)
   - ✅ Ready (Valmis!)
   - ❌ Failed (Epäonnistui)

### 💡 Vinkit:

**Nopea päivitys:**
```bash
# Tee muutoksia
# Sitten:
git add . && git commit -m "Päivitys" && git push
```

**Katso mitä muuttui:**
```bash
git status          # Näe muutetut tiedostot
git diff            # Näe tarkat muutokset
```

**Peruuta muutos:**
```bash
git reset --hard    # Peruuta kaikki muutokset
```

### 🚀 Kehitysympäristö vs. Tuotanto:

**Kehitysympäristö (npm run dev):**
- ✅ Päivittyy HETI kun tallennat
- ✅ Hot Module Replacement
- ✅ Näet muutokset välittömästi
- ❌ Vain sinun koneellasi

**Tuotanto (Vercel):**
- ✅ Päivittyy kun pusket GitHubiin
- ✅ Kaikki näkevät muutokset
- ✅ 24/7 käynnissä
- ⏱️ Kestää 2-3 minuuttia

### 📱 Ilmoita Käyttäjille:

Kun teet suuren päivityksen:
1. Luo ilmoitus Admin Dashboardissa
2. Aseta julkaisupäivä
3. Käyttäjät näkevät ilmoituksen automaattisesti!

---

## 🆘 Ongelmatilanteet

### ❌ "Build Failed" - Deployment Epäonnistui

**Syy:** Environment variables puuttuvat TAI build virhe.

**Ratkaisu:**

1. **Tarkista Environment Variables:**
   ```
   Vercel → Settings → Environment Variables
   
   Varmista että KAIKKI nämä on lisätty:
   ✅ VITE_FIREBASE_API_KEY
   ✅ VITE_FIREBASE_AUTH_DOMAIN
   ✅ VITE_FIREBASE_PROJECT_ID
   ✅ VITE_FIREBASE_STORAGE_BUCKET
   ✅ VITE_FIREBASE_MESSAGING_SENDER_ID
   ✅ VITE_FIREBASE_APP_ID
   ✅ DATABASE_URL
   ✅ SESSION_SECRET
   ✅ NODE_ENV=production
   ```

2. **Katso Build Logs:**
   - Deployments → Klikkaa epäonnistunutta deploymentia
   - Lue virheviestit (punaisella)
   - Etsi "Error:" tai "Failed:"

3. **Yleisimmät Virheet:**
   - `Missing environment variable` → Lisää puuttuva muuttuja
   - `Module not found` → Tarkista package.json
   - `Build timeout` → Kokeile uudelleen

4. **Redeploy:**
   - Deployments → ... → Redeploy
   - Odota 2-3 minuuttia

### ❌ "Firebase Error" - Sovellus Ei Käynnisty

**Syy:** Firebase credentials väärin tai puuttuvat.

**Ratkaisu:**

1. **Tarkista että `VITE_` etuliite on KAIKISSA Firebase muuttujissa!**
   ```
   ❌ FIREBASE_API_KEY=...        (VÄÄRIN)
   ✅ VITE_FIREBASE_API_KEY=...   (OIKEIN)
   ```

2. **Kopioi credentials uudelleen:**
   - Firebase Console: https://console.firebase.google.com
   - Settings → Project settings
   - Scroll alas → Your apps
   - Kopioi kaikki arvot

3. **Päivitä Vercelissä:**
   - Settings → Environment Variables
   - Klikkaa muuttujaa → Edit
   - Päivitä arvo
   - Save

4. **Redeploy**

### ❌ "Database Error" / "Firestore Error"

**Syy:** Firestore ei ole käytössä.

**Ratkaisu:**

1. **Aktivoi Firestore:**
   - Firebase Console → Firestore Database
   - Klikkaa "Create database"
   - Valitse "Start in test mode"
   - Valitse location (europe-west)
   - Klikkaa "Enable"

2. **Tarkista Service Account:**
   - Firebase Console → Settings → Service accounts
   - Klikkaa "Generate new private key"
   - Tallenna `serviceAccountKey.json`
   - **HUOM:** Vercelissä tämä pitää lisätä eri tavalla!

3. **Vercel + Firebase:**
   - Lisää Environment Variable:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```
   - Kopioi koko JSON sisältö

### ❌ "404 Not Found" - Sivut Ei Toimi

**Syy:** Routing ei toimi tai build virhe.

**Ratkaisu:**

1. **Tarkista `vercel.json`:**
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "/api"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

2. **Redeploy:**
   - Deployments → ... → Redeploy

3. **Tyhjennä Cache:**
   - Selaimessa: Ctrl + Shift + Delete
   - Tyhjennä kaikki
   - Kokeile uudelleen

### ❌ "Näkyy Vain Koodia" / "Valkoinen Sivu"

**Syy:** Build ei onnistunut tai assets puuttuvat.

**Ratkaisu:**

1. **Tarkista Build Logs:**
   - Etsi "Build completed" viesti
   - Jos ei löydy → Build epäonnistui

2. **Tarkista Output Directory:**
   - Settings → General
   - Output Directory: `dist`

3. **Testaa Lokaalisti:**
   ```bash
   npm run build
   npm run preview
   ```
   - Jos toimii lokaalisti → Ongelma Vercelissä
   - Jos ei toimi → Ongelma koodissa

4. **Redeploy GitHubista:**
   ```bash
   git add .
   git commit -m "Fix build"
   git push
   ```

---

## 📖 Lisää Apua

**Yksityiskohtaiset ongelmanratkaisut:**
→ Katso: **`ONGELMAT-JA-RATKAISUT.md`**

**Yleisiä ongelmia:**
- Näkyy vain koodia
- Firebase virheet
- Database virheet
- Login ei toimi
- KSYK Builder ei toimi

**Kaikki ratkaisut löytyvät sieltä!**

---

## 💡 Vinkit

### Custom Domain (Oma Domain)
Jos sinulla on oma domain (esim. `ksykmaps.fi`):

1. Vercel → Settings → Domains
2. Klikkaa "Add"
3. Kirjoita: `ksykmaps.fi`
4. Seuraa DNS ohjeita
5. Odota 24h DNS päivitystä

### Automaattiset Päivitykset
- Push GitHubiin → Vercel päivittää automaattisesti
- Ei tarvitse tehdä mitään!

### Analytics
- Vercel → Analytics
- Näe kuinka moni käyttää sovellusta

### Logs
- Vercel → Deployments → Klikkaa deploymentia
- Näe kaikki logit ja virheet

---

## 📊 Mitä Saat

✅ **24/7 käynnissä** - Ei tarvitse pitää konetta päällä
✅ **Nopea** - Cloudflare CDN
✅ **HTTPS** - Automaattinen SSL
✅ **Ilmainen** - Ei kuukausimaksuja
✅ **Automaattiset päivitykset** - Push → Deploy
✅ **Custom URL** - ksykmaps.vercel.app
✅ **Analytics** - Näe käyttäjämäärät
✅ **Logs** - Debuggaa ongelmia

---

## 🎯 Seuraavat Askeleet

1. ✅ Testaa sovellus
2. ✅ Jaa URL muille
3. ✅ Luo lisää admin käyttäjiä
4. ✅ Ala käyttää KSYK Builderia!

**Onnea! Sovelluksesi on nyt live! 🚀**

---

## 📞 Tuki

Jos tarvitset apua:
1. Tarkista Vercel build logs
2. Katso Firebase Console
3. Tarkista Environment Variables
4. Lue tämä ohje uudelleen

**Kaikki toimii! 🎉**
