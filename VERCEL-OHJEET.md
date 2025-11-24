# 🚀 KSYK Maps - Vercel Käyttöönotto (KORJATTU)

## ✅ Ongelma Korjattu!

**Aiempi ongelma:** Vercel näytti JavaScript-koodia sivun sijaan.

**Ratkaisu tehty:**
- ✅ Luotiin `api/index.ts` - Vercel serverless API
- ✅ Päivitettiin `vercel.json` - Oikeat reititykset
- ✅ Korjattiin `package.json` - Build-skripti

**Seuraavaksi:** Push muutokset GitHubiin ja lisää environment variables.

---

## 📋 Mitä Tehdä Nyt

### 1️⃣ Push Korjaukset GitHubiin

Avaa terminaali ja aja:

```bash
git add .
git commit -m "Fix Vercel configuration for serverless deployment"
git push
```

Vercel huomaa muutoksen ja alkaa buildaamaan automaattisesti!

---

### 2️⃣ Build Todennäköisesti Epäonnistuu Ensimmäisellä Kerralla

**Tämä on NORMAALIA!** Syy: Environment variables puuttuvat.

Näet virheen:
```
❌ Build Failed
Error: Missing environment variables
```

**ÄLÄ HUOLI!** Korjataan tämä seuraavassa vaiheessa.

---

## ⚙️ Mitä Juuri Korjattiin?

**Ongelma:** Vercel näytti JavaScript-koodia sivun sijaan.

**Syy:** Vercel ei ajanut Express-serveriä oikein, vaan näytti staattisen tiedoston.

**Ratkaisu:** 
- ✅ Luotiin `api/index.ts` Vercel serverless functionille
- ✅ Päivitettiin `vercel.json` oikeilla asetuksilla
- ✅ Korjattiin build-prosessi

**Nyt pitää:** Push muutokset GitHubiin ja lisätä environment variables.

---

## 🔧 Vaihe 1: Lisää Environment Variables

### Miksi Tarvitaan?

Sovellus tarvitsee:
- Firebase credentials (tietokanta)
- Database URL (Neon/Postgres)
- Session secret (turvallisuus)

### Miten Lisätään?

1. **Mene Vercel Dashboardiin**
   - Klikkaa projektisi nimeä: `ksyk-maps`

2. **Avaa Settings**
   - Yläpalkista: **Settings**

3. **Valitse Environment Variables**
   - Vasemmalta: **Environment Variables**

4. **Lisää Muuttujat Yksi Kerrallaan**

---

## 📝 Muuttujat Jotka Pitää Lisätä

Kopioi nämä arvot `.env` tiedostostasi:

### Firebase Muuttujat (6 kpl)

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

**TÄRKEÄÄ:** 
- ✅ Muista `VITE_` etuliite!
- ✅ Kopioi arvot TÄSMÄLLEEN `.env` tiedostosta
- ✅ Ei lainausmerkkejä (" ") arvojen ympärille

### Database Muuttuja

```
DATABASE_URL
```

**TÄRKEÄÄ:** Jos käytät Neon PostgreSQL:
```
postgresql://user:password@host.neon.tech/database?sslmode=require
```

**Jos käytät Firebase:**
```
USE_FIREBASE=true
```

Ja lisää myös Firebase Service Account (katso alla)

### Turvallisuus Muuttujat

```
SESSION_SECRET
```

Voit käyttää mitä tahansa pitkää satunnaista merkkijonoa, esim:
```
ksyk-maps-secret-key-2024-production-abc123xyz
```

```
NODE_ENV
```

Arvo: `production`

---

## 🎯 Tarkat Ohjeet Muuttujien Lisäämiseen

### Jokaista Muuttujaa Varten:

1. **Klikkaa "Add New"**

2. **Täytä Kentät:**
   - **Key**: Muuttujan nimi (esim. `VITE_FIREBASE_API_KEY`)
   - **Value**: Arvo `.env` tiedostosta (kopioi-liitä)
   - **Environment**: Valitse **KAIKKI** (Production, Preview, Development)

3. **Klikkaa "Save"**

4. **Toista Seuraavalle Muuttujalle**

### Yhteensä Lisättävä: 9-10 Muuttujaa

- [ ] VITE_FIREBASE_API_KEY
- [ ] VITE_FIREBASE_AUTH_DOMAIN
- [ ] VITE_FIREBASE_PROJECT_ID
- [ ] VITE_FIREBASE_STORAGE_BUCKET
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID
- [ ] VITE_FIREBASE_APP_ID
- [ ] DATABASE_URL (tai USE_FIREBASE=true)
- [ ] SESSION_SECRET
- [ ] NODE_ENV
- [ ] FIREBASE_SERVICE_ACCOUNT (jos käytät Firebasea)

### Jos Käytät Firebase Tietokantana:

1. **Lisää USE_FIREBASE**
   - Key: `USE_FIREBASE`
   - Value: `true`

2. **Lisää FIREBASE_SERVICE_ACCOUNT**
   - Key: `FIREBASE_SERVICE_ACCOUNT`
   - Value: Kopioi KOKO `serviceAccountKey.json` tiedoston sisältö (JSON muodossa)
   - Esim: `{"type":"service_account","project_id":"...","private_key":"..."}`

---

## 🔄 Vaihe 2: Käynnistä Build Uudelleen

Kun kaikki muuttujat on lisätty:

1. **Mene "Deployments" välilehteen**
   - Yläpalkista: **Deployments**

2. **Etsi Uusin Deployment**
   - Näkyy ylimpänä listassa
   - Status: ❌ Failed (tai 🟡 Building)

3. **Avaa Deployment**
   - Klikkaa deploymentin nimeä

4. **Käynnistä Uudelleen**
   - Klikkaa **"..."** (kolme pistettä oikeassa yläkulmassa)
   - Valitse **"Redeploy"**
   - Vahvista: **"Redeploy"**

5. **Odota 2-3 Minuuttia**
   - Näet real-time logit
   - Build kestää noin 2-3 minuuttia

---

## ✅ Vaihe 3: Tarkista Että Build Onnistui

### Onnistunut Build Näyttää Tältä:

```
✓ Build completed
✓ Deployment ready
✓ https://ksyk-maps-abc123.vercel.app
```

### Jos Build Epäonnistuu:

1. **Lue Virheviesti**
   - Scroll alas lokissa
   - Etsi punainen teksti
   - Lue mitä sanoo

2. **Yleisimmät Virheet:**

   **"Missing environment variable: VITE_FIREBASE_API_KEY"**
   - Ratkaisu: Lisää puuttuva muuttuja
   - Varmista että `VITE_` etuliite on mukana

   **"Firebase: Error (auth/invalid-api-key)"**
   - Ratkaisu: Tarkista että API key on oikein
   - Kopioi uudelleen `.env` tiedostosta

   **"Database connection failed"**
   - Ratkaisu: Tarkista DATABASE_URL
   - Varmista että Neon database on käynnissä

3. **Korjaa Virhe ja Redeploy**

---

## 🌐 Vaihe 4: Testaa Sovellus

### Kun Build On Valmis:

1. **Avaa Sovellus**
   - Klikkaa deployment URLia
   - Esim: `https://ksyk-maps-abc123.vercel.app`

2. **Testaa Etusivu**
   - Pitäisi näkyä KSYK Maps
   - Kartta latautuu
   - Ei virheviestejä

3. **Testaa Admin Login**
   - Mene: `/admin-login`
   - Kirjaudu sisään:
     - Email: `JuusoJuusto112@gmail.com`
     - Password: `Juusto2012!`

4. **Testaa Admin Dashboard**
   - Pitäisi näkyä admin paneeli
   - Rakennukset näkyvät
   - Voit lisätä/muokata

### Jos Jotain Ei Toimi:

**Valkoinen sivu / Ei lataudu:**
- Avaa Developer Console (F12)
- Katso Console välilehti
- Etsi virheviestit (punaisella)
- Yleensä Firebase tai API virhe

**"Firebase: Error":**
- Tarkista että KAIKKI Firebase muuttujat on lisätty
- Varmista että `VITE_` etuliite on jokaisessa

**"Network Error" / "API Error":**
- Tarkista DATABASE_URL
- Varmista että Neon database on käynnissä

---

## 🎨 Vaihe 5: Vaihda URL (Valinnainen)

Oletuksena URL on: `ksyk-maps-abc123.vercel.app`

### Vaihda Lyhyemmäksi:

1. **Mene Settings → Domains**

2. **Klikkaa "Edit" projektin nimen vieressä**

3. **Vaihda Nimeksi:**
   ```
   ksykmaps
   ```

4. **Klikkaa "Save"**

5. **Uusi URL:**
   ```
   https://ksykmaps.vercel.app
   ```

---

## 🔄 Automaattiset Päivitykset

### Kun Teet Muutoksia Koodiin:

1. **Muokkaa Tiedostoja**
   - Esim. lisää rakennus, muuta väriä

2. **Tallenna Muutokset**

3. **Push GitHubiin:**
   ```bash
   git add .
   git commit -m "Lisätty uusi rakennus"
   git push
   ```

4. **Vercel Huomaa Automaattisesti!**
   - Alkaa buildaamaan (2-3 min)
   - Deployaa automaattisesti
   - Päivittää sivun

5. **Valmis!**
   - Muutokset näkyvät sivulla
   - Ei tarvitse tehdä mitään muuta

### Seuraa Deploymentia:

- Vercel Dashboard → Deployments
- Näet real-time statuksen:
  - 🟡 Building... (2-3 min)
  - ✅ Ready (Valmis!)
  - ❌ Failed (Epäonnistui)

---

## 📊 Mitä Saat Vercelillä

✅ **24/7 Käynnissä**
- Ei tarvitse pitää konetta päällä
- Toimii aina

✅ **Nopea**
- Cloudflare CDN
- Latautuu nopeasti kaikkialla

✅ **HTTPS**
- Automaattinen SSL sertifikaatti
- Turvallinen yhteys

✅ **Ilmainen**
- Ei kuukausimaksuja
- Hobby plan riittää

✅ **Automaattiset Päivitykset**
- Push GitHubiin → Vercel päivittää
- Ei manuaalista työtä

✅ **Analytics**
- Näe kuinka moni käyttää
- Vercel Dashboard → Analytics

✅ **Logs**
- Debuggaa ongelmia
- Näe kaikki virheet

---

## 🆘 Yleisimmät Ongelmat

### ❌ Build Failed - "Missing environment variable"

**Ratkaisu:**
1. Settings → Environment Variables
2. Lisää puuttuva muuttuja
3. Varmista että `VITE_` etuliite on Firebase muuttujissa
4. Redeploy

### ❌ Valkoinen Sivu / Ei Lataudu

**Ratkaisu:**
1. Avaa Developer Console (F12)
2. Katso Console välilehti
3. Etsi virheviestit
4. Yleensä Firebase credentials väärin

### ❌ "Firebase: Error (auth/invalid-api-key)"

**Ratkaisu:**
1. Tarkista VITE_FIREBASE_API_KEY
2. Kopioi uudelleen `.env` tiedostosta
3. Varmista että ei ole välilyöntejä alussa/lopussa
4. Redeploy

### ❌ "Database connection failed"

**Ratkaisu:**
1. Tarkista DATABASE_URL
2. Varmista että Neon database on käynnissä
3. Tarkista että URL on oikein
4. Redeploy

### ❌ Admin Login Ei Toimi

**Ratkaisu:**
1. Varmista että Firebase Authentication on käytössä
2. Tarkista että Email/Password provider on aktivoitu
3. Tarkista että käyttäjä on luotu Firebasessa

---

## 📖 Lisäohjeita

### Yksityiskohtaiset Ongelmanratkaisut:
→ Katso: `ONGELMAT-JA-RATKAISUT.md`

### Firebase Setup:
→ Katso: `FIREBASE_SETUP.md`

### Nopea Pikaopas:
→ Katso: `PIKAOPAS.md`

---

## 🎯 Tarkistuslista

Käy läpi ennen kuin kysyt apua:

- [ ] Kaikki 9 environment variablea lisätty
- [ ] `VITE_` etuliite Firebase muuttujissa
- [ ] Build onnistunut (✅ Ready)
- [ ] Sovellus avautuu selaimessa
- [ ] Ei virheviestejä Developer Consolessa
- [ ] Admin login toimii
- [ ] Firebase on käytössä
- [ ] Neon database on käynnissä

---

## 🎉 Kun Kaikki Toimii

**Sovelluksesi on nyt live!**

Jaa URL muille:
```
https://ksykmaps.vercel.app
```

Admin paneeli:
```
https://ksykmaps.vercel.app/admin-login
```

**Onnea! 🚀**

---

## 💡 Vinkit

### Kehitysympäristö vs. Tuotanto

**Lokaalisti (npm run dev):**
- Päivittyy HETI kun tallennat
- Vain sinun koneellasi
- Nopea testaus

**Vercelissä (Tuotanto):**
- Päivittyy kun pusket GitHubiin
- Kaikki näkevät
- Kestää 2-3 minuuttia

### Nopea Päivitys

```bash
# Tee muutoksia, sitten:
git add . && git commit -m "Päivitys" && git push
```

### Katso Mitä Muuttui

```bash
git status    # Muutetut tiedostot
git diff      # Tarkat muutokset
```

### Peruuta Muutokset

```bash
git reset --hard    # Peruuta kaikki
```

---

## 📞 Tuki

Jos tarvitset apua:

1. **Tarkista Build Logs**
   - Deployments → Klikkaa deploymentia
   - Lue virheviestit

2. **Tarkista Environment Variables**
   - Settings → Environment Variables
   - Varmista että kaikki on lisätty

3. **Tarkista Firebase Console**
   - https://console.firebase.google.com
   - Varmista että kaikki on käytössä

4. **Lue Tämä Ohje Uudelleen**
   - Useimmiten ratkaisu löytyy täältä

**Kaikki toimii! 🎉**
