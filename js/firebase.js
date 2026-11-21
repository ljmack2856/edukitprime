// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

// Firebase Authentication
import { getAuth } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

// Cloud Firestore
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";


// --------------------------------------------------
// EDULLUMIA FIREBASE CONFIGURATION
// --------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyD-R1qBH8PybRe1htNVA6XMXOCTpmEzdyA",
  authDomain: "edullumia.firebaseapp.com",
  projectId: "edullumia",
  storageBucket: "edullumia.firebasestorage.app",
  messagingSenderId: "383488410689",
  appId: "1:383488410689:web:e49bedf19dfb34c42a72c0",
  measurementId: "G-MTVWS8L34K"
};

// --------------------------------------------------
// INITIALIZE FIREBASE
// --------------------------------------------------

const app = initializeApp(firebaseConfig);


// --------------------------------------------------
// INITIALIZE SERVICES
// --------------------------------------------------

const auth = getAuth(app);
const db = getFirestore(app);


// --------------------------------------------------
// EXPORT SERVICES
// --------------------------------------------------

export {
    app,
    auth,
    db
};