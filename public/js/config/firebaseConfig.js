import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDdfs6a-c87HzDyQaEa5LFYaTZjfXUicDg",
  authDomain: "star-park-repuesto.firebaseapp.com",
  projectId: "star-park-repuesto",
  storageBucket: "star-park-repuesto.firebasestorage.app",
  messagingSenderId: "259712003881",
  appId: "1:259712003881:web:ca0fb1cfb84fcf3fc39138"
};

const app = initializeApp(firebaseConfig);
// Caché en IndexedDB compartida entre pestañas: lo ya leído se guarda en el navegador.
const db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
const auth = getAuth(app);
export { app, auth, db };
