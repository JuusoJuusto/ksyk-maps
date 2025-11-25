# 🚀 KSYK Maps - Parannukset TODO

## ✅ Tehty

### 1. **Rakennukset Poistettu** 🏢
- ✅ Firebase tyhjennetty
- ✅ Käyttäjä luo rakennukset KSYK Builderilla
- ✅ Ei enää automaattista seedausta

## 📋 Tehtävä

### 1. **Kartta Optimointi** 🗺️

**Ongelma:**
- Kartta ei täytä koko ruutua
- Grid ei ole koko kartan kokoinen

**Ratkaisu:**
- Muuta InteractiveCampusMap.tsx
- Tee kartasta full-screen
- Grid koko kartan kokoiseksi
- Zoom ja pan toiminnot

### 2. **Mobiili Optimointi** 📱

**Ongelma:**
- Ei optimoitu mobiilille
- Sidebar vie tilaa

**Ratkaisu:**
- Responsive design
- Collapsible sidebar
- Touch-friendly controls
- Mobile-first approach

### 3. **Sidebar Collapsible** 📂

**Ongelma:**
- Sidebar aina auki
- Vie tilaa kartalta

**Ratkaisu:**
- Lisää toggle button
- Tallenna tila localStorage
- Animaatio avautumiselle
- Mobile: default closed

### 4. **Email Invitation** 📧

**Ongelma:**
- Email kutsu ei toimi
- Nodemailer konfiguroitu mutta ei käytössä

**Ratkaisu:**
- Lisää API endpoint: POST /api/users/invite
- Lähetä kutsu email
- Generoi temp password
- Lähetä login link

### 5. **UI/UX Parannukset** ✨

**Tehtävä:**
- Paremmat värit
- Modernimpi design
- Smooth animations
- Loading states
- Error handling
- Success messages

## 🎯 Prioriteetti

### High Priority (Tee Ensin)
1. ✅ Poista rakennukset
2. 🔄 Kartta full-screen
3. 🔄 Sidebar collapsible
4. 🔄 Mobiili optimointi

### Medium Priority
5. Email invitation
6. UI/UX parannukset

### Low Priority
7. Advanced features
8. Analytics
9. Performance optimization

## 📝 Yksityiskohtaiset Tehtävät

### Kartta Optimointi

**Tiedostot:**
- `client/src/components/InteractiveCampusMap.tsx`
- `client/src/pages/home.tsx`

**Muutokset:**
```typescript
// Full-screen kartta
<div className="h-screen w-screen">
  <InteractiveCampusMap />
</div>

// Grid koko kartan kokoiseksi
const gridSize = { width: window.innerWidth, height: window.innerHeight };
```

### Sidebar Collapsible

**Tiedostot:**
- `client/src/components/InteractiveCampusMap.tsx`

**Muutokset:**
```typescript
const [sidebarOpen, setSidebarOpen] = useState(
  window.innerWidth > 768 ? true : false
);

// Toggle button
<button onClick={() => setSidebarOpen(!sidebarOpen)}>
  {sidebarOpen ? <ChevronLeft /> : <ChevronRight />}
</button>

// Sidebar with animation
<div className={`transition-all ${sidebarOpen ? 'w-80' : 'w-0'}`}>
  {/* Sidebar content */}
</div>
```

### Mobiili Optimointi

**Tiedostot:**
- `client/src/components/InteractiveCampusMap.tsx`
- `client/src/components/Header.tsx`
- `client/src/pages/home.tsx`

**Muutokset:**
```css
/* Mobile-first CSS */
@media (max-width: 768px) {
  .sidebar { display: none; }
  .map { width: 100%; }
  .controls { bottom: 20px; }
}
```

### Email Invitation

**Tiedostot:**
- `api/index.ts` - Lisää endpoint
- `server/emailService.ts` - Käytä olemassa olevaa
- `client/src/components/AdminDashboard.tsx` - UI

**Muutokset:**
```typescript
// API endpoint
POST /api/users/invite
{
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
  role: "user"
}

// Lähettää emailin:
Subject: "Invitation to KSYK Maps"
Body: "Click here to set your password: https://ksykmaps.vercel.app/set-password?token=..."
```

## 🔧 Tekninen Toteutus

### 1. Kartta Full-Screen

```typescript
// client/src/pages/home.tsx
export default function Home() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Header />
      <div className="h-[calc(100vh-64px)]">
        <InteractiveCampusMap />
      </div>
    </div>
  );
}
```

### 2. Collapsible Sidebar

```typescript
// client/src/components/InteractiveCampusMap.tsx
const [sidebarOpen, setSidebarOpen] = useState(() => {
  const saved = localStorage.getItem('sidebarOpen');
  return saved ? JSON.parse(saved) : window.innerWidth > 768;
});

useEffect(() => {
  localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
}, [sidebarOpen]);
```

### 3. Email Invitation

```typescript
// api/index.ts
if (apiPath === '/users/invite' && req.method === 'POST') {
  const { email, firstName, lastName, role } = req.body;
  
  // Generate temp password
  const tempPassword = generateTempPassword();
  
  // Create user
  const user = await storage.upsertUser({
    email,
    firstName,
    lastName,
    role,
    isTemporaryPassword: true
  });
  
  // Send email
  await sendPasswordSetupEmail(email, tempPassword);
  
  return res.status(201).json({ success: true, user });
}
```

## 📊 Edistyminen

- [x] Rakennukset poistettu
- [ ] Kartta full-screen
- [ ] Sidebar collapsible
- [ ] Mobiili optimointi
- [ ] Email invitation
- [ ] UI/UX parannukset

## 🎉 Kun Kaikki Valmis

Sovellus on:
- ✅ Täysin responsiivinen
- ✅ Mobiiliystävällinen
- ✅ Optimoitu suorituskyky
- ✅ Email kutsut toimivat
- ✅ Moderni UI/UX
- ✅ Smooth animations

**Valmis tuotantoon! 🚀**
