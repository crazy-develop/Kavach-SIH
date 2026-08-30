const { initializeApp } = require('firebase-admin/app');
const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

try {
  console.log('admin.auth:', typeof admin.auth);
  console.log('getAuth:', typeof getAuth);
  
  initializeApp({ projectId: 'kavach-8ba2a' });
  console.log('App initialized');
  
  const auth = getAuth();
  console.log('Auth instance obtained:', typeof auth.verifyIdToken);
} catch (err) {
  console.error('Error during Firebase Admin test:', err);
}
