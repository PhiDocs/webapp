// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDYj4WCoDv7DnFMVdeF0zVXlk7KpPJvTxI",
  authDomain: "studio-2124642360-17967.firebaseapp.com",
  projectId: "studio-2124642360-17967",
  storageBucket: "studio-2124642360-17967.firebasestorage.app",
  messagingSenderId: "83458107599",
  appId: "1:83458107599:web:3c6b1c505241d472672fba"
};


// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
