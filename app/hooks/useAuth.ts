import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, signInWithGoogle, signInWithGithub, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, resetPassword } from '../firebase';
import { toast } from 'react-hot-toast';

export const useAuth = () => {
  const [user, loading, error] = useAuthState(auth);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(email, password);
      toast.success('Successfully logged in!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await createUserWithEmailAndPassword(email, password);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      toast.success('Successfully logged in with Google!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGithub();
      toast.success('Successfully logged in with Github!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      await resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Successfully logged out!');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return {
    user,
    isLoading: loading || isLoading,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signInWithGoogle: handleGoogleSignIn,
    signInWithGithub: handleGithubSignIn,
    resetPassword: handleResetPassword,
    signOut: handleSignOut,
  };
}; 