# 🚀 FUTURE: Wilma as Standalone Website

## Overview
Currently Wilma is integrated within KSYK Maps. Future plan is to make it a completely separate, standalone website.

## Why Separate?
- **Better Performance**: Dedicated resources for Wilma
- **Cleaner URLs**: wilma.ksyk.fi instead of ksykmaps.fi/wilma
- **Independent Scaling**: Scale Wilma separately from maps
- **Easier Maintenance**: Separate codebases
- **Professional Look**: Dedicated domain and branding

## Implementation Plan

### Phase 1: Preparation
- [ ] Audit all Wilma components and dependencies
- [ ] Identify shared code that needs to be duplicated
- [ ] Plan database migration strategy
- [ ] Design new URL structure

### Phase 2: New Repository
- [ ] Create new repository: `wilma-ksyk`
- [ ] Set up separate Vite/React project
- [ ] Copy all Wilma components
- [ ] Remove KSYK Maps dependencies
- [ ] Set up separate Firebase project (optional)

### Phase 3: Backend Separation
- [ ] Create separate API endpoints
- [ ] Migrate Wilma-specific database tables
- [ ] Set up authentication separately
- [ ] Configure CORS for new domain

### Phase 4: Deployment
- [ ] Set up wilma.ksyk.fi subdomain
- [ ] Deploy to separate Vercel project
- [ ] Configure DNS records
- [ ] Set up SSL certificates
- [ ] Test all functionality

### Phase 5: Migration
- [ ] Migrate existing users
- [ ] Update all links
- [ ] Set up redirects from old URLs
- [ ] Communicate changes to users
- [ ] Monitor for issues

### Phase 6: Optimization
- [ ] Remove unused code
- [ ] Optimize bundle size
- [ ] Improve loading times
- [ ] Add PWA features
- [ ] Mobile app preparation

## Technical Details

### New Structure
```
wilma-ksyk/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── login.tsx
│   │   │   ├── student.tsx
│   │   │   ├── teacher.tsx
│   │   │   ├── parent.tsx
│   │   │   └── admin.tsx
│   │   ├── components/
│   │   └── lib/
│   └── public/
├── server/
│   ├── routes/
│   ├── auth/
│   └── database/
└── shared/
```

### URL Structure
- **Login**: wilma.ksyk.fi
- **Student**: wilma.ksyk.fi/student/:id
- **Teacher**: wilma.ksyk.fi/teacher/:id
- **Parent**: wilma.ksyk.fi/parent/:id
- **Admin**: wilma.ksyk.fi/admin/:id

### Benefits
- ✅ Faster load times
- ✅ Better SEO
- ✅ Professional appearance
- ✅ Easier to maintain
- ✅ Independent scaling
- ✅ Cleaner codebase

## Timeline
- **Estimated Time**: 2-3 weeks
- **Priority**: FUTURE (after current features complete)
- **Dependencies**: None (can be done anytime)

## Notes
- Keep KSYK Maps link to Wilma for easy access
- Maintain single sign-on if possible
- Consider shared user database vs separate
- Plan for data migration carefully
- Test thoroughly before switching

---

**Status**: 📋 PLANNED FOR FUTURE
**Added**: April 26, 2026
