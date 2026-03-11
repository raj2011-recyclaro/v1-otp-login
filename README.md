# Firebase OTP Backend (Node.js + Express + PostgreSQL + Redis)

Production-ready backend for mobile OTP auth using Firebase ID token verification.

## Folder Structure

src/
  config/
  controllers/
  services/
  repositories/
  models/
  routes/
  middlewares/
  utils/
  validations/
  jobs/

## Firebase Setup (Your Project)

Your Firebase Web SDK project is:
- projectId: `otp-login-575e2`

Backend setup:
1. Set `FIREBASE_PROJECT_ID=otp-login-575e2` in `.env`
2. Put real service account JSON in `firebase-service-account.json`
3. Keep `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`

Note: `apiKey/authDomain/appId` are for frontend SDK usage. Backend verification uses Firebase Admin service account.

## Quick Start (Local)

1. Copy env file:
   cp .env.example .env
2. Fill required values in `.env`.
3. Install dependencies:
   npm install
4. Run migration:
   npm run migrate
5. Start server:
   npm run dev

## Docker

1. Copy env file and update values:
   cp .env.example .env
2. Start stack:
   docker-compose up --build

## API Endpoints

- POST `/api/v1/auth/firebase-login`
- POST `/api/v1/auth/refresh-token`
- GET `/api/v1/users/me`

## Request Examples

### Firebase Login

POST `/api/v1/auth/firebase-login`

```json
{
  "idToken": "firebase_id_token_from_mobile_app"
}
```

### Refresh Token

POST `/api/v1/auth/refresh-token`

```json
{
  "refreshToken": "refresh_token_returned_from_login"
}
```

### My Profile

GET `/api/v1/users/me`

Header: `Authorization: Bearer <access_token>`

## Notes

- Access token is JWT.
- Refresh token is opaque random token stored as SHA-256 hash in DB.
- Firebase Admin SDK validates ID token and extracts `phone_number`.
- API rejects token if Firebase `aud` does not match `FIREBASE_PROJECT_ID`.
- Rate limiting is Redis-based for login endpoint.
