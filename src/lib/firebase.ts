import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDut8Jwv5uQ2mbevESZXwh8CeyGO6jJaHg",
  authDomain: "builder-hub-741c4.firebaseapp.com",
  projectId: "builder-hub-741c4",
  storageBucket: "builder-hub-741c4.firebasestorage.app",
  messagingSenderId: "339149352431",
  appId: "1:339149352431:web:f51bc52a6e9e3a5f69da1a",
  measurementId: "G-ZGBB06NQF2",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, db, auth, googleProvider };
