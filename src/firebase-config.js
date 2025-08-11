// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBRoZfoifZ3oSKAyof85f_By2aZvUGlYJc",
  authDomain: "theult.firebaseapp.com",
  databaseURL: "https://theult-default-rtdb.firebaseio.com",
  projectId: "theult",
  storageBucket: "theult.firebasestorage.app",
  messagingSenderId: "802788451326",
  appId: "1:802788451326:web:26ffb0c8818367054056af"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enable persistence
db.enablePersistence()
  .catch((err) => {
    console.error("Firestore persistence failed: ", err);
  });

export { auth, db };
