# Mobile Integration Flow (OTP -> Profile -> Pickups)

Base URL: `https://<your-api-domain>/api/v1`

## 1) Firebase OTP verify on mobile
- Verify OTP with Firebase SDK in app.
- Get Firebase ID token from current user.

## 2) Backend login
- Request: `POST /auth/firebase-login`
- Body:
```json
{
  "idToken": "<firebase_id_token>"
}
```
- Save:
  - `accessToken`
  - `refreshToken`
  - `user`

## 3) Profile completion screen (mandatory)
Immediately call:
- `GET /users/me`
If `fullName` or `country` is missing, show profile form and submit:
- `PUT /users/me`
```json
{
  "fullName": "Raj Jaiswal",
  "country": "India"
}
```

## 4) Address setup
If no address exists:
- `POST /users/me/addresses`
```json
{
  "label": "home",
  "line1": "House 12, MG Road",
  "line2": "Near Metro Station",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "country": "India",
  "isDefault": true
}
```

## 5) Pickup flow
- Create: `POST /pickups` with `addressId` (recommended)
- List: `GET /pickups?status=BOOKED&page=1&limit=10`
- Detail+timeline: `GET /pickups/:id`
- Cancel: `PATCH /pickups/:id/cancel`
- Rebook: `POST /pickups/:id/rebook`
- Rate after completion: `POST /pickups/:id/rate`

## 6) Refresh token flow
When API returns `401` for expired access token:
- Call `POST /auth/refresh-token` with current `refreshToken`
- Replace stored tokens and retry original request once.
