# ⚡ KSYK Maps - Nopea Ohje

## 🎯 Haluan: "ksykmaps" URL + 24/7 Käynti

### HELPOIN TAPA (5 minuuttia):

## 1️⃣ Vercel Deployment

### Vaihe 1: Luo GitHub Repo
```bash
git init
git add .
git commit -m "KSYK Maps"
git branch -M main
git remote add origin https://github.com/SINUN-KÄYTTÄJÄ/ksyk-maps.git
git push -u origin main
```

### Vaihe 2: Deploy Verceliin
1. Mene: **https://vercel.com**
2. Kirjaudu GitHub-tilillä
3. Klikkaa **"New Project"**
4. Valitse **ksyk-maps** repo
5. Klikkaa **"Deploy"**

### Vaihe 3: Lisää Environment Variables
Settings → Environment Variables → Lisää:
```
VITE_FIREBASE_API_KEY=sinun_avain
VITE_FIREBASE_PROJECT_ID=sinun_projekti
DATABASE_URL=sinun_tietokanta
SESSION_SECRET=satunnainen_salaisuus
```

### Vaihe 4: Vaihda URL
Settings → Domains → Edit → Vaihda: **ksykmaps**

**VALMIS!** 🎉

URL: `https://ksykmaps.vercel.app`

---

## 2️⃣ Oma Domain (Valinnainen)

### Jos Haluat: ksykmaps.fi

#### Vaihtoehto A: Osta Domain
1. Mene: **Namecheap.com** tai **Cloudflare.com**
2. Etsi: `ksykmaps.fi` tai `ksykmaps.com`
3. Osta (~10€/vuosi)

#### Vaihtoehto B: Ilmainen Domain
1. Mene: **nic.eu.org**
2. Rekisteröi: `ksykmaps.eu.org`
3. Ilmainen!

#### Lisää Verceliin:
1. Vercel → Settings → Domains
2. Lisää: `ksykmaps.fi` (tai `.eu.org`)
3. Päivitä DNS asetukset (Vercel näyttää ohjeet)

**VALMIS!** URL: `https://ksykmaps.fi`

---

## 📊 Mitä Saat:

✅ **24/7 käynnissä** - Ei tarvitse pitää konetta päällä
✅ **Nopea** - Cloudflare CDN
✅ **HTTPS** - Automaattinen SSL
✅ **Ilmainen** - Ei kuukausimaksuja
✅ **Automaattiset päivitykset** - Push GitHubiin → Päivittyy automaattisesti

---

## 🔄 Päivitykset

Kun teet muutoksia:
```bash
git add .
git commit -m "Päivitys"
git push
```
→ Vercel päivittää automaattisesti!

---

## 🆘 Ongelmat?

### "Build failed"
- Tarkista Environment Variables
- Katso build logs Vercelissä

### "Firebase error"
- Tarkista Firebase credentials
- Varmista että kaikki muuttujat on lisätty

### "Domain ei toimi"
- Odota 24h DNS päivitystä
- Tarkista DNS asetukset

---

## 💡 Vaihtoehdot

### Jos Vercel Ei Toimi:

**Railway:**
1. Mene: railway.app
2. Deploy from GitHub
3. Lisää PostgreSQL
4. URL: `ksykmaps.up.railway.app`
5. Hinta: 5€/kk (5€ ilmainen krediitti)

**Render:**
1. Mene: render.com
2. Deploy from GitHub
3. Ilmainen (hitaampi)
4. URL: `ksykmaps.onrender.com`

---

## 📱 Jaa Muille

**Main App:**
```
https://ksykmaps.vercel.app
```

**Admin:**
```
https://ksykmaps.vercel.app/admin-login
Email: JuusoJuusto112@gmail.com
Password: Juusto2012!
```

---

## 🎯 Yhteenveto

1. ✅ Push GitHubiin
2. ✅ Deploy Verceliin
3. ✅ Lisää env variables
4. ✅ Vaihda URL: ksykmaps
5. ✅ (Valinnainen) Lisää oma domain

**Aika: 5-10 minuuttia**
**Hinta: Ilmainen**
**Tulos: 24/7 käynnissä oleva ksykmaps.vercel.app**

---

## 📚 Lisätietoja

- **Yksityiskohtaiset ohjeet:** `24-7-KAYNTI-OHJE.md`
- **Domain ohjeet:** `KSYKMAPS-URL-OHJE.md`
- **Cloudflare setup:** `CLOUDFLARE-SETUP.md`

**Onnea! 🚀**
