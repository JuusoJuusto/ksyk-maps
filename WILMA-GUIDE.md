# Wilma Login System Guide

## Overview
The Wilma system is a student information system integrated into KSYK Maps. It provides authentication and role-based access for teachers, students, parents, and administrators.

## Features
- ✅ Secure login with username/password
- ✅ Role-based access (Teacher, Student, Parent, Admin)
- ✅ Multi-language support (Finnish/English)
- ✅ Session persistence with localStorage
- ✅ Professional Wilma-style interface
- ✅ Admin panel for user management

## Quick Start

### 1. Seed Demo Users
Run this command to create demo Wilma users:
```bash
npm run seed:wilma
```

This creates 4 demo users:
- **Teacher**: username=`teacher1`, password=`password123`
- **Student**: username=`student1`, password=`password123`
- **Parent**: username=`parent1`, password=`password123`
- **Admin**: username=`admin1`, password=`password123`

### 2. Access Wilma
Navigate to: `http://localhost:5000/wilma`

### 3. Login
Use any of the demo credentials above to login.

## Admin Panel - User Management

### Creating Wilma Users
1. Login to KSYK Maps admin panel (`/admin-login`)
2. Go to the **Wilma** tab
3. Click **Add Wilma User**
4. Fill in the form:
   - Username (required)
   - Password (required)
   - First Name (required)
   - Last Name (required)
   - Email (optional)
   - Role (teacher/student/parent/admin)
   - Student Class (for students only)
5. Click **Create User**

### Managing Users
- **Edit**: Click the edit icon to modify user details
- **Delete**: Click the trash icon to remove a user
- **View Stats**: See total users by role in the dashboard

## User Roles

### Teacher
- Access to all teaching materials
- Can view student information
- Can manage grades and assignments

### Student
- Access to personal schedule
- View grades and assignments
- Access to messages

### Parent
- View child's information
- Access to grades and attendance
- Communication with teachers

### Admin
- Full system access
- User management
- System configuration

## API Endpoints

### Login
```
POST /api/wilma/login
Body: { username: string, password: string }
Response: User object (without password)
```

### Get All Users (Admin only)
```
GET /api/wilma/users
Response: Array of Wilma users
```

### Create User (Admin only)
```
POST /api/wilma/users
Body: { username, password, firstName, lastName, email, role, studentClass }
Response: Created user object
```

### Update User (Admin only)
```
PUT /api/wilma/users/:id
Body: User fields to update
Response: Updated user object
```

### Delete User (Admin only)
```
DELETE /api/wilma/users/:id
Response: 204 No Content
```

## Database Schema

### wilmaUsers Collection (Firebase)
```typescript
{
  id: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: 'teacher' | 'student' | 'parent' | 'admin';
  studentClass?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Passwords**: Currently stored in plain text. In production, implement proper password hashing (bcrypt, argon2, etc.)
2. **Session Management**: Uses localStorage. Consider implementing JWT tokens or server-side sessions for production
3. **HTTPS**: Always use HTTPS in production
4. **Rate Limiting**: Implement rate limiting on login endpoint
5. **Password Policy**: Enforce strong password requirements

## Troubleshooting

### Login Not Working
1. Check if Wilma users exist in Firebase (`wilmaUsers` collection)
2. Verify credentials are correct
3. Check browser console for errors
4. Ensure `/api/wilma/login` endpoint is accessible

### Can't See Wilma Tab in Admin Panel
1. Make sure you're logged in as admin
2. Check if `WilmaUserManager` component is imported
3. Verify the Wilma tab is added to `AdminDashboard.tsx`

### Users Not Appearing
1. Check Firebase connection
2. Verify `isActive` field is set to `true`
3. Check browser console for API errors

## Development

### Adding New Features
1. Update `client/src/pages/wilma.tsx` for frontend
2. Add new routes in `server/routes.ts` for backend
3. Update `server/firebaseStorage.ts` for database operations
4. Update schema in `shared/schema.ts` if needed

### Testing
1. Create test users with `npm run seed:wilma`
2. Test login with different roles
3. Verify role-based access control
4. Test CRUD operations in admin panel

## Future Enhancements
- [ ] Password hashing
- [ ] JWT authentication
- [ ] Password reset functionality
- [ ] Email verification
- [ ] Two-factor authentication
- [ ] Activity logging
- [ ] Session timeout
- [ ] Remember me functionality
- [ ] Profile picture upload
- [ ] Bulk user import
- [ ] User groups/classes management

## Support
For issues or questions, contact the development team or check the main README.md file.
