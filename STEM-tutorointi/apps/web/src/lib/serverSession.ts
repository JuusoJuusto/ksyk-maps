import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface ServerUser {
  id: string;
  email: string;
  name: string | null;
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, JWT_SECRET) as ServerUser;
    return decoded;
  } catch (error) {
    console.error('Server session error:', error);
    return null;
  }
}

export async function requireServerUser(): Promise<ServerUser> {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
