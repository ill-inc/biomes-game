import { getApps, initializeApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: "AIzaSyCwMbT6fgxyQNH7c2642oh5eVrvgvHL4yQ",
  authDomain: "zones-cloud.firebaseapp.com",
  projectId: "zones-cloud",
  storageBucket: "zones-cloud.appspot.com",
  messagingSenderId: "336371362626",
  appId: "1:336371362626:web:81190ca1dbc91d460e76db",
  measurementId: "G-NC4PLYNRM0",
};

export function initializeFirebaseIfNeeded() {
  if (getApps().length > 0) {
    return;
  }
  initializeApp(firebaseConfig);
}
