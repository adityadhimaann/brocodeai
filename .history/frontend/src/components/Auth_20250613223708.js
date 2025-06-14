
import { useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

const __app_id = window.__app_id || 'default-app-id';
const __firebase_config_raw = window.__firebase_config || '';
const __initial_auth_token = window.__initial_auth_token || undefined;

const DUMMY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCGacUTAHsMEbJGFTQndUjiuT8Lw-4s40o",
  authDomain: "plexiform-being-412718.firebaseapp.com",
  projectId: "plexiform-being-412718",
  storageBucket: "plexiform-being-412718.firebasestorage.app",
  messagingSenderId: "132118378297",
  appId: "1:132118378297:web:20b4dc2d6b035f82dc1ae8"
};

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return c === 'x' ? r : (r & 0x3 | 0x8).toString(16);
});

export default function Auth({ setUserId, setLoggedInUser, displayMessageBox }) {
  useEffect(() => {
    let firebaseConfig = {};
    try {
      firebaseConfig = __firebase_config_raw ? JSON.parse(__firebase_config_raw) : DUMMY_FIREBASE_CONFIG;
    } catch (e) {
      console.error('Failed to parse Firebase config:', e);
      firebaseConfig = DUMMY_FIREBASE_CONFIG;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      const unsubscribe = onAuthStateChanged(auth, async user => {
        if (user) {
          setUserId(user.uid);
          setLoggedInUser({ username: user.uid.substring(0, 8), profilePic: `https://placehold.co/150x150/FF00FF/FFFFFF?text=${user.uid.substring(0, 2)}` });
        } else {
          try {
            if (__initial_auth_token) {
              await signInWithCustomToken(auth, __initial_auth_token);
            } else {
              const anonUser = await signInAnonymously(auth);
              setUserId(anonUser.user.uid);
              setLoggedInUser({ username: anonUser.user.uid.substring(0, 8) + ' (Anon)', profilePic: `https://placehold.co/150x150/CCCCCC/000000?text=${anonUser.user.uid.substring(0, 2)}` });
            }
          } catch (error) {
            console.error('Auth failed:', error);
            displayMessageBox(`Firebase auth failed: ${error.message}`, 'error');
            setUserId(generateUUID());
          }
        }
      });
      return unsubscribe;
    } catch (error) {
      console.error('Firebase init failed:', error);
      displayMessageBox(`Firebase init failed: ${error.message}`, 'error');
      setUserId(generateUUID());
    }
  }, [setUserId, setLoggedInUser, displayMessageBox]);

  return null;
}
