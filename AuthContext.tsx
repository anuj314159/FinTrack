// AuthContext.js
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, useAuthRequest, AuthSessionResult } from 'expo-auth-session';
import { auth, db } from './firebaseConfig'; // Adjust path if needed
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    signOut,
    onAuthStateChanged,
    User,
    GoogleAuthProvider,
    signInWithCredential
} from "firebase/auth";

// --- Constants ---
// Replace with your actual Client IDs from your original code
const ANDROID_CLIENT_ID = '395591440315-p5mirr8jh14u5rtcfknlle1eu0r512u1.apps.googleusercontent.com'; // Replace with your actual Android Client ID

WebBrowser.maybeCompleteAuthSession();

// Create the context
const AuthContext = createContext(null);

// Create the provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true); // Start true

    // --- Expo Auth Session Hook ---
    const redirectUri = makeRedirectUri({
        scheme: 'myapp', // Make sure this matches app.json scheme
        path: 'redirect'
    });

    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: ANDROID_CLIENT_ID,
        scopes: ['profile', 'email'],
    });

    // --- Effect for Firebase Auth State Listener ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                console.log("AuthContext: User is signed in:", firebaseUser.uid);
                setUser(firebaseUser);
            } else {
                console.log("AuthContext: User is signed out.");
                setUser(null);
            }
            setIsAuthLoading(false); // Stop loading once auth state is determined
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, []);

    // --- Effect to Handle Auth Response ---
    useEffect(() => {
        const handleAuthResponse = async (authResponse: AuthSessionResult) => {
            if (authResponse?.type === 'success') {
                const { authentication } = authResponse;
                if (authentication?.idToken) {
                    console.log("Google Auth Success, attempting Firebase sign-in...");
                    setIsAuthLoading(true); // Set loading during Firebase sign-in
                    try {
                        const credential = GoogleAuthProvider.credential(authentication.idToken);
                        const userCredential = await signInWithCredential(auth, credential);
                        console.log("Firebase Sign-In Successful via Context:", userCredential.user.uid);
                        // onAuthStateChanged will update the user state
                        Alert.alert('Login Successful', `Welcome, ${userCredential.user.displayName || userCredential.user.email}!`);
                        // You might want to trigger data sync here as well, perhaps pass sync function via context?
                    } catch (error: any) {
                        console.error("Firebase Sign-In Error:", error);
                        if (error.code === 'auth/account-exists-with-different-credential') {
                            Alert.alert('Login Failed', 'An account already exists with the same email address but different sign-in credentials. Try signing in using the original method.');
                        } else {
                            Alert.alert('Login Failed', `Could not sign in with Google credential: ${error.message}`);
                        }
                    } finally {
                         setIsAuthLoading(false);
                    }
                } else {
                    console.warn("Google Authentication successful, but no idToken found.");
                    Alert.alert('Login Issue', 'Could not retrieve necessary ID token from Google.');
                    setIsAuthLoading(false);
                }
            } else if (authResponse?.type === 'error') {
                console.error("Google Sign-In Error:", authResponse.error);
                Alert.alert('Login Failed', `An error occurred during Google Sign-In: ${authResponse.error?.message || 'Unknown error'}`);
                setIsAuthLoading(false);
            } else if (authResponse?.type === 'cancel' || authResponse?.type === 'dismiss') {
                 console.log("Google Sign-In cancelled or dismissed by user.");
                 setIsAuthLoading(false); // Stop loading if user cancelled
            }
        };

        if (response) {
            handleAuthResponse(response);
        }
    }, [response]);

    // --- Login Function ---
    const login = () => {
        if (!user && request) { // Check if request is available
            setIsAuthLoading(true); // Show loading indicator
            console.log("Prompting Google Sign-In via Context...");
            promptAsync(); // Start Google Sign-In flow
        } else if (user) {
            Alert.alert("Already Logged In", `You are signed in as ${user.email}.`);
        } else {
            console.warn("Login attempted, but auth request is not ready.");
            Alert.alert("Login Unavailable", "Google Sign-In is initializing. Please try again.");
        }
    };

    // --- Logout Function ---
    const logout = async () => {
        if (!user) return;
        setIsAuthLoading(true);
        try {
            await signOut(auth);
            // onAuthStateChanged will set user to null
            console.log("User logged out successfully via Context.");
            Alert.alert("Logged Out", "You have been signed out.");
        } catch (error: any) {
            console.error("Logout Error:", error);
            Alert.alert("Logout Failed", `Could not log out: ${error.message}`);
        } finally {
            setIsAuthLoading(false);
        }
    };

    // Provide state and functions to children
    const value = {
        user,
        isAuthLoading,
        login, // Provide the login function
        logout // Provide the logout function
        // Add other values like sync functions if needed globally
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the Auth Context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};