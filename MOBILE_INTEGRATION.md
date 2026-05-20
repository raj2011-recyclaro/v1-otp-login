# Mobile Integration Flow (OTP -> Profile -> Operations)

Base URL: `https://<your-api-domain>/api/v1`

## 1) Firebase OTP verify on mobile
- Verify OTP with Firebase SDK in app.
- Get Firebase ID token from current user.

## 2) Backend login
- Request: `POST /auth/firebase-login`
- Body:
```json
{
  "idToken": "<firebase_id_token>",
  "userType": "buyer"
}
```
- `userType: "user"` is also accepted as a legacy alias and is treated as `buyer`.
- For admins:
```json
{
  "idToken": "<firebase_id_token>",
  "userType": "admin",
  "adminCode": "<admin_login_code>"
}
```
- Save:
  - `accessToken`
  - `refreshToken`
  - `user`

## 3) Profile completion screen (mandatory)
Immediately call:
- `GET /users/me`
If `fullName`, `country`, or buyer `operatingCity` is missing, show profile form and submit:
- `PUT /users/me`
```json
{
  "fullName": "Raj Jaiswal",
  "country": "India",
  "operatingCity": "Noida"
}
```

## 4) Buyer operations flow
- Queue in buyer city: `GET /operations/pickups?scope=available&page=1&limit=10`
- Accepted by me: `GET /operations/pickups?scope=accepted&page=1&limit=10`
- Detail+timeline: `GET /operations/pickups/:id`
- Accept: `POST /operations/pickups/:id/accept`
- Skip: `POST /operations/pickups/:id/skip`

## 5) Admin operations flow
- Full queue: `GET /operations/pickups?page=1&limit=10`
- Filter by city or status: `GET /operations/pickups?city=Noida&status=BUYER_ACCEPTED`
- Take over after buyer accepts: `POST /operations/pickups/:id/takeover`
- Move status: `PATCH /operations/pickups/:id/status`
- Buyer directory: `GET /operations/buyers?city=Noida`

## 6) Refresh token flow
When API returns `401` for expired access token:
- Call `POST /auth/refresh-token` with current `refreshToken`
- Replace stored tokens and retry original request once.
