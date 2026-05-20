# Firebase OTP Backend

Backend for Firebase OTP authentication plus the current operations workflow with two app roles:

- `buyer`
- `admin`

Both roles use the same OTP login flow. Buyers can only work on pickups in their own city. Admins act as the middle layer after a buyer accepts a pickup.

## Base URL

Local:

```text
http://localhost:3000/api/v1
```

Production:

```text
https://<your-domain>/api/v1
```

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Redis
- Firebase Admin SDK

## Firebase Setup

Your Firebase project:

- `projectId: sellyourscrap-53804`

Backend setup:

1. Set `FIREBASE_PROJECT_ID=sellyourscrap-53804` in `.env`
2. Put the real service account JSON in `firebase-service-account.json`
3. Keep `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json`

## Environment Variables

Important variables:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/app_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_TTL_DAYS=30
FIREBASE_PROJECT_ID=sellyourscrap-53804
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
OTP_RATE_LIMIT_MAX=5
OTP_RATE_LIMIT_WINDOW_SEC=300
ADMIN_LOGIN_CODES=founder_admin_code_here
```

`ADMIN_LOGIN_CODES` is a comma-separated list. You can also use `ADMIN_LOGIN_CODE` for a single admin code.

## Quick Start

1. Copy env file
2. Fill required values
3. Install dependencies
4. Run migration
5. Start server

```bash
cp .env.example .env
npm install
npm run migrate
npm run dev
```

## Auth Model

- Login is always OTP based through Firebase on the mobile/frontend app.
- Frontend first verifies OTP with Firebase SDK.
- Frontend then sends Firebase `idToken` to this backend.
- Backend creates or loads the user by phone number.
- Admin login requires a valid backend admin code.
- Buyer users should complete `operatingCity` so city-based pickup filtering works.
- `user` is also accepted on login as a legacy alias and is normalized to `buyer`.

## Roles

### Buyer

- Logs in with OTP
- Sees only pickups from their `operatingCity`
- Can accept a pickup
- Can skip a pickup

### Admin

- Logs in with OTP plus `adminCode`
- Can see operations pickups
- Can take over once a buyer has accepted
- Can update operations status
- Can list buyers

## Common Headers

Protected endpoints require:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

## Common Response Format

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Success With Pagination

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    {
      "path": "body.adminCode",
      "message": "Admin code is required for admin login"
    }
  ]
}
```

## Pickup Statuses

All statuses currently present in the system:

- `BOOKED`
- `BUYER_ACCEPTED`
- `ADMIN_IN_PROGRESS`
- `DRIVER_ASSIGNED`
- `DRIVER_EN_ROUTE`
- `ARRIVED`
- `PICKUP_COMPLETED`
- `PAYMENT_CREDITED`
- `CANCELLED`

Admin operations status update endpoint currently allows only:

- `ADMIN_IN_PROGRESS`
- `PICKUP_COMPLETED`
- `PAYMENT_CREDITED`
- `CANCELLED`

## Data Shapes

### User

```json
{
  "id": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
  "phone": "+919999999999",
  "userType": "buyer",
  "fullName": "Raj Jaiswal",
  "country": "India",
  "operatingCity": "Noida",
  "createdAt": "2026-05-12T06:30:00.000Z",
  "updatedAt": "2026-05-12T06:45:00.000Z"
}
```

### Address

```json
{
  "id": "52885950-b361-4c24-a75b-a4814207c841",
  "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
  "label": "home",
  "line1": "Sector 62",
  "line2": "Near metro",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201309",
  "country": "India",
  "isDefault": true,
  "createdAt": "2026-05-12T06:50:00.000Z",
  "updatedAt": "2026-05-12T06:50:00.000Z"
}
```

### Pickup

```json
{
  "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
  "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
  "status": "BOOKED",
  "buyerId": null,
  "buyerAcceptedAt": null,
  "adminOwnerId": null,
  "adminAssignedAt": null,
  "category": "Scrap Metal",
  "weight": 32.5,
  "transportMode": "pickup",
  "addressSnapshot": {
    "label": "home",
    "line1": "Sector 62",
    "line2": "Near metro",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
    "country": "India"
  },
  "pickupCity": "Noida",
  "pickupDate": "2026-05-13T00:00:00.000Z",
  "pickupTime": "14:00:00",
  "scheduledAt": "2026-05-13T14:00:00.000Z",
  "notes": "Call before arrival",
  "cancelReason": null,
  "rebookedFromPickupId": null,
  "createdAt": "2026-05-12T07:00:00.000Z",
  "updatedAt": "2026-05-12T07:00:00.000Z"
}
```

## Frontend Flow Summary

### Buyer App Flow

1. Verify OTP with Firebase
2. Call `POST /auth/firebase-login` with `userType: "buyer"` or legacy `userType: "user"`
3. Call `GET /users/me`
4. If missing, update `fullName`, `country`, and `operatingCity`
5. Use normal pickup APIs for seller/customer side
6. Use operations APIs to see city pickups and accept or skip

### Admin App Flow

1. Verify OTP with Firebase
2. Call `POST /auth/firebase-login` with `userType: "admin"` and `adminCode`
3. Use operations APIs to monitor accepted pickups
4. Take over after buyer accepts
5. Move pickup status forward

## API Reference

### 1. Firebase Login

`POST /auth/firebase-login`

Used by both buyer and admin after OTP verification on Firebase.
`userType` accepts `buyer`, `admin`, and legacy `user`. The backend normalizes `user` to `buyer`.

#### Request Body for Buyer

```json
{
  "idToken": "firebase_id_token_from_mobile_app",
  "userType": "buyer"
}
```

#### Legacy Buyer Alias

```json
{
  "idToken": "firebase_id_token_from_mobile_app",
  "userType": "user"
}
```

#### Request Body for Admin

```json
{
  "idToken": "firebase_id_token_from_mobile_app",
  "userType": "admin",
  "adminCode": "founder_admin_code_here"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
      "phone": "+919999999999",
      "userType": "buyer",
      "fullName": "Raj Jaiswal",
      "country": "India",
      "operatingCity": "Noida",
      "createdAt": "2026-05-12T06:30:00.000Z",
      "updatedAt": "2026-05-12T06:45:00.000Z"
    },
    "tokens": {
      "accessToken": "<jwt_access_token>",
      "refreshToken": "<opaque_refresh_token>",
      "expiresIn": "15m"
    },
    "meta": {
      "operationsProfileComplete": true
    }
  }
}
```

### 2. Refresh Token

`POST /auth/refresh-token`

#### Request Body

```json
{
  "refreshToken": "<opaque_refresh_token>"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "accessToken": "<new_jwt_access_token>",
    "refreshToken": "<new_opaque_refresh_token>",
    "expiresIn": "15m"
  }
}
```

### 3. Get My Profile

`GET /users/me`

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "phone": "+919999999999",
    "userType": "buyer",
    "fullName": "Raj Jaiswal",
    "country": "India",
    "operatingCity": "Noida",
    "createdAt": "2026-05-12T06:30:00.000Z",
    "updatedAt": "2026-05-12T06:45:00.000Z"
  }
}
```

### 4. Update My Profile

`PUT /users/me`

At least one field is required.

#### Request Body

```json
{
  "fullName": "Raj Jaiswal",
  "country": "India",
  "operatingCity": "Noida"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "phone": "+919999999999",
    "userType": "buyer",
    "fullName": "Raj Jaiswal",
    "country": "India",
    "operatingCity": "Noida",
    "createdAt": "2026-05-12T06:30:00.000Z",
    "updatedAt": "2026-05-12T06:45:00.000Z"
  }
}
```

### 5. Create Address

`POST /users/me/addresses`

#### Request Body

```json
{
  "label": "home",
  "line1": "Sector 62",
  "line2": "Near metro",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201309",
  "country": "India",
  "isDefault": true
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "52885950-b361-4c24-a75b-a4814207c841",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "label": "home",
    "line1": "Sector 62",
    "line2": "Near metro",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
    "country": "India",
    "isDefault": true,
    "createdAt": "2026-05-12T06:50:00.000Z",
    "updatedAt": "2026-05-12T06:50:00.000Z"
  }
}
```

### 6. List My Addresses

`GET /users/me/addresses`

#### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "52885950-b361-4c24-a75b-a4814207c841",
      "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India",
      "isDefault": true,
      "createdAt": "2026-05-12T06:50:00.000Z",
      "updatedAt": "2026-05-12T06:50:00.000Z"
    }
  ]
}
```

### 7. Update Address

`PATCH /users/me/addresses/:addressId`

At least one field is required.

#### Request Body

```json
{
  "line2": "Near blue line metro station",
  "isDefault": true
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "52885950-b361-4c24-a75b-a4814207c841",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "label": "home",
    "line1": "Sector 62",
    "line2": "Near blue line metro station",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
    "country": "India",
    "isDefault": true,
    "createdAt": "2026-05-12T06:50:00.000Z",
    "updatedAt": "2026-05-12T07:05:00.000Z"
  }
}
```

### 8. Delete Address

`DELETE /users/me/addresses/:addressId`

#### Success Response

Returns HTTP `204 No Content` with an empty body.

### 9. Create Pickup

`POST /pickups`

Use either `addressId` or inline `address`.

#### Request Body using `addressId`

```json
{
  "category": "Scrap Metal",
  "weight": 32.5,
  "transportMode": "pickup",
  "addressId": "52885950-b361-4c24-a75b-a4814207c841",
  "date": "2026-05-13",
  "time": "14:00",
  "scheduledAt": "2026-05-13T14:00:00.000Z",
  "notes": "Call before arrival"
}
```

#### Request Body using inline `address`

```json
{
  "category": "Plastic",
  "weight": 12,
  "transportMode": "pickup",
  "address": {
    "label": "other",
    "line1": "Plot 11, Sector 18",
    "line2": "Near market",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "country": "India"
  },
  "date": "2026-05-13",
  "time": "16:30",
  "notes": "Use service lane"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BOOKED",
    "buyerId": null,
    "buyerAcceptedAt": null,
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:00:00.000Z"
  }
}
```

### 10. List My Pickups

`GET /pickups`

#### Query Params

- `status` optional
- `page` optional, default `1`
- `limit` optional, default `10`, max `50`

#### Example

```text
GET /pickups?status=BOOKED&page=1&limit=10
```

#### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
      "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
      "status": "BOOKED",
      "buyerId": null,
      "buyerAcceptedAt": null,
      "adminOwnerId": null,
      "adminAssignedAt": null,
      "category": "Scrap Metal",
      "weight": 32.5,
      "transportMode": "pickup",
      "addressSnapshot": {
        "label": "home",
        "line1": "Sector 62",
        "line2": "Near metro",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "pincode": "201309",
        "country": "India"
      },
      "pickupCity": "Noida",
      "pickupDate": "2026-05-13T00:00:00.000Z",
      "pickupTime": "14:00:00",
      "scheduledAt": "2026-05-13T14:00:00.000Z",
      "notes": "Call before arrival",
      "cancelReason": null,
      "rebookedFromPickupId": null,
      "createdAt": "2026-05-12T07:00:00.000Z",
      "updatedAt": "2026-05-12T07:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### 11. Get Pickup Detail

`GET /pickups/:id`

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BOOKED",
    "buyerId": null,
    "buyerAcceptedAt": null,
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:00:00.000Z",
    "timeline": [
      {
        "id": "c988b912-455f-4cba-b032-0a911f50a050",
        "pickupId": "2d6c4894-0847-4950-b96b-2443f4f933ec",
        "status": "BOOKED",
        "note": "Pickup booked",
        "metadata": {},
        "createdAt": "2026-05-12T07:00:00.000Z"
      }
    ],
    "rating": null
  }
}
```

### 12. Cancel Pickup

`PATCH /pickups/:id/cancel`

#### Request Body

```json
{
  "reason": "Seller is not available"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "CANCELLED",
    "buyerId": null,
    "buyerAcceptedAt": null,
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": "Seller is not available",
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T08:00:00.000Z"
  }
}
```

### 13. Rebook Pickup

`POST /pickups/:id/rebook`

All fields are optional. Missing values are copied from the cancelled pickup.

#### Request Body

```json
{
  "date": "2026-05-14",
  "time": "12:00",
  "notes": "Rebooked for tomorrow"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2baad3da-f7a4-4dcb-b60d-87ef9e92ef9a",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BOOKED",
    "buyerId": null,
    "buyerAcceptedAt": null,
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-14T00:00:00.000Z",
    "pickupTime": "12:00:00",
    "scheduledAt": null,
    "notes": "Rebooked for tomorrow",
    "cancelReason": null,
    "rebookedFromPickupId": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "createdAt": "2026-05-12T08:15:00.000Z",
    "updatedAt": "2026-05-12T08:15:00.000Z"
  }
}
```

### 14. Rate Pickup

`POST /pickups/:id/rate`

Allowed after `PICKUP_COMPLETED` or `PAYMENT_CREDITED`.

#### Request Body

```json
{
  "rating": 5,
  "review": "Very smooth pickup"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "57bd9a5a-6d00-457e-9182-fe2a77a2747d",
    "pickupId": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "rating": 5,
    "review": "Very smooth pickup",
    "createdAt": "2026-05-12T09:00:00.000Z"
  }
}
```

## Operations APIs

These are the newly added APIs for the simplified operations app.

### 15. List Operations Pickups

`GET /operations/pickups`

#### Access

- Buyer: only sees pickups in buyer's `operatingCity`
- Admin: can see all pickups, optionally filtered by city

#### Query Params

- `status` optional
- `city` optional
- `scope` optional, one of `available`, `accepted`, `all`, default `available`
- `page` optional, default `1`
- `limit` optional, default `10`, max `50`

#### Examples

Buyer available queue:

```text
GET /operations/pickups?scope=available&page=1&limit=10
```

Buyer accepted queue:

```text
GET /operations/pickups?scope=accepted&page=1&limit=10
```

Admin filtered queue:

```text
GET /operations/pickups?city=Noida&status=BUYER_ACCEPTED&page=1&limit=10
```

#### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
      "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
      "status": "BOOKED",
      "buyerId": null,
      "buyerAcceptedAt": null,
      "adminOwnerId": null,
      "adminAssignedAt": null,
      "category": "Scrap Metal",
      "weight": 32.5,
      "transportMode": "pickup",
      "addressSnapshot": {
        "label": "home",
        "line1": "Sector 62",
        "line2": "Near metro",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "pincode": "201309",
        "country": "India"
      },
      "pickupCity": "Noida",
      "buyerSkipCount": 0,
      "pickupDate": "2026-05-13T00:00:00.000Z",
      "pickupTime": "14:00:00",
      "scheduledAt": "2026-05-13T14:00:00.000Z",
      "notes": "Call before arrival",
      "cancelReason": null,
      "rebookedFromPickupId": null,
      "createdAt": "2026-05-12T07:00:00.000Z",
      "updatedAt": "2026-05-12T07:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

### 16. Get Operations Pickup Detail

`GET /operations/pickups/:id`

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BUYER_ACCEPTED",
    "buyerId": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a",
    "buyerAcceptedAt": "2026-05-12T07:20:00.000Z",
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "buyerSkipCount": 1,
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:20:00.000Z",
    "timeline": [
      {
        "id": "c988b912-455f-4cba-b032-0a911f50a050",
        "pickupId": "2d6c4894-0847-4950-b96b-2443f4f933ec",
        "status": "BOOKED",
        "note": "Pickup booked",
        "metadata": {},
        "createdAt": "2026-05-12T07:00:00.000Z"
      },
      {
        "id": "7d48d77b-4b48-4af0-b5dc-87ac84b3487d",
        "pickupId": "2d6c4894-0847-4950-b96b-2443f4f933ec",
        "status": "BUYER_ACCEPTED",
        "note": "Accepted by buyer",
        "metadata": {
          "buyerId": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a"
        },
        "createdAt": "2026-05-12T07:20:00.000Z"
      }
    ]
  }
}
```

### 17. Buyer Accept Pickup

`POST /operations/pickups/:id/accept`

#### Request Body

No body required.

```json
{}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BUYER_ACCEPTED",
    "buyerId": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a",
    "buyerAcceptedAt": "2026-05-12T07:20:00.000Z",
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:20:00.000Z"
  }
}
```

### 18. Buyer Skip Pickup

`POST /operations/pickups/:id/skip`

#### Request Body

```json
{
  "reason": "Too far from my route"
}
```

#### Success Response

The pickup remains in its current status, but the skip is recorded in the event log and hidden from this buyer's available queue.

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "BOOKED",
    "buyerId": null,
    "buyerAcceptedAt": null,
    "adminOwnerId": null,
    "adminAssignedAt": null,
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:00:00.000Z"
  }
}
```

### 19. Admin Takeover

`POST /operations/pickups/:id/takeover`

Can only happen after a buyer has accepted the pickup.

#### Request Body

```json
{
  "note": "Admin is coordinating between seller and buyer"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "ADMIN_IN_PROGRESS",
    "buyerId": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a",
    "buyerAcceptedAt": "2026-05-12T07:20:00.000Z",
    "adminOwnerId": "02d40192-94e8-4140-b12d-64c8c10e5305",
    "adminAssignedAt": "2026-05-12T07:30:00.000Z",
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T07:30:00.000Z"
  }
}
```

### 20. Admin Update Pickup Status

`PATCH /operations/pickups/:id/status`

#### Request Body

```json
{
  "status": "PICKUP_COMPLETED",
  "note": "Material collected successfully"
}
```

#### Another Valid Example

```json
{
  "status": "PAYMENT_CREDITED",
  "note": "Buyer payment settled"
}
```

#### Success Response

```json
{
  "success": true,
  "data": {
    "id": "2d6c4894-0847-4950-b96b-2443f4f933ec",
    "userId": "7f18f82d-1caa-4c74-b6f7-77dd5b7dfc18",
    "status": "PICKUP_COMPLETED",
    "buyerId": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a",
    "buyerAcceptedAt": "2026-05-12T07:20:00.000Z",
    "adminOwnerId": "02d40192-94e8-4140-b12d-64c8c10e5305",
    "adminAssignedAt": "2026-05-12T07:30:00.000Z",
    "category": "Scrap Metal",
    "weight": 32.5,
    "transportMode": "pickup",
    "addressSnapshot": {
      "label": "home",
      "line1": "Sector 62",
      "line2": "Near metro",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "country": "India"
    },
    "pickupCity": "Noida",
    "pickupDate": "2026-05-13T00:00:00.000Z",
    "pickupTime": "14:00:00",
    "scheduledAt": "2026-05-13T14:00:00.000Z",
    "notes": "Call before arrival",
    "cancelReason": null,
    "rebookedFromPickupId": null,
    "createdAt": "2026-05-12T07:00:00.000Z",
    "updatedAt": "2026-05-12T08:30:00.000Z"
  }
}
```

### 21. List Buyers

`GET /operations/buyers`

Admin-only endpoint.

#### Query Params

- `city` optional
- `page` optional, default `1`
- `limit` optional, default `10`, max `50`

#### Example

```text
GET /operations/buyers?city=Noida&page=1&limit=10
```

#### Success Response

```json
{
  "success": true,
  "data": [
    {
      "id": "ab2449b2-ef94-4496-b74d-eb27cc6ddb6a",
      "phone": "+919888888888",
      "userType": "buyer",
      "fullName": "Noida Buyer 1",
      "country": "India",
      "operatingCity": "Noida",
      "createdAt": "2026-05-10T10:00:00.000Z",
      "updatedAt": "2026-05-12T07:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

## Frontend Notes

- Buyers must set `operatingCity`, otherwise operations pickup APIs will fail.
- Buyer `scope=available` only returns unaccepted pickups not skipped by that buyer.
- Buyer `scope=accepted` returns only pickups accepted by that buyer.
- Buyer `scope=all` returns both currently available pickups and pickups already accepted by that buyer.
- Admin takeover starts the middleman workflow after buyer acceptance.
- Status timeline is stored in `pickup_status_events`, so frontend can show a full progress feed.

## Deployment

See [LIGHTSAIL_DEPLOYMENT.md](./LIGHTSAIL_DEPLOYMENT.md) for Lightsail deployment steps.
