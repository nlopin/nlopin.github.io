/* ==========================================================================
   Firebase for the front desk — shared by index.html (students) and
   dashboard.html (instructor). The config is public by design; the database
   rules (database.rules.json) protect the answers and the students' notes.
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
export { ref, get, set, update, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
export { onAuthStateChanged };

// Firebase console → Project settings → Your apps → Web app → config.
const config = {
  apiKey: "AIzaSyBiw-GFeRAaB1fGh_6285XOgjMJ8mFpaVc",
  authDomain: "meridian-ctf.firebaseapp.com",
  databaseURL: "https://meridian-ctf-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "meridian-ctf",
  appId: "1:472365617878:web:09357dc39c69071d92af77",
};

export const configured = Boolean(config.apiKey && config.databaseURL);

const app = configured ? initializeApp(config) : null;
export const auth = configured ? getAuth(app) : null;
export const db = configured ? getDatabase(app) : null;

export const signIn = () => signInWithPopup(auth, new GoogleAuthProvider());
export const signOutNow = () => signOut(auth);
