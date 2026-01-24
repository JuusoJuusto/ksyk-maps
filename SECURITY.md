# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in KSYK Maps, please report it responsibly:

### How to Report

1. **DO NOT** open a public issue
2. Email: juuso.kaikula@ksyk.fi with subject "SECURITY: [Brief Description]"
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Response Time**: Within 24-48 hours
- **Updates**: We'll keep you informed of progress
- **Credit**: We'll credit you in the fix (if desired)

## Security Best Practices

### For Users

- Never share your `.env` file
- Keep Firebase credentials private
- Use strong admin passwords
- Regularly update dependencies

### For Contributors

- Never commit sensitive data (`.env`, credentials)
- Use `.env.example` for environment templates
- Review code for security issues before submitting PRs
- Follow secure coding practices

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | ✅ Yes             |
| < 2.0   | ❌ No              |

## Known Security Considerations

- Admin panel requires authentication
- Firebase security rules should be properly configured
- Environment variables must be kept secure
- HTTPS should be used in production

Thank you for helping keep KSYK Maps secure! 🔒
