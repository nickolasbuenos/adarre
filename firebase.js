// Conexão da loja Adarré com o Firebase.
// A configuração abaixo identifica o projeto; não coloque senhas ou chaves privadas aqui.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD34i0xG5lQKE2ea_KtEzZA3duZsGbj3PI",
  authDomain: "adarre-ac647.firebaseapp.com",
  projectId: "adarre-ac647",
  storageBucket: "adarre-ac647.firebasestorage.app",
  messagingSenderId: "617242342183",
  appId: "1:617242342183:web:6e088bd12bf9ece1ceaf02",
  measurementId: "G-09BSF8CHNY"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
