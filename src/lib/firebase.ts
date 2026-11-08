import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, 'ai-studio-63ec5406-a1ad-4335-aed4-cdaa6e96a1f7');
export const auth = getAuth(app);

// Provider for normal login (standard profile & email, guaranteed to work)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Provider specifically for Google Forms export (requests extra scopes only when exporting)
export const googleFormsProvider = new GoogleAuthProvider();
googleFormsProvider.setCustomParameters({ prompt: 'select_account' });
googleFormsProvider.addScope('https://www.googleapis.com/auth/forms.body');
googleFormsProvider.addScope('https://www.googleapis.com/auth/drive.file');

