#!/bin/bash

# Create directories
mkdir -p app/api/auth/{login,register,refresh,logout,session,verify}
mkdir -p app/{login,register,dashboard}
mkdir -p lib components

# Move/copy pages
mv page.tsx app/page.tsx 2>/dev/null || cp page.tsx app/page.tsx
mv layout.tsx app/layout.tsx 2>/dev/null || cp layout.tsx app/layout.tsx
mv login_page.tsx app/login/page.tsx 2>/dev/null || cp login_page.tsx app/login/page.tsx
mv register_page.tsx app/register/page.tsx 2>/dev/null || cp register_page.tsx app/register/page.tsx
mv dashboard_page.tsx app/dashboard/page.tsx 2>/dev/null || cp dashboard_page.tsx app/dashboard/page.tsx

# Move API routes
mv login_route.ts app/api/auth/login/route.ts 2>/dev/null || cp login_route.ts app/api/auth/login/route.ts
mv register_route.ts app/api/auth/register/route.ts 2>/dev/null || cp register_route.ts app/api/auth/register/route.ts
mv refresh_route.ts app/api/auth/refresh/route.ts 2>/dev/null || cp refresh_route.ts app/api/auth/refresh/route.ts
mv logout_route.ts app/api/auth/logout/route.ts 2>/dev/null || cp logout_route.ts app/api/auth/logout/route.ts
mv session_route.ts app/api/auth/session/route.ts 2>/dev/null || cp session_route.ts app/api/auth/session/route.ts
mv verify_route.ts app/api/auth/verify/route.ts 2>/dev/null || cp verify_route.ts app/api/auth/verify/route.ts

# Move lib files
mv providers.tsx lib/providers.tsx 2>/dev/null || cp providers.tsx lib/providers.tsx
mv serverSession.ts lib/serverSession.ts 2>/dev/null || cp serverSession.ts lib/serverSession.ts

# Move components
mv SignOutButton.tsx components/SignOutButton.tsx 2>/dev/null || cp SignOutButton.tsx components/SignOutButton.tsx

echo "File reorganization complete!"
ls -la app/
ls -la lib/
ls -la components/
