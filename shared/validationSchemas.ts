import { z } from 'zod';

// Admin Login Schema
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// User Creation Schema (KSYK Maps)
export const userCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  role: z.enum(['visitor', 'user', 'admin', 'owner']),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  passwordOption: z.enum(['manual', 'email']).optional()
});

// Ticket Creation Schema
export const ticketCreateSchema = z.object({
  type: z.enum(['bug', 'feature', 'support', 'error']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional()
});

// Announcement Creation Schema
export const announcementCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  titleEn: z.string().max(200).optional(),
  titleFi: z.string().max(200).optional(),
  content: z.string().min(1, 'Content is required').max(5000),
  contentEn: z.string().max(5000).optional(),
  contentFi: z.string().max(5000).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  expiresAt: z.string().optional()
});
