import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";

const firebaseConfig = {
  apiKey,
  authDomain,
  projectId
};

let auth = null;

if (apiKey && apiKey !== "<your-firebase-api-key>") {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log("Firebase initialized successfully");
  } catch (err) {
    console.error("Firebase initialization failed:", err.message);
  }
} else {
  console.warn("Firebase configuration variables are missing or default. Firebase SDK auth is disabled.");
}

export { auth };
