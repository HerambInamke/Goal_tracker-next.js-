import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword as signInWithEmail,
  createUserWithEmailAndPassword as createUserWithEmail,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  updateProfile,
  User
} from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAXQUW0NGiGK1zPxfOXqPmacEbIZXozVys",
  authDomain: "arcanerealestate.firebaseapp.com",
  projectId: "arcanerealestate",
  storageBucket: "arcanerealestate.firebasestorage.app",
  messagingSenderId: "512344794275",
  appId: "1:512344794275:web:14d1cd277e4f0b179c8b16",
  measurementId: "G-J12VPB82VR"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Auth helper functions
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithGithub = () => signInWithPopup(auth, githubProvider);
export const signInWithEmailAndPassword = (email: string, password: string) => 
  signInWithEmail(auth, email, password);
export const createUserWithEmailAndPassword = (email: string, password: string) => 
  createUserWithEmail(auth, email, password);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);
export const signOut = () => firebaseSignOut(auth);
export const updateUserProfile = (user: User, data: { displayName?: string; photoURL?: string }) => 
  updateProfile(user, data);

export { app, auth, analytics }; 