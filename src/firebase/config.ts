// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "safety-docs-ai-app",
  "appId": "1:358826943144:web:84534f3c7a264a1e9564f8",
  "apiKey": "AIzaSyBwWb27-kYV2e3sN6u_H74kL8s1nB3m1s4",
  "authDomain": "safety-docs-ai-app.firebaseapp.com",
  "storageBucket": "safety-docs-ai-app.appspot.com",
  "messagingSenderId": "358826943144"
};


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
