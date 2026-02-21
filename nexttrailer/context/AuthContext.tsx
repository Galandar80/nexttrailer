import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { getAuth, getAuthModule, isFirebaseEnabled } from '../services/firebase';
import { AuthContext } from './auth-core';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const canAccess = !!user && (!user.providerData.some((provider) => provider.providerId === "password") || user.emailVerified);

    useEffect(() => {
        let isMounted = true;
        let unsubscribe: (() => void) | null = null;

        const initAuth = async () => {
            if (!isFirebaseEnabled) {
                if (isMounted) setLoading(false);
                return;
            }
            const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
            if (!isMounted || !authInstance) {
                if (isMounted) setLoading(false);
                return;
            }
            unsubscribe = authModule.onAuthStateChanged(authInstance, (currentUser) => {
                setUser(currentUser);
                setLoading(false);
            });
        };

        void initAuth();

        return () => {
            isMounted = false;
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const signInWithGoogle = async () => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        const provider = new authModule.GoogleAuthProvider();
        try {
            await authModule.signInWithPopup(authInstance, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signUpWithEmail = async (username: string, email: string, password: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await authModule.createUserWithEmailAndPassword(authInstance, email, password);
            if (credential.user) {
                await authModule.updateProfile(credential.user, { displayName: username });
                await authModule.sendEmailVerification(credential.user);
                await authModule.signOut(authInstance);
            }
        } catch (error) {
            console.error("Error signing up with email", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await authModule.signInWithEmailAndPassword(authInstance, email, password);
            if (credential.user && !credential.user.emailVerified) {
                await authModule.sendEmailVerification(credential.user);
                await authModule.signOut(authInstance);
                throw new Error("Email non verificata. Ti abbiamo inviato un link di conferma.");
            }
        } catch (error) {
            console.error("Error signing in with email", error);
            throw error;
        }
    };

    const sendVerificationEmailToUser = async () => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance || !authInstance.currentUser) {
            throw new Error("Firebase non configurato");
        }
        try {
            await authModule.sendEmailVerification(authInstance.currentUser);
        } catch (error) {
            console.error("Error sending verification email", error);
            throw error;
        }
    };

    const resendVerificationWithEmail = async (email: string, password: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await authModule.signInWithEmailAndPassword(authInstance, email, password);
            if (credential.user) {
                await authModule.sendEmailVerification(credential.user);
                await authModule.signOut(authInstance);
            }
        } catch (error) {
            console.error("Error resending verification email", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        try {
            await authModule.sendPasswordResetEmail(authInstance, email);
        } catch (error) {
            console.error("Error sending password reset", error);
            throw error;
        }
    };

    const updateUserProfile = async (displayName: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance || !authInstance.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!displayName.trim()) {
            throw new Error("Nome utente non valido");
        }
        try {
            await authModule.updateProfile(authInstance.currentUser, { displayName: displayName.trim() });
            setUser(authInstance.currentUser);
        } catch (error) {
            console.error("Error updating profile", error);
            throw error;
        }
    };

    const updateUserEmail = async (email: string, currentPassword: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance || !authInstance.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!email.trim() || !currentPassword) {
            throw new Error("Compila tutti i campi");
        }
        const hasPasswordProvider = authInstance.currentUser.providerData.some((provider) => provider.providerId === "password");
        if (!hasPasswordProvider) {
            throw new Error("Operazione disponibile solo per account email/password");
        }
        try {
            const credential = authModule.EmailAuthProvider.credential(authInstance.currentUser.email || "", currentPassword);
            await authModule.reauthenticateWithCredential(authInstance.currentUser, credential);
            await authModule.updateEmail(authInstance.currentUser, email.trim());
            setUser(authInstance.currentUser);
        } catch (error) {
            console.error("Error updating email", error);
            throw error;
        }
    };

    const updateUserPassword = async (currentPassword: string, newPassword: string) => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance || !authInstance.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!currentPassword || !newPassword) {
            throw new Error("Compila tutti i campi");
        }
        const hasPasswordProvider = authInstance.currentUser.providerData.some((provider) => provider.providerId === "password");
        if (!hasPasswordProvider) {
            throw new Error("Operazione disponibile solo per account email/password");
        }
        try {
            const credential = authModule.EmailAuthProvider.credential(authInstance.currentUser.email || "", currentPassword);
            await authModule.reauthenticateWithCredential(authInstance.currentUser, credential);
            await authModule.updatePassword(authInstance.currentUser, newPassword);
        } catch (error) {
            console.error("Error updating password", error);
            throw error;
        }
    };

    const logout = async () => {
        if (!isFirebaseEnabled) {
            throw new Error("Firebase non configurato");
        }
        const [authInstance, authModule] = await Promise.all([getAuth(), getAuthModule()]);
        if (!authInstance) {
            throw new Error("Firebase non configurato");
        }
        try {
            await authModule.signOut(authInstance);
        } catch (error) {
            console.error("Error signing out", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, canAccess, signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail: sendVerificationEmailToUser, resendVerificationWithEmail, resetPassword, updateUserProfile, updateUserEmail, updateUserPassword, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
