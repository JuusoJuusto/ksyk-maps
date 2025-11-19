# 📧 Sähköpostin Asetukset - KSYK Map

## Vaihtoehto 1: Käytä Olemassa Olevaa Gmail-tiliä (SUOSITELTU)

### Vaihe 1: Ota Käyttöön 2-Vaiheinen Tunnistautuminen

1. Mene osoitteeseen: https://myaccount.google.com/security
2. Etsi "2-Step Verification" / "Kaksivaiheinen vahvistus"
3. Klikkaa "Get Started" / "Aloita"
4. Seuraa ohjeita ottaaksesi sen käyttöön (tarvitset puhelinnumerosi)

### Vaihe 2: Luo App Password (Sovellussalasana)

1. Kun 2-vaiheinen tunnistautuminen on päällä, mene: https://myaccount.google.com/apppasswords
2. Valitse "Select app" → "Other (Custom name)"
3. Kirjoita nimi: **KSYK Map**
4. Klikkaa "Generate" / "Luo"
5. **KOPIOI 16-MERKKINEN SALASANA** (esim: `abcd efgh ijkl mnop`)
6. Poista välilyönnit: `abcdefghijklmnop`

### Vaihe 3: Lisää Tiedot .env Tiedostoon

Avaa `.env` tiedosto ja lisää nämä rivit:

```env
# Sähköpostin Asetukset
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=sinun-email@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

**Esimerkki:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=juuso.kaikula@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

### Vaihe 4: Käynnistä Palvelin Uudelleen

Palvelin lukee uudet asetukset ja sähköpostit toimivat!

---

## Vaihtoehto 2: Luo Uusi Gmail-tili (Jos Haluat Erillisen)

### Vaihe 1: Luo Uusi Gmail

1. Mene: https://accounts.google.com/signup
2. Täytä tiedot:
   - **Nimi:** KSYK Map Admin
   - **Käyttäjänimi:** Esim: `ksykmap.admin@gmail.com`
   - **Salasana:** Vahva salasana
3. Vahvista puhelinnumerolla
4. Hyväksy ehdot

### Vaihe 2: Ota Käyttöön 2-Vaiheinen Tunnistautuminen

(Samat ohjeet kuin Vaihtoehto 1, Vaihe 1)

### Vaihe 3: Luo App Password

(Samat ohjeet kuin Vaihtoehto 1, Vaihe 2)

### Vaihe 4: Lisää .env Tiedostoon

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=ksykmap.admin@gmail.com
EMAIL_PASSWORD=abcdefghijklmnop
```

---

## 🧪 Testaa Sähköpostit

1. Kirjaudu sisään omistajana: `JuusoJuusto112@gmail.com`
2. Mene "Users" välilehdelle
3. Klikkaa "Add User"
4. Täytä tiedot:
   - First Name: **Testi**
   - Last Name: **Käyttäjä**
   - Email: **oma-email@gmail.com** (käytä omaa sähköpostia!)
   - Role: **Admin**
5. Valitse: **"Send email invitation"**
6. Klikkaa "Create User"
7. **Tarkista sähköpostisi!** Saat kauniin viestin salasanalla

---

## ❓ Ongelmanratkaisu

### "Email credentials not configured"
- Tarkista että `.env` tiedostossa on kaikki 4 riviä
- Varmista että ei ole kirjoitusvirheitä
- Käynnistä palvelin uudelleen

### "Invalid login"
- Varmista että käytät **App Password**, ei tavallista salasanaa
- Poista kaikki välilyönnit App Passwordista
- Tarkista että 2-vaiheinen tunnistautuminen on päällä

### "Connection timeout"
- Tarkista internet-yhteys
- Kokeile porttia 465 (muuta `EMAIL_PORT=465`)
- Varmista että palomuuri ei estä yhteyttä

### Sähköposti ei tule perille
- Tarkista roskaposti/spam kansio
- Varmista että sähköpostiosoite on oikein
- Katso palvelimen konsolista virheviestit

---

## 🎯 Suositukset

### Kehitykseen (Development):
- **Käytä olemassa olevaa Gmail-tiliäsi**
- Nopea ja helppo setup
- Ei tarvitse uutta tiliä

### Tuotantoon (Production):
- **Luo erillinen Gmail-tili** (esim: `ksykmap.admin@gmail.com`)
- Ammattimaisempi
- Helpompi hallita
- Voit antaa muille pääsyn tarvittaessa

---

## 📝 Turvallisuusvinkit

1. **ÄLÄ jaa App Passwordia kenellekään**
2. **ÄLÄ laita App Passwordia GitHubiin** (`.env` on jo `.gitignore` tiedostossa)
3. **Vaihda App Password säännöllisesti**
4. **Käytä vahvaa salasanaa Gmail-tilillesi**
5. **Pidä 2-vaiheinen tunnistautuminen päällä**

---

## ✅ Valmis!

Kun olet lisännyt tiedot `.env` tiedostoon ja käynnistänyt palvelimen uudelleen:

1. Sähköpostit lähetetään automaattisesti
2. Käyttäjät saavat kauniin HTML-viestin
3. Viesti sisältää väliaikaisen salasanan
4. Käyttäjät voivat kirjautua heti sisään

**Onnea! 🎉**
