const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const env = require('./env');

if (!env.firebaseServiceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is required');
}

const serviceAccountFullPath = path.resolve(env.firebaseServiceAccountPath);

if (!fs.existsSync(serviceAccountFullPath)) {
  throw new Error(`Firebase service account file not found: ${serviceAccountFullPath}`);
}

const serviceAccount = require(serviceAccountFullPath);
const firebaseProjectId = env.firebaseProjectId || serviceAccount.project_id;

// Firebase Admin initialization for verifying Firebase ID tokens.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: firebaseProjectId
});

module.exports = admin;
