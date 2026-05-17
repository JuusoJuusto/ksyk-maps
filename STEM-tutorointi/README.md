# 🚀 STEM Genius - AI-Powered Learning Platform

> **A next-generation AI learning ecosystem combining ChatGPT intelligence, Duolingo gamification, and premium App Store UX**

[![Production Ready](https://img.shields.io/badge/Production-Ready-success)](/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](/)
[![React](https://img.shields.io/badge/React-18-blue)](/)
[![License](https://img.shields.io/badge/License-MIT-green)](/)

---

## ✨ What is STEM Genius?

STEM Genius is a **production-ready AI learning platform** that makes STEM education:
- 🤖 **Intelligent** - AI-powered personalization and tutoring
- 🎮 **Addictive** - Gamification with leagues, achievements, and streaks
- 💎 **Premium** - App Store-quality design and UX
- 📱 **Mobile-First** - Touch-optimized, installable PWA
- 🚀 **Scalable** - Enterprise-grade architecture

---

## 🎯 Key Features

### 🤖 AI-Powered Learning
- **Real-time AI Tutor** with streaming responses
- **Adaptive Task Generation** based on skill level
- **Intelligent Hints** that guide without giving answers
- **Personalized Explanations** tailored to learning style
- **Context-Aware Conversations** that remember your progress

### 🎮 Gamification System
- **6-Tier League System** (Bronze → Master)
- **Achievement System** with 4 rarity levels
- **Daily Quests** for consistent engagement
- **Streak System** with freeze mechanics
- **XP & Leveling** with visual progress
- **Leaderboards** (global, friends, school, class)

### 📊 Analytics & Progress
- **Activity Heatmap** (GitHub-style)
- **Knowledge Graph** visualization
- **Progress Dashboard** with insights
- **Mastery Tracking** per topic
- **Study Time Analytics**
- **Weak Topic Identification**

### 💎 Premium UX
- **Subject-Based Colors** (Math, Physics, Chemistry, etc.)
- **Smooth Animations** (Framer Motion)
- **Dark/Light Mode** with system preference
- **Loading States** for every interaction
- **Empty States** that guide users
- **Error Boundaries** for graceful failures

### 📱 Mobile Experience
- **Touch-First Design** (44x44px tap targets)
- **Bottom Navigation** for easy reach
- **Swipe Interactions** ready
- **PWA Support** (installable app)
- **Offline Ready** architecture
- **Safe Area Support** (iPhone notch)

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS
- **Framer Motion** - Animations
- **Zustand** - Client state management
- **TanStack Query** - Server state management
- **shadcn/ui** - Component library

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Primary database
- **OpenAI API** - AI intelligence
- **Edge Runtime** - Optimal performance

### DevOps
- **Vercel** - Hosting & deployment
- **GitHub Actions** - CI/CD
- **Prisma Migrate** - Database migrations
- **TypeScript** - Build-time type checking

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/stem-genius.git
cd stem-genius/apps/web

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Seed demo data (optional)
npm run seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` 🎉

---

## 📁 Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── onboarding/        # Onboarding flow
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── ai/               # AI tutor components
│   │   ├── analytics/        # Analytics components
│   │   ├── gamification/     # Gamification components
│   │   ├── layouts/          # Layout components
│   │   ├── tasks/            # Task components
│   │   └── ui/               # UI primitives
│   ├── lib/                   # Utilities
│   │   ├── hooks/            # React Query hooks
│   │   ├── providers/        # Context providers
│   │   ├── store/            # Zustand stores
│   │   ├── api-client.ts     # Type-safe API client
│   │   └── prisma.ts         # Prisma client
│   ├── services/              # Business logic
│   │   ├── ai.service.ts     # AI service
│   │   ├── auth.service.ts   # Auth service
│   │   └── ...
│   └── config/                # Configuration
│       ├── constants.ts      # App constants
│       └── design-system.ts  # Design tokens
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed data
├── public/                    # Static assets
└── package.json
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# OpenAI
OPENAI_API_KEY="sk-..."

# Next.js
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Analytics
NEXT_PUBLIC_GA_ID="G-..."
```

### Database Setup

```bash
# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

---

## 📚 API Documentation

### User APIs
- `GET /api/user/profile` - Get user profile
- `PATCH /api/user/profile` - Update profile
- `GET /api/user/stats` - Get user stats
- `GET /api/user/daily-progress` - Get daily progress

### Task APIs
- `GET /api/tasks` - List tasks
- `POST /api/tasks/generate` - Generate AI task
- `POST /api/tasks/:id/submit` - Submit answer
- `GET /api/tasks/:id/hint` - Get hint

### AI APIs
- `POST /api/ai/chat` - Send message
- `POST /api/ai/stream` - Streaming chat
- `GET /api/ai/conversations` - List conversations

### Gamification APIs
- `GET /api/gamification/achievements` - Get achievements
- `GET /api/gamification/daily-quests` - Get daily quests
- `POST /api/gamification/daily-quests/:id/complete` - Complete quest

### Analytics APIs
- `GET /api/analytics/progress` - Get progress
- `GET /api/analytics/leaderboard` - Get leaderboard
- `GET /api/analytics/knowledge-graph` - Get knowledge graph

---

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

### Other Platforms
See [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) for:
- AWS Amplify
- Railway
- Docker + Any Cloud

---

## 📊 Performance

### Lighthouse Scores (Target)
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Core Web Vitals
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **OpenAI** - AI intelligence
- **Vercel** - Hosting & deployment
- **Prisma** - Database ORM
- **shadcn/ui** - Component library
- **Framer Motion** - Animations

---

## 📞 Support

- **Documentation**: [docs.stemgenius.com](https://docs.stemgenius.com)
- **Email**: support@stemgenius.com
- **Discord**: [discord.gg/stemgenius](https://discord.gg/stemgenius)
- **GitHub Issues**: [github.com/your-org/stem-genius/issues](https://github.com/your-org/stem-genius/issues)

---

## 🗺️ Roadmap

### Phase 1: MVP ✅ (Current)
- [x] Core learning platform
- [x] AI tutor
- [x] Gamification
- [x] Analytics
- [x] Mobile-first design

### Phase 2: Social (Q3 2026)
- [ ] Friend system
- [ ] Study groups
- [ ] Collaborative learning
- [ ] Social leaderboards

### Phase 3: Advanced (Q4 2026)
- [ ] Live classes
- [ ] Teacher dashboard
- [ ] Parent portal
- [ ] School integration

### Phase 4: Scale (2027)
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Native apps (iOS/Android)
- [ ] Enterprise features

---

## 📈 Stats

- **Lines of Code**: 50,000+
- **Components**: 100+
- **API Routes**: 15+
- **Database Models**: 20+
- **Test Coverage**: 80%+ (target)

---

## 🎉 Status

**STEM Genius is PRODUCTION-READY and ready to scale to thousands of users!**

Built with ❤️ by the STEM Genius Team

---

**[Get Started](./GETTING-STARTED.md)** | **[Deploy](./DEPLOYMENT-GUIDE.md)** | **[Contribute](./CONTRIBUTING.md)**
