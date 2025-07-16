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
import { supabase } from '@/clients/supabaseClient'; // Adjust path as needed

// Define the shape of your context value
interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    // You might add other auth-related functions here, e.g., signInWithOAuth, signUp
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true); // Initial loading state

    useEffect(() => {
        const getInitialSession = async () => {
            try {
                // Fetch the initial session on component mount
                const {
                    data: { session },
                    error,
                } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error fetching initial session:', error.message);
                } else {
                    setSession(session);
                    setUser(session?.user || null);
                }
            } catch (err) {
                console.error('An unexpected error occurred during initial session fetch:', err);
            } finally {
                setLoading(false);
            }
        };

        getInitialSession();

        // Listen for auth state changes
        // The onAuthStateChange method now returns a function to unsubscribe directly.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, currentSession) => {
                setSession(currentSession);
                setUser(currentSession?.user || null);
                setLoading(false); // Once an event occurs, we're no longer 'initial loading'
            }
        );

        // Cleanup the listener on unmount
        return () => {
            // Check if subscription exists and unsubscribe
            if (subscription) {
                subscription.unsubscribe();
            }
        };
    }, []); // Empty dependency array ensures this runs once on mount

    const signOut = useCallback(async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error.message);
        }
        setLoading(false); // Set loading to false regardless of error
        // The onAuthStateChange listener will automatically update user/session to null
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

// Custom hook to consume the context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};