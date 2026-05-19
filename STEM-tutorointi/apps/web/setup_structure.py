#!/usr/bin/env python3
"""
Organize STEM-tutorointi directory structure
"""
import os
import shutil
from pathlib import Path

def create_dirs():
    """Create necessary directory structure"""
    dirs = [
        'app/api/auth/login',
        'app/api/auth/register',
        'app/api/auth/refresh',
        'app/api/auth/logout',
        'app/api/auth/session',
        'app/api/auth/verify',
        'app/login',
        'app/register',
        'app/dashboard',
        'app/providers',
        'app/onboarding',
        'app/admin',
        'app/classrooms',
        'app/ai',
        'app/analytics',
        'app/subscriptions',
        'app/account',
        'lib/auth',
        'lib/security',
        'lib/services',
        'components/auth',
        'components/ui',
        'components/forms',
        'components/dashboard',
        'hooks',
        'types',
        'utils',
        'styles',
        'src'
    ]
    
    for dir_name in dirs:
        Path(dir_name).mkdir(parents=True, exist_ok=True)
        print(f"✓ Created: {dir_name}")

def move_file(src, dst):
    """Move a file, creating parent directories if needed"""
    src_path = Path(src)
    dst_path = Path(dst)
    
    if src_path.exists():
        dst_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src_path), str(dst_path))
        print(f"✓ Moved: {src} → {dst}")
    else:
        print(f"✗ Not found: {src}")

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("\n📁 Creating directory structure...")
    create_dirs()
    
    print("\n📄 Organizing page files...")
    move_file('page.tsx', 'app/page.tsx')
    move_file('layout.tsx', 'app/layout.tsx')
    move_file('login_page.tsx', 'app/login/page.tsx')
    move_file('register_page.tsx', 'app/register/page.tsx')
    move_file('dashboard_page.tsx', 'app/dashboard/page.tsx')
    move_file('providers.tsx', 'lib/providers.tsx')
    move_file('serverSession.ts', 'lib/serverSession.ts')
    move_file('SignOutButton.tsx', 'components/auth/SignOutButton.tsx')
    
    print("\n🔌 Organizing API routes...")
    move_file('login_route.ts', 'app/api/auth/login/route.ts')
    move_file('register_route.ts', 'app/api/auth/register/route.ts')
    move_file('refresh_route.ts', 'app/api/auth/refresh/route.ts')
    move_file('logout_route.ts', 'app/api/auth/logout/route.ts')
    move_file('session_route.ts', 'app/api/auth/session/route.ts')
    move_file('verify_route.ts', 'app/api/auth/verify/route.ts')
    
    print("\n🔐 Organizing authentication files...")
    move_file('security.ts', 'lib/security/index.ts')
    move_file('authService.ts', 'lib/auth/service.ts')
    move_file('csrf.ts', 'lib/security/csrf.ts')
    move_file('rateLimiter.ts', 'lib/security/rateLimiter.ts')
    move_file('apiHandlers.ts', 'lib/auth/handlers.ts')
    move_file('authHelpers.ts', 'lib/auth/helpers.ts')
    move_file('prismaClient.ts', 'lib/prismaClient.ts')
    move_file('serverAuth.ts', 'lib/auth/serverAuth.ts')
    
    print("\n⚛️  Organizing React components...")
    move_file('AuthProvider.tsx', 'app/providers/AuthProvider.tsx')
    move_file('useAuth.tsx', 'hooks/useAuth.ts')
    
    print("\n🛡️  Setting up middleware...")
    move_file('middleware.ts', 'src/middleware.ts')
    
    print("\n🗑️  Cleaning up duplicate files...")
    Path('app_AuthProvider.tsx').unlink(missing_ok=True)
    Path('app_useAuth.ts').unlink(missing_ok=True)
    print("✓ Duplicates removed")
    
    print("\n✅ Setup complete!")

if __name__ == '__main__':
    main()
