/* ==========================================================================
   Firebase for the race — shared by race.js (student pages) and board.html.
   The config is public by design; the database rules protect the data.
   ========================================================================== */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
export * from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";

const app = initializeApp({
  apiKey: "AIzaSyAa7LCqqxcMHdX2EYbJEcZOUbAYm2XbJY4",
  authDomain: "therace-bad9d.firebaseapp.com",
  databaseURL: "https://therace-bad9d-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "therace-bad9d",
  storageBucket: "therace-bad9d.firebasestorage.app",
  messagingSenderId: "51647630411",
  appId: "1:51647630411:web:52c1fb5feed67da73451ce",
});

export const db = getDatabase(app);
const auth = getAuth(app);

// Anonymous sign-in: every browser gets a stable uid, so a reload is the same player.
export function signIn() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      stop();
      resolve(user.uid);
    });
    signInAnonymously(auth).catch(reject);
  });
}

// Room codes avoid look-alikes (0/O, 1/I/L, 2/Z, 5/S, 8/B).
const ALPHABET = "ACDEFHJKMNPQRTUVWXY34679";
export const newCode = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
export const cleanCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);

// A panel counts as a task when kit.js can tell whether it's solved.
export const TASK_SEL = ".live, .live-js";
