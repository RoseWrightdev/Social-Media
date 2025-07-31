# Authentication Architecture

## Current State

The frontend currently uses a **temporary JWT token authentication system** with localStorage storage, while the backend expects **Auth0 JWT tokens**.

## Authentication Flow

### Current Implementation (Temporary)
1. **Token Storage**: JWT tokens stored in `localStorage`
   - `auth_token` - Global auth token
   - `room-{roomId}-token` - Room-specific token
   - `room-{roomId}-username` - User display name

2. **Room Authentication**: 
   - Users prompted for username on first room entry
   - Tokens retrieved from localStorage or passed as props
   - Tokens sent to backend via WebSocket query parameters

3. **Token Validation**: Backend validates JWT tokens using Auth0 JWKS

### Expected Implementation (Production)
1. **Auth0 Integration**: Frontend should integrate with Auth0 for user authentication
2. **Token Acquisition**: JWT tokens obtained through Auth0 login flow
3. **Automatic Refresh**: Token refresh handled by Auth0 SDK

## Backend Requirements

The Go backend expects JWT tokens with:
- **Issuer**: Auth0 domain (e.g., `your-domain.auth0.com`)
- **Audience**: API identifier configured in Auth0
- **Custom Claims**: 
  - `scope`: User access scope
  - `name`: User display name (optional)

## Environment Variables

### Backend (.env)
```bash
AUTH0_DOMAIN=your-auth0-domain.auth0.com
AUTH0_AUDIENCE=your-api-identifier
```

### Frontend (.env.local) - Not Yet Implemented
```bash
NEXT_PUBLIC_AUTH0_DOMAIN=your-auth0-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
NEXT_PUBLIC_AUTH0_AUDIENCE=your-api-identifier
```

## Implementation Status

✅ **Completed**:
- JWT token handling in frontend
- Token validation in backend
- WebSocket authentication
- Room-based token storage
- Test authentication mocks

❌ **Missing**:
- Auth0 frontend integration
- Auth0 SDK configuration
- Login/logout UI components
- Token refresh mechanism
- User profile management

## Next Steps

1. **Install Auth0 SDK**: `npm install @auth0/auth0-react`
2. **Configure Auth0 Provider**: Wrap app with Auth0Provider
3. **Create Login Components**: Login/logout buttons and user profile
4. **Update Token Flow**: Replace localStorage tokens with Auth0 tokens
5. **Add Environment Config**: Create .env.local with Auth0 settings

## Testing

Tests have been updated to use localStorage mocks instead of NextAuth mocks, which aligns with the current temporary authentication system.
