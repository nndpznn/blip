'use client'

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback
} from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/clients/supabaseClient';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getInitialUser = async () => {
            try {
                const {
                    data: { user: initialUser },
                    error,
                } = await supabase.auth.getUser();

                if (error) {
                    console.error('Error fetching initial user:', error.message);
                    setUser(null);
                    setSession(null);
                } else {
                    setUser(initialUser);
                    const {
                        data: { session: initialSession },
                    } = await supabase.auth.getSession();
                    setSession(initialSession);
                }
            } catch (err) {
                console.error('An unexpected error occurred during initial auth fetch:', err);
                setUser(null);
                setSession(null);
            } finally {
                setLoading(false);
            }
        };

        getInitialUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, currentSession) => {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
                setLoading(false);
            }
        );

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const signOut = useCallback(async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        }
        setLoading(false);
    }, []);

    const contextValue: AuthContextType = {
        user,
        session,
        loading,
        signOut,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
