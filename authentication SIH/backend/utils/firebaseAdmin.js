const { initializeApp } = require('firebase-admin/app');

let initialized = false;

function getFirebaseAdminApp() {
  if (!initialized) {
    if (process.env.FIREBASE_PROJECT_ID) {
      initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      initialized = true;
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.warn('Firebase Admin SDK NOT initialized: FIREBASE_PROJECT_ID is missing');
    }
  }
}

module.exports = { getFirebaseAdminApp };
