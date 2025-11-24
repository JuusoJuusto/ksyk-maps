# 🔧 Vercel Database Virhe - Korjaus

## ❌ Virhe

```
Unexpected token 'A', "A server e"... is not valid JSON
```

## 🔍 Syy

API palauttaa HTML-virhesivun JSON:n sijaan. Tämä tarkoittaa että:
1. Environment variables puuttuvat
2. Database yhteys ei toimi
3. Serverless function kaatuu

## ✅ Ratkaisu

### Vaihe 1: Tarkista Environment Variables Vercelissä

Mene: **Vercel Dashboard → Settings → Environment Variables**

Varmista että KAIKKI nämä on lisätty:

#### Frontend Variables (6 kpl)
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

#### Backend Variables

**Jos käytät PostgreSQL (Neon):**
```
DATABASE_URL=postgresql://user:password@host.neon.tech/database?sslmode=require
```

**Jos käytät Firebase:**
```
USE_FIREBASE=true
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

#### Muut Variables
```
SESSION_SECRET=your_random_secret_key_here
NODE_ENV=production
```

### Vaihe 2: Tarkista Että Kaikki Variables On Oikein

**Yleisimmät Virheet:**

1. **Puuttuva `VITE_` etuliite**
   - ❌ `FIREBASE_API_KEY`
   - ✅ `VITE_FIREBASE_API_KEY`

2. **Välilyönnit arvoissa**
   - ❌ `postgresql://user:pass @host`
   - ✅ `postgresql://user:pass@host`

3. **Lainausmerkit arvoissa**
   - ❌ `"your_api_key"`
   - ✅ `your_api_key`

4. **DATABASE_URL puuttuu**
   - Jos et käytä Firebasea, DATABASE_URL on pakollinen
   - Jos käytät Firebasea, lisää `USE_FIREBASE=true`

### Vaihe 3: Tarkista Vercel Logs

1. **Mene Vercel Dashboard**
2. **Klikkaa Deployments**
3. **Klikkaa uusinta deploymentia**
4. **Klikkaa "Functions" välilehti**
5. **Katso virheviestit**

**Mitä etsiä:**

```
❌ "Missing environment variable: DATABASE_URL"
→ Lisää DATABASE_URL

❌ "Firebase: Error (auth/invalid-api-key)"
→ Tarkista VITE_FIREBASE_API_KEY

❌ "Connection refused"
→ Tarkista DATABASE_URL

❌ "Cannot find module"
→ Build epäonnistui, tarkista dependencies
```

### Vaihe 4: Redeploy

Kun olet lisännyt/korjannut environment variables:

1. **Mene Deployments**
2. **Klikkaa uusinta deploymentia**
3. **Klikkaa "..." (kolme pistettä)**
4. **Valitse "Redeploy"**
5. **Odota 2-3 minuuttia**

### Vaihe 5: Testaa API

Avaa selaimessa:
```
https://your-app.vercel.app/api/buildings
```

**Pitäisi näkyä:**
```json
[
  {
    "id": "1",
    "name": "M",
    "nameEn": "Music Building",
    ...
  }
]
```

**Jos näkyy:**
```
A server error occurred...
```
→ Tarkista Vercel logs (Vaihe 3)

## 🔍 Debuggaus

### Tarkista Environment Variables Koodissa

Lisää väliaikaisesti `api/index.ts` tiedostoon:

```typescript
console.log("Environment check:", {
  hasDatabase: !!process.env.DATABASE_URL,
  hasFirebase: !!process.env.USE_FIREBASE,
  nodeEnv: process.env.NODE_ENV
});
```

Katso Vercel logs:
1. Deployments → Functions → Logs
2. Etsi "Environment check"
3. Tarkista että arvot ovat oikein

### Tarkista Database Yhteys

**Jos käytät Neon:**
1. Mene Neon Dashboard
2. Tarkista että database on käynnissä
3. Kopioi connection string uudelleen
4. Päivitä DATABASE_URL Vercelissä

**Jos käytät Firebase:**
1. Mene Firebase Console
2. Tarkista että Firestore on käytössä
3. Tarkista että Service Account on oikein

## 📋 Tarkistuslista

Käy läpi ennen kuin kysyt apua:

- [ ] Kaikki environment variables lisätty Verceliin
- [ ] `VITE_` etuliite Firebase muuttujissa
- [ ] Ei välilyöntejä arvoissa
- [ ] Ei lainausmerkkejä arvoissa
- [ ] DATABASE_URL tai USE_FIREBASE=true lisätty
- [ ] SESSION_SECRET lisätty
- [ ] NODE_ENV=production lisätty
- [ ] Redeploy tehty
- [ ] Vercel logs tarkistettu
- [ ] API endpoint testattu selaimessa

## 🎯 Nopea Korjaus

Jos mikään ei toimi, kokeile tätä:

1. **Poista KAIKKI environment variables**
   - Settings → Environment Variables
   - Poista kaikki

2. **Lisää ne UUDELLEEN yksi kerrallaan**
   - Kopioi arvot suoraan `.env` tiedostosta
   - Varmista että ei ole välilyöntejä

3. **Redeploy**

4. **Testaa**

## 💡 Yleisiä Ongelmia

### "Cannot read property 'sub' of undefined"

**Syy:** Firebase Authentication ei toimi

**Ratkaisu:**
1. Tarkista VITE_FIREBASE_* muuttujat
2. Varmista että Firebase Authentication on käytössä
3. Varmista että Email/Password provider on aktivoitu

### "Connection timeout"

**Syy:** Database ei vastaa

**Ratkaisu:**
1. Tarkista DATABASE_URL
2. Varmista että database on käynnissä
3. Tarkista että IP-osoite on sallittu (Neon: Allow all)

### "Module not found"

**Syy:** Build epäonnistui

**Ratkaisu:**
1. Tarkista package.json
2. Varmista että kaikki dependencies on asennettu
3. Redeploy

## 📞 Lisäapu

Katso yksityiskohtaiset ohjeet:
- `VERCEL-OHJEET.md` - Täydelliset käyttöönotto-ohjeet
- `VERCEL-FIX-SUMMARY.md` - Mitä korjattiin
- `ONGELMAT-JA-RATKAISUT.md` - Yleiset ongelmat

**Vercel on nyt korjattu ja pitäisi toimia kun environment variables on lisätty!**
