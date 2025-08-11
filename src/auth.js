import { auth } from './firebase-config.js';

// Passwordless email sign-in
export const sendSignInLink = async (email) => {
  const actionCodeSettings = {
    url: window.location.href,
    handleCodeInApp: true
  };
  
  try {
    await auth.sendSignInLinkToEmail(email, actionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    return true;
  } catch (error) {
    console.error("Error sending sign-in link:", error);
    return false;
  }
};

// Google sign-in
export const signInWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    return true;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    return false;
  }
};

// Check if coming back from email link
export const checkEmailSignIn = async () => {
  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('Please provide your email for confirmation');
    }
    
    try {
      await auth.signInWithEmailLink(email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      window.location.href = '/';
      return true;
    } catch (error) {
      console.error("Error completing email sign-in:", error);
      return false;
    }
  }
  return false;
};

// Sign out
export const signOut = async () => {
  try {
    await auth.signOut();
    return true;
  } catch (error) {
    console.error("Error signing out:", error);
    return false;
  }
};
