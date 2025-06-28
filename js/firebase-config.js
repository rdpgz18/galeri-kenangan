// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCUS3SD5JxR4wRGbV0RascN4hYFfYv0vlc",
  authDomain: "galeryku-7829a.firebaseapp.com",
  projectId: "galeryku-7829a",
  storageBucket: "galeryku-7829a.firebasestorage.app",
  messagingSenderId: "734065378817",
  appId: "1:734065378817:web:b325a0db8f2ff287bae200",
  measurementId: "G-H20X6ZMTRE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = firebase.auth();
const storage = firebase.storage();
const db = firebase.firestore();

// Export Firebase services
export { auth, storage, db };
