import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDoCdZNEqvGLyt6_1UoHIXnoiJWuQ9KbyA",
  authDomain: "starpark-pw.firebaseapp.com",
  projectId: "starpark-pw",
  storageBucket: "starpark-pw.firebasestorage.app",
  messagingSenderId: "281423408740",
  appId: "1:281423408740:web:785f45ba321184c96e3971"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export { app, auth, db };