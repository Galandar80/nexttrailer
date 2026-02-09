import React, { useEffect, useState } from 'react';
import {
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from 'firebase/auth';
import { auth, isFirebaseEnabled } from '../services/firebase';
import { AuthContext } from './auth-core';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const canAccess = !!user && (!user.providerData.some((provider) => provider.providerId === "password") || user.emailVerified);

    useEffect(() => {
        if (!isFirebaseEnabled || !auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const signUpWithEmail = async (username: string, email: string, password: string) => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            if (credential.user) {
                await updateProfile(credential.user, { displayName: username });
                await sendEmailVerification(credential.user);
                await firebaseSignOut(auth);
            }
        } catch (error) {
            console.error("Error signing up with email", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, password: string) => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            if (credential.user && !credential.user.emailVerified) {
                await sendEmailVerification(credential.user);
                await firebaseSignOut(auth);
                throw new Error("Email non verificata. Ti abbiamo inviato un link di conferma.");
            }
        } catch (error) {
            console.error("Error signing in with email", error);
            throw error;
        }
    };

    const sendVerificationEmailToUser = async () => {
        if (!isFirebaseEnabled || !auth || !auth.currentUser) {
            throw new Error("Firebase non configurato");
        }
        try {
            await sendEmailVerification(auth.currentUser);
        } catch (error) {
            console.error("Error sending verification email", error);
            throw error;
        }
    };

    const resendVerificationWithEmail = async (email: string, password: string) => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            if (credential.user) {
                await sendEmailVerification(credential.user);
                await firebaseSignOut(auth);
            }
        } catch (error) {
            console.error("Error resending verification email", error);
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error("Error sending password reset", error);
            throw error;
        }
    };

    const updateUserProfile = async (displayName: string) => {
        if (!isFirebaseEnabled || !auth || !auth.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!displayName.trim()) {
            throw new Error("Nome utente non valido");
        }
        try {
            await updateProfile(auth.currentUser, { displayName: displayName.trim() });
            setUser(auth.currentUser);
        } catch (error) {
            console.error("Error updating profile", error);
            throw error;
        }
    };

    const updateUserEmail = async (email: string, currentPassword: string) => {
        if (!isFirebaseEnabled || !auth || !auth.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!email.trim() || !currentPassword) {
            throw new Error("Compila tutti i campi");
        }
        const hasPasswordProvider = auth.currentUser.providerData.some((provider) => provider.providerId === "password");
        if (!hasPasswordProvider) {
            throw new Error("Operazione disponibile solo per account email/password");
        }
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email || "", currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updateEmail(auth.currentUser, email.trim());
            setUser(auth.currentUser);
        } catch (error) {
            console.error("Error updating email", error);
            throw error;
        }
    };

    const updateUserPassword = async (currentPassword: string, newPassword: string) => {
        if (!isFirebaseEnabled || !auth || !auth.currentUser) {
            throw new Error("Firebase non configurato");
        }
        if (!currentPassword || !newPassword) {
            throw new Error("Compila tutti i campi");
        }
        const hasPasswordProvider = auth.currentUser.providerData.some((provider) => provider.providerId === "password");
        if (!hasPasswordProvider) {
            throw new Error("Operazione disponibile solo per account email/password");
        }
        try {
            const credential = EmailAuthProvider.credential(auth.currentUser.email || "", currentPassword);
            await reauthenticateWithCredential(auth.currentUser, credential);
            await updatePassword(auth.currentUser, newPassword);
        } catch (error) {
            console.error("Error updating password", error);
            throw error;
        }
    };

    const logout = async () => {
        if (!isFirebaseEnabled || !auth) {
            throw new Error("Firebase non configurato");
        }
        try {
            await firebaseSignOut(auth);
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
