# 🌐 KSYK Maps - Oma URL "ksykmaps" Ohje

## Vaihtoehdot Omalle URL:lle

### Vaihtoehto 1: Cloudflare Tunnel + Oma Domain (SUOSITELTU)
**Hinta:** Ilmainen (jos sinulla on domain)
**URL:** `ksykmaps.sinundomain.fi` tai `ksykmaps.com`

### Vaihtoehto 2: Vercel Deployment
**Hinta:** Ilmainen
**URL:** `ksykmaps.vercel.app` (ilmainen) tai oma domain

### Vaihtoehto 3: Railway
**Hinta:** 5€/kk ilmainen krediitti
**URL:** `ksykmaps.up.railway.app` tai oma domain

---

## 🎯 HELPOIN: Vercel (5 minuuttia)

### Vaihe 1: Luo Vercel Tili
1. Mene: https://vercel.com
2. Klikkaa "Sign Up"
3. Kirjaudu GitHub-tilillä

### Vaihe 2: Deploy Projekti
1. Klikkaa "New Project"
2. Valitse "Import Git Repository"
3. Valitse KSYK-Map projekti
4. Klikkaa "Deploy"

### Vaihe 3: Lisää Environment Variables
1. Mene Settings → Environment Variables
2. Lisää kaikki `.env` tiedoston muuttujat:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_PROJECT_ID=...
   DATABASE_URL=...
   SESSION_SECRET=...
   ```
3. Klikkaa "Save"

### Vaihe 4: Redeploy
1. Mene Deployments
2. Klikkaa "Redeploy"

### Vaihe 5: Vaihda URL
1. Mene Settings → Domains
2. Klikkaa "Edit" projektin nimen vieressä
3. Vaihda nimeksi: `ksykmaps`
4. Tallenna

**Valmis! URL on nyt:** `https://ksykmaps.vercel.app`

---

## 🔥 PARAS: Cloudflare Tunnel + Oma Domain

### Mitä Tarvitset:
- Cloudflare tili (ilmainen)
- Domain nimi (esim. `sinundomain.fi`)
  - Voit ostaa: Namecheap, GoDaddy, Cloudflare
  - Tai käyttää ilmaista: Freenom, eu.org

### Vaihe 1: Luo Cloudflare Tili
1. Mene: https://dash.cloudflare.com/sign-up
2. Luo ilmainen tili
3. Lisää domain (tai osta Cloudflaresta)

### Vaihe 2: Kirjaudu Cloudflared
```bash
cloudflared tunnel login
```
- Avautuu selain
- Valitse domain
- Hyväksy

### Vaihe 3: Luo Nimetty Tunnel
```bash
cloudflared tunnel create ksykmaps
```
- Tallenna Tunnel ID (näkyy outputissa)

### Vaihe 4: Konfiguroi DNS
```bash
cloudflared tunnel route dns ksykmaps ksykmaps.sinundomain.fi
```
Vaihda `sinundomain.fi` omaan domainiisi!

### Vaihe 5: Luo Config Tiedosto
Luo tiedosto: `C:\Users\JuusoKaikula\.cloudflared\config.yml`

```yaml
tunnel: ksykmaps
credentials-file: C:\Users\JuusoKaikula\.cloudflared\TUNNEL-ID.json

ingress:
  - hostname: ksykmaps.sinundomain.fi
    service: http://localhost:3000
  - service: http_status:404
```

Vaihda:
- `TUNNEL-ID` → Vaiheessa 3 saamasi ID
- `sinundomain.fi` → Oma domainisi

### Vaihe 6: Käynnistä Tunnel
```bash
cloudflared tunnel run ksykmaps
```

**Valmis! URL on nyt:** `https://ksykmaps.sinundomain.fi`

---

## 💰 ILMAINEN DOMAIN

### Vaihtoehto 1: eu.org (Ilmainen, Hyvä)
1. Mene: https://nic.eu.org
2. Rekisteröi: `ksykmaps.eu.org`
3. Lisää Cloudflareen
4. Käytä yllä olevia ohjeita

### Vaihtoehto 2: Freenom (Ilmainen)
1. Mene: https://freenom.com
2. Etsi: `ksykmaps.tk` tai `.ml` tai `.ga`
3. Rekisteröi ilmaiseksi
4. Lisää Cloudflareen

### Vaihtoehto 3: Osta Domain
**Suositellut:**
- Namecheap: ~10€/vuosi
- Cloudflare: ~8€/vuosi
- GoDaddy: ~12€/vuosi

**Suositellut päätteet:**
- `.fi` - Suomalainen (15€/v)
- `.com` - Kansainvälinen (10€/v)
- `.app` - Sovelluksille (12€/v)
- `.io` - Tech-projekteille (30€/v)

---

## 🎯 NOPEA RATKAISU: Vercel Subdomain

Jos et halua ostaa domainia:

1. Deploy Verceliin (yllä olevat ohjeet)
2. URL: `ksykmaps.vercel.app`
3. Ilmainen, nopea, toimii heti!

**Plussat:**
- ✅ Täysin ilmainen
- ✅ Nopea (CDN)
- ✅ HTTPS automaattisesti
- ✅ Ei tarvitse domainia

**Miinukset:**
- ❌ URL päättyy `.vercel.app`
- ❌ Ei voi muuttaa "vercel.app" osaa

---

## 📊 Vertailu

| Vaihtoehto | Hinta | URL | Nopeus | Vaikeus |
|------------|-------|-----|--------|---------|
| Vercel | Ilmainen | ksykmaps.vercel.app | ⭐⭐⭐⭐⭐ | Helppo |
| Cloudflare + eu.org | Ilmainen | ksykmaps.eu.org | ⭐⭐⭐⭐ | Keskivaikea |
| Cloudflare + .fi | 15€/v | ksykmaps.fi | ⭐⭐⭐⭐ | Keskivaikea |
| Railway | 5€/kk | ksykmaps.up.railway.app | ⭐⭐⭐⭐ | Helppo |

---

## 🚀 Suositus

### Jos Haluat Nopeasti:
→ **Vercel** (`ksykmaps.vercel.app`)

### Jos Haluat Ilmaisen Oman Domainin:
→ **Cloudflare + eu.org** (`ksykmaps.eu.org`)

### Jos Haluat Ammattimaisen:
→ **Osta .fi domain + Cloudflare** (`ksykmaps.fi`)

---

## ❓ Kysymyksiä?

**"Kumpi on parempi, Vercel vai Cloudflare?"**
- Vercel: Helpompi, nopeampi setup
- Cloudflare: Enemmän kontrollia, parempi pitkällä aikavälillä

**"Tarvitsenko oikeasti domainin?"**
- Ei! `ksykmaps.vercel.app` toimii täydellisesti

**"Voiko URL:n vaihtaa myöhemmin?"**
- Kyllä! Voit aina lisätä oman domainin myöhemmin

**"Onko ilmainen domain turvallinen?"**
- Kyllä, mutta ammattimaista varten suosittelen ostamaan

---

## 📝 Seuraavat Askeleet

1. ✅ Valitse vaihtoehto (suositus: Vercel)
2. ✅ Seuraa ohjeita
3. ✅ Testaa URL
4. ✅ Jaa muille!

**Onnea! 🎉**
