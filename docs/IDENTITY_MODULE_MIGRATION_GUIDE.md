# Identity Module Migration Guide

## 📋 Overview

This guide helps you migrate from legacy auth endpoints to the new Identity module endpoints. The new Identity module provides enhanced security, better audit logging, and follows Clean Architecture principles.

## 🚨 Deprecation Notice

**Legacy endpoints are deprecated and will be removed in the future.**

- `/api/auth/login` → Use `/identity/auth/login`
- `/api/auth/logout` → Use `/identity/auth/logout`  
- `/api/auth/me` → Use `/identity/auth/me`

## 🔑 Key Changes

### 1. Response Format

**Legacy Response:**
```json
{
  "token": "random_token_string",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "admin",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**New Response:**
```json
{
  "accessToken": "jwt_token_string",
  "refreshToken": "jwt_refresh_token_string",
  "expiresIn": 3600,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "role": "admin",
    "permissions": ["read", "write", "delete"]
  }
}
```

### 2. Token Type

- **Legacy**: Random string token stored in database
- **New**: JWT tokens (access + refresh) with built-in expiration

### 3. Authentication Headers

**Legacy:**
```
Authorization: Bearer random_token_string
```

**New:**
```
Authorization: Bearer jwt_access_token
```

## 🔄 Migration Steps

### Step 1: Update Login Endpoint

**Before:**
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { token, user } = await response.json();
localStorage.setItem('token', token);
```

**After:**
```typescript
const response = await fetch('/identity/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken, user } = await response.json();
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### Step 2: Update Token Refresh Logic

**New Feature - Token Refresh:**
```typescript
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('/identity/auth/refresh', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshToken}`
    }
  });

  const { accessToken, refreshToken: newRefreshToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', newRefreshToken);
  
  return accessToken;
}
```

### Step 3: Update API Calls

**Before:**
```typescript
const token = localStorage.getItem('token');
const response = await fetch('/api/users', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**After:**
```typescript
const accessToken = localStorage.getItem('accessToken');
const response = await fetch('/api/users', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// Handle token expiration
if (response.status === 401) {
  await refreshAccessToken();
  // Retry request with new token
}
```

### Step 4: Update Logout

**Before:**
```typescript
await fetch('/api/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
localStorage.removeItem('token');
```

**After:**
```typescript
const accessToken = localStorage.getItem('accessToken');
await fetch('/identity/auth/logout', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${accessToken}` }
});
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

## 🔒 Security Improvements

1. **JWT Tokens**: Cryptographically signed, cannot be forged
2. **Token Expiration**: Access tokens expire in 1 hour
3. **Refresh Tokens**: Long-lived tokens for obtaining new access tokens
4. **Password Migration**: Automatic migration from SHA256 to bcrypt
5. **Enhanced Audit Logging**: All auth events are logged with detailed metadata

## 📊 Monitoring Legacy Usage

To check if legacy endpoints are still being used:

```bash
# Monitor last 7 days
pnpm monitor:legacy 7

# Monitor last 30 days
pnpm monitor:legacy 30
```

## 🎯 New Identity Module Endpoints

### Authentication
- `POST /identity/auth/login` - Login with email/password
- `POST /identity/auth/logout` - Logout and revoke tokens
- `POST /identity/auth/refresh` - Refresh access token
- `GET /identity/auth/me` - Get current user info

### User Management
- `GET /identity/users` - List users (with pagination)
- `GET /identity/users/:id` - Get user by ID
- `POST /identity/users` - Create new user
- `PATCH /identity/users/:id` - Update user
- `DELETE /identity/users/:id` - Delete user

### RBAC
- `POST /identity/rbac/assign-role` - Assign role to user
- `GET /identity/rbac/check-permission` - Check user permission
- `GET /identity/rbac/permissions` - List all permissions

## ⚠️ Common Issues

### Issue: Token expiration handling
**Solution**: Implement automatic token refresh using the refresh endpoint

### Issue: Permission denied errors
**Solution**: Check that the user has the required permissions in the RBAC system

### Issue: Legacy password hash
**Solution**: The system automatically migrates SHA256 passwords to bcrypt on first successful login

## 📞 Support

If you encounter issues during migration:
1. Check the audit logs for detailed error information
2. Use the monitoring script to identify which legacy endpoints are still being used
3. Contact the development team with specific error messages

## 🗓️ Timeline

- **Phase 1**: Deprecation warnings added (Current)
- **Phase 2**: Monitoring period (1-2 weeks)
- **Phase 3**: Legacy endpoint removal (if unused)
- **Phase 4**: Documentation updates

## ✅ Migration Checklist

- [ ] Update login endpoint calls
- [ ] Update logout endpoint calls
- [ ] Implement token refresh logic
- [ ] Update all API calls to use access tokens
- [ ] Test authentication flow end-to-end
- [ ] Test token refresh on expiration
- [ ] Verify RBAC permissions work correctly
- [ ] Monitor for any legacy endpoint usage
- [ ] Update any documentation or guides
