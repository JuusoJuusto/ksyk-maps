# 🔧 Vercel Environment Variables - Oikeat Arvot

## ❌ Ongelma

Vercel näyttää:
- Kaikki Firebase muuttujat ovat "Empty"
- NODE_ENV aiheuttaa virheen: "The name contains invalid characters"

## ✅ Ratkaisu

### 1. Poista NODE_ENV

**NODE_ENV on varattu nimi Vercelissä!**

1. Vercel Dashboard → Settings → Environment Variables
2. Etsi `NODE_ENV`
3. Klikkaa kolmea pistettä (...) → Remove
4. Vercel asettaa tämän automaattisesti `production` arvoksi

### 2. Täytä Firebase Muuttujat

Kopioi nämä arvot TÄSMÄLLEEN:

#### VITE_FIREBASE_API_KEY
```
AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw
```

#### VITE_FIREBASE_AUTH_DOMAIN
```
ksyk-maps.firebaseapp.com
```

#### VITE_FIREBASE_PROJECT_ID
```
ksyk-maps
```

#### VITE_FIREBASE_STORAGE_BUCKET
```
ksyk-maps.firebasestorage.app
```

#### VITE_FIREBASE_MESSAGING_SENDER_ID
```
95947778891
```

#### VITE_FIREBASE_APP_ID
```
1:95947778891:web:7c878e8b1b700ec0c816ce
```

### 3. Täytä Muut Muuttujat

#### USE_FIREBASE
```
true
```

#### SESSION_SECRET
```
ksyk-map-super-secret-key-change-in-production-2024
```

## 📋 Tarkistuslista

Kun olet täyttänyt kaikki, tarkista:

- [ ] VITE_FIREBASE_API_KEY = `AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw`
- [ ] VITE_FIREBASE_AUTH_DOMAIN = `ksyk-maps.firebaseapp.com`
- [ ] VITE_FIREBASE_PROJECT_ID = `ksyk-maps`
- [ ] VITE_FIREBASE_STORAGE_BUCKET = `ksyk-maps.firebasestorage.app`
- [ ] VITE_FIREBASE_MESSAGING_SENDER_ID = `95947778891`
- [ ] VITE_FIREBASE_APP_ID = `1:95947778891:web:7c878e8b1b700ec0c816ce`
- [ ] USE_FIREBASE = `true`
- [ ] SESSION_SECRET = `ksyk-map-super-secret-key-change-in-production-2024`
- [ ] NODE_ENV = **POISTETTU** (Vercel asettaa automaattisesti)

## 🔄 Redeploy

Kun kaikki on täytetty:

1. Mene **Deployments**
2. Klikkaa uusinta deploymentia
3. Klikkaa **"..."** (kolme pistettä)
4. Valitse **"Redeploy"**
5. Odota 2-3 minuuttia

## ✅ Testaa

Kun deployment on valmis:

### 1. Testaa API
```
https://your-app.vercel.app/api/test
```

Pitäisi näkyä:
```json
{
  "message": "API is working!",
  "timestamp": "2024-...",
  "env": {
    "hasDatabase": false,
    "hasFirebase": true,
    "nodeEnv": "production"
  }
}
```

**Tärkeää:** `hasFirebase` pitää olla `true`!

### 2. Testaa Buildings
```
https://your-app.vercel.app/api/buildings
```

Pitäisi näkyä lista rakennuksista.

### 3. Testaa Frontend
```
https://your-app.vercel.app
```

Pitäisi näkyä KSYK Maps sivu, ei JavaScript-koodia!

## 🆘 Jos Ei Toimi

### "hasFirebase: false"

**Syy:** USE_FIREBASE ei ole asetettu tai on väärä arvo

**Ratkaisu:**
1. Tarkista että USE_FIREBASE = `true` (ei lainausmerkkejä)
2. Redeploy

### "Firebase: Error (auth/invalid-api-key)"

**Syy:** VITE_FIREBASE_API_KEY on väärä

**Ratkaisu:**
1. Tarkista että arvo on: `AIzaSyBXzinZ-dcfF_n5WqBHzl88UqwnxLYF8tw`
2. Ei välilyöntejä alussa/lopussa
3. Ei lainausmerkkejä
4. Redeploy

### "Cannot find module"

**Syy:** Build epäonnistui

**Ratkaisu:**
1. Tarkista Vercel build logs
2. Varmista että kaikki environment variables on lisätty
3. Redeploy

## 💡 Vinkit

### Kopioi-Liitä Oikein

1. **Älä kirjoita käsin** - Kopioi arvot tästä dokumentista
2. **Ei välilyöntejä** - Tarkista että ei ole välilyöntejä alussa/lopussa
3. **Ei lainausmerkkejä** - Vercel lisää ne automaattisesti
4. **VITE_ etuliite** - Kaikissa Firebase muuttujissa!

### Environment Valinta

Kun lisäät muuttujaa, valitse **KAIKKI**:
- ✅ Production
- ✅ Preview
- ✅ Development

### Tarkista Arvot

Vercel Dashboardissa, jokaisen muuttujan pitäisi näyttää:
- ✅ Arvo näkyy (ei "Empty")
- ✅ "All Environments" valittu
- ✅ Ei virheilmoituksia

## 🎯 Nopea Korjaus

Jos kaikki on sekaisin:

1. **Poista KAIKKI environment variables**
2. **Lisää ne UUDELLEEN yksi kerrallaan** tästä dokumentista
3. **Redeploy**

## 📞 Seuraavat Askeleet

Kun environment variables on oikein:

1. ✅ Redeploy
2. ✅ Testaa `/api/test`
3. ✅ Testaa `/api/buildings`
4. ✅ Testaa frontend
5. ✅ Kirjaudu admin-paneeliin

**Kaikki pitäisi toimia! 🚀**
