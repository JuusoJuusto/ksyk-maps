#!/usr/bin/env python3
"""
STEM-tutorointi File Organization Script
This script reorganizes files to match Next.js 13+ app directory structure.
Run this in the apps/web directory.
"""

import os
import shutil
from pathlib import Path

def create_dir_if_not_exists(path):
    """Create directory if it doesn't exist."""
    Path(path).mkdir(parents=True, exist_ok=True)
    print(f"✓ Created/verified: {path}")

def move_or_copy_file(src, dst, verbose=True):
    """Move file, creating destination directory if needed."""
    src_path = Path(src)
    dst_path = Path(dst)
    
    if not src_path.exists():
        if verbose:
            print(f"⚠ Source not found: {src}")
        return False
    
    # Create destination directory
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Copy file
    shutil.copy2(src, dst)
    print(f"✓ Copied {src} → {dst}")
    
    # Optionally remove source
    # src_path.unlink()
    
    return True

def update_imports_in_file(file_path, replacements):
    """Update import paths in a file."""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        for old, new in replacements.items():
            if old in content:
                content = content.replace(old, new)
                print(f"  - Updated import in {file_path}")
        
        with open(file_path, 'w') as f:
            f.write(content)
    except Exception as e:
        print(f"⚠ Could not update {file_path}: {e}")

def main():
    """Main file organization function."""
    
    print("=" * 60)
    print("STEM-tutorointi File Organization Script")
    print("=" * 60)
    
    # Get current directory
    base_dir = Path.cwd()
    print(f"\nWorking directory: {base_dir}\n")
    
    # Step 1: Create directory structure
    print("📁 Creating directory structure...")
    dirs_to_create = [
        "app",
        "app/api",
        "app/api/auth",
        "app/api/auth/login",
        "app/api/auth/register",
        "app/api/auth/refresh",
        "app/api/auth/logout",
        "app/api/auth/session",
        "app/api/auth/verify",
        "app/dashboard",
        "app/login",
        "app/register",
        "lib",
        "components",
    ]
    
    for dir_name in dirs_to_create:
        create_dir_if_not_exists(dir_name)
    
    # Step 2: Move/copy page files
    print("\n📄 Organizing page files...")
    page_moves = [
        ("page.tsx", "app/page.tsx"),
        ("layout.tsx", "app/layout.tsx"),
        ("login_page.tsx", "app/login/page.tsx"),
        ("register_page.tsx", "app/register/page.tsx"),
        ("dashboard_page.tsx", "app/dashboard/page.tsx"),
    ]
    
    for src, dst in page_moves:
        move_or_copy_file(src, dst)
    
    # Step 3: Move API route files
    print("\n🔌 Organizing API routes...")
    api_moves = [
        ("login_route.ts", "app/api/auth/login/route.ts"),
        ("register_route.ts", "app/api/auth/register/route.ts"),
        ("refresh_route.ts", "app/api/auth/refresh/route.ts"),
        ("logout_route.ts", "app/api/auth/logout/route.ts"),
        ("session_route.ts", "app/api/auth/session/route.ts"),
        ("verify_route.ts", "app/api/auth/verify/route.ts"),
    ]
    
    for src, dst in api_moves:
        move_or_copy_file(src, dst)
    
    # Step 4: Move utility files
    print("\n🛠 Organizing utility files...")
    util_moves = [
        ("providers.tsx", "lib/providers.tsx"),
        ("serverSession.ts", "lib/serverSession.ts"),
        ("SignOutButton.tsx", "components/SignOutButton.tsx"),
    ]
    
    for src, dst in util_moves:
        move_or_copy_file(src, dst)
    
    # Step 5: Update imports in key files
    print("\n🔧 Updating import paths...")
    
    # Update app/layout.tsx imports
    if Path("app/layout.tsx").exists():
        print("  Updating app/layout.tsx...")
        update_imports_in_file("app/layout.tsx", {
            "from '../lib/providers'": "from '../lib/providers'",
        })
    
    # Update app/login/page.tsx imports
    if Path("app/login/page.tsx").exists():
        print("  Updating app/login/page.tsx...")
        update_imports_in_file("app/login/page.tsx", {
            "import useAuth from '../useAuth'": "import useAuth from '../../useAuth'",
        })
    
    # Update app/register/page.tsx imports
    if Path("app/register/page.tsx").exists():
        print("  Updating app/register/page.tsx...")
        update_imports_in_file("app/register/page.tsx", {
            "import useAuth from '../useAuth'": "import useAuth from '../../useAuth'",
        })
    
    # Update app/dashboard/page.tsx imports
    if Path("app/dashboard/page.tsx").exists():
        print("  Updating app/dashboard/page.tsx...")
        update_imports_in_file("app/dashboard/page.tsx", {
            "import SignOutButton from '../SignOutButton'": "import SignOutButton from '../../components/SignOutButton'",
            "import { getServerUser } from '../serverSession'": "import { getServerUser } from '../../lib/serverSession'",
        })
    
    # Update API route imports
    api_route_files = [
        "app/api/auth/login/route.ts",
        "app/api/auth/register/route.ts",
        "app/api/auth/refresh/route.ts",
        "app/api/auth/logout/route.ts",
        "app/api/auth/session/route.ts",
        "app/api/auth/verify/route.ts",
    ]
    
    for route_file in api_route_files:
        if Path(route_file).exists():
            print(f"  Updating {route_file}...")
            update_imports_in_file(route_file, {
                "from '../../../apiHandlers'": "from '../../../../apiHandlers'",
            })
    
    print("\n" + "=" * 60)
    print("✅ File organization complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. npm install bcryptjs jsonwebtoken @prisma/client zod")
    print("2. npx prisma generate")
    print("3. npx prisma migrate dev --name init")
    print("4. npm run dev")
    print("\nThen visit: http://localhost:3000")

if __name__ == "__main__":
    main()
