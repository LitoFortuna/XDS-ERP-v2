import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.API_KEY!,
  authDomain: "xen-dance-erp.firebaseapp.com",
  projectId: "xen-dance-erp",
  storageBucket: "xen-dance-erp.firebasestorage.app",
  messagingSenderId: "958181098277",
  appId: "1:958181098277:web:8af680b63c7f223fec90cc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service.
// This is now eagerly initialized and exported directly.
export const db = getFirestore(app);
