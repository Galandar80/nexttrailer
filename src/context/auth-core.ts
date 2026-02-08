import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    canAccess: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (username: string, email: string, password: string) => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    resendVerificationWithEmail: (email: string, password: string) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
