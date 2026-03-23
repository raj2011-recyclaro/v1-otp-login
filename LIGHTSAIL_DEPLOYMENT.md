# AWS Lightsail Deployment Guide

This guide is for deploying this backend on a fresh Ubuntu-based AWS Lightsail instance.

## What you need

- A Lightsail instance running Ubuntu
- Your project code on the server
- Your `firebase-service-account.json` file
- Your final backend `.env` file
- A domain or public IP

## 1. Connect to the server

Use the Lightsail browser terminal or SSH:

```bash
ssh ubuntu@YOUR_LIGHTSAIL_IP
```

## 2. Install Docker and Docker Compose plugin

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

After this, log out and log back in once so Docker works without `sudo`.

## 3. Upload your project

Option A: clone from Git if your repo is online.

```bash
git clone <your-repository-url>
cd <your-project-folder>
```

Option B: upload the project folder from your computer using SCP or SFTP.

## 4. Create your env file on the server

Inside the project folder:

```bash
cp .env.example .env
nano .env
```

Set at least these values:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app_db
REDIS_URL=redis://redis:6379
JWT_SECRET=use_a_long_random_secret_here
FIREBASE_PROJECT_ID=sellyourscrap-53804
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## 5. Upload the Firebase Admin service account file

Place your `firebase-service-account.json` in the project root on the server.

Expected final path:

```text
<project-folder>/firebase-service-account.json
```

Do not upload `google-services.json` to the backend server. That file belongs to the Android app.

## 6. Start the backend stack

```bash
docker compose up -d --build
```

This starts:

- Node.js API
- PostgreSQL
- Redis

## 7. Check logs

```bash
docker compose logs -f api
```

If everything is correct, the API should start after dependencies install and migrations run.

## 8. Open the firewall on Lightsail

In the Lightsail console, add these networking rules:

- `80` for HTTP
- `443` for HTTPS if you later add Nginx/SSL
- `3000` only if you want to access the Node app directly

For better security, it is better later to put Nginx in front of port `3000`.

## 9. Test the API

From your browser or terminal:

```bash
curl http://YOUR_LIGHTSAIL_IP:3000/api/v1/users/me
```

You may get an auth error, which is fine. The important thing is that the server responds.

## 10. Recommended next step for production

After the app is running, add:

- Nginx reverse proxy
- SSL with Let's Encrypt
- A domain name
- Regular database backups

## Where `google-services.json` goes

Use `google-services.json` only in your Android app project.

- If your app is native Android:
  place it in the Android app module, usually `android/app/google-services.json`
- If your app is React Native:
  place it in the Android folder, usually `android/app/google-services.json`
- If your app is Flutter:
  place it in `android/app/google-services.json`

That file is not used by this Node.js backend.
