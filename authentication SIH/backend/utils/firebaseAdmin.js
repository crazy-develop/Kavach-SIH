const { initializeApp } = require('firebase-admin/app');
const admin = require('firebase-admin');

let initialized = false;

function getFirebaseAdminApp() {
  if (initialized) return;

  try {
    let options = {};

    // 1. Load service account JSON if explicitly available in env
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        options.credential = admin.credential.cert(serviceAccount);
      } catch (jsonErr) {
        console.error('Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', jsonErr.message);
      }
    }

    // 2. Configure project ID if available
    if (process.env.FIREBASE_PROJECT_ID) {
      options.projectId = process.env.FIREBASE_PROJECT_ID;
    }

    // Initialize application. If GOOGLE_APPLICATION_CREDENTIALS is set, firebase-admin picks it up automatically.
    initializeApp(options);
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (err) {
    console.warn('Firebase Admin SDK NOT initialized:', err.message);
  }
}

function isFirebaseAdminInitialized() {
  return initialized;
}

module.exports = { getFirebaseAdminApp, isFirebaseAdminInitialized };

