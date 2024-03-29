import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import {
    View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView,
    Platform, ActivityIndicator, Image // Ensure Image is imported
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ErrorBoundary } from 'react-error-boundary';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

// --- Firebase Imports (Keep if needed for OTHER features like Sync) ---
import { db } from '../../firebaseConfig.js'; // Assuming auth is handled solely by context now
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"; // Keep for sync

// --- Import Auth Context ---
// Make sure the path to your AuthContext file is correct
import { useAuth } from '../../AuthContext';

// --- Constants ---
// Keys to sync with Firestore (ensure this matches your needs)
const SYNC_KEYS = ['user_preferences', 'expenses', 'categories','analysisData'];
// Example App Version
const APP_VERSION = '1.0.1';

// --- Notification Configuration (Should be done once, possibly in App.js) ---
// Configure notifications (Consider moving this to a higher level like App.js if not already done)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// --- Helper Functions ---

// Function to register for push notifications with error handling
async function registerForPushNotificationsAsync(): Promise<string | undefined> {
    try { // Wrap the entire function
        let token;
        // Check and request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        // Handle final permission status
        if (finalStatus !== 'granted') {
            Alert.alert(
                'Permission Required',
                'Notifications are disabled. Please enable them in your device settings to receive reminders.'
            );
            return undefined; // Return undefined if permission not granted
        }
        // Get the token
        // Ensure you replace 'YOUR_EXPO_PROJECT_ID' with your actual project ID
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: '80becff7-106d-4331-b1c7-2ef99c8d50a1',
        })).data;
        console.log("Expo Push Token:", token);
        return token;
    } catch (error: any) {
        // Catch any unexpected errors during the process
        console.error("Error registering for push notifications:", error);
        // Alert the user about the failure
        Alert.alert(
            'Notification Error',
            `Failed to register for push notifications. Please try again later. ${error.message}`
        );
        return undefined; // Return undefined on error
    }
}

// --- Settings Page Component ---
const SettingsPage = () => {
    const navigation = useNavigation();
    const colorScheme = useColorScheme();

    // --- Local State for Settings Page Specifics ---
    const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
    const [darkMode, setDarkMode] = useState<boolean>(colorScheme === 'dark');
    const [currency, setCurrency] = useState<string>('INR');
    const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
    const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const [isSyncing, setIsSyncing] = useState<boolean>(false); // Loading state specific to sync actions

    // --- Get Global Auth State and Functions from Context ---
    // Assuming useAuth hook handles its own loading/error states internally if needed
    const { user, isAuthLoading, login, logout } = useAuth();

    // --- Effects ---

    // Effect for Notification Setup
    useEffect(() => {
        // Register for notifications
        registerForPushNotificationsAsync().then(token => {
            if (token) { // Only set token if registration was successful
                setExpoPushToken(token);
            }
        });
        // Add notification listeners
        try {
            notificationListener.current = Notifications.addNotificationReceivedListener(setNotification);
            responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                console.log("Notification Response Received:", response);
                // Handle notification tap response if needed (e.g., navigate to a specific screen)
            });
        } catch (error) {
            console.error("Error adding notification listeners:", error);
        }
        // Cleanup listeners on unmount
        return () => {
            try {
                if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
                if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
            } catch (error) {
                 console.error("Error removing notification listeners:", error);
            }
        };
    }, []);

    // Effect to Load Preferences on Focus
     useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const loadPreferences = async () => {
                 console.log("Loading preferences...");
                try { // Wrap AsyncStorage and JSON parsing
                    const storedPrefs = await AsyncStorage.getItem('user_preferences');
                    if (isActive && storedPrefs) {
                        // Safely parse JSON
                        let prefs = {};
                        try {
                            prefs = JSON.parse(storedPrefs);
                        } catch (parseError) {
                            console.error("Failed to parse user_preferences JSON:", parseError);
                            // Optionally reset to defaults or alert user
                            Alert.alert("Settings Error", "Could not load saved preferences due to corrupted data. Resetting to defaults.");
                            await AsyncStorage.removeItem('user_preferences'); // Remove corrupted data
                            prefs = {}; // Use default object
                        }

                        console.log("Loaded Prefs:", prefs);
                        // Use nullish coalescing for safer default values
                        setNotificationsEnabled(prefs.notificationsEnabled ?? true);
                        setCurrency(prefs.currency ?? 'INR');
                        updateCurrencySymbol(prefs.currency ?? 'INR');
                    } else if (isActive) {
                         console.log("No stored prefs found, using defaults.");
                        // Set defaults if no preferences are stored
                        setCurrency('INR');
                        updateCurrencySymbol('INR');
                        setNotificationsEnabled(true);
                    }
                    // Update dark mode based on current system setting outside the try block
                    if (isActive) {
                        setDarkMode(colorScheme === 'dark');
                    }
                } catch (error: any) {
                    // Catch errors from AsyncStorage.getItem itself
                    console.error("AsyncStorage load error (user_preferences):", error);
                    if (isActive) {
                        Alert.alert("Error", `Failed to load preferences: ${error.message}`);
                        // Optionally set defaults here as well
                        setCurrency('INR');
                        updateCurrencySymbol('INR');
                        setNotificationsEnabled(true);
                        setDarkMode(colorScheme === 'dark');
                    }
                }
            };
            loadPreferences();
            // Cleanup function for when the effect is re-run or component unmounts
            return () => { isActive = false; };
        }, [colorScheme]) // Rerun if color scheme changes while screen is focused
    );

    // Effect to Save Preferences & Sync (if logged in) when they change
    useEffect(() => {
        // Update dark mode state based on system preference first
        setDarkMode(colorScheme === 'dark');

        const savePreferences = async () => {
            try { // Wrap AsyncStorage setItem and subsequent actions
                // Prepare preferences object (excluding dark mode)
                const prefsToSave = { notificationsEnabled, currency };
                // Safely stringify (less likely to fail here, but good practice)
                const prefsString = JSON.stringify(prefsToSave);
                // Save to AsyncStorage
                await AsyncStorage.setItem('user_preferences', prefsString);
                // Update currency symbol locally (safe operation)
                 updateCurrencySymbol(currency);
                console.log("Preferences saved:", prefsToSave);

                // Reschedule notifications (wrap this async call)
                try {
                    await scheduleDailyNotification();
                } catch (scheduleError) {
                    console.error("Failed to reschedule notifications after saving preferences:", scheduleError);
                    // Optionally alert user, but might be too noisy
                }

                // Sync this specific preference key to Firestore if user is logged in
                // The sync function itself has error handling
                if (user) {
                    console.log("User logged in, attempting to sync preferences to Firestore.");
                    await syncSpecificKeyToFirestore('user_preferences');
                }

            } catch (error: any) {
                // Catch errors from AsyncStorage.setItem or JSON.stringify
                console.error("AsyncStorage save/sync error (user_preferences):", error);
                Alert.alert("Error", `Failed to save preferences: ${error.message}`);
            }
        };
        // Call the save function
        savePreferences();

    }, [notificationsEnabled, currency, colorScheme, user]); // Dependencies: re-run if these change


     // --- Helper Functions ---

    // Update Currency Symbol based on selected currency (Safe synchronous function)
    const updateCurrencySymbol = (currentCurrency: string) => {
        let symbol = '₹'; // Default
        switch (currentCurrency) {
            case 'USD': symbol = '$'; break;
            case 'EUR': symbol = '€'; break;
            case 'GBP': symbol = '£'; break;
            case 'JPY': symbol = '¥'; break;
            case 'INR': symbol = '₹'; break;
            // Add more currencies as needed
        }
        setCurrencySymbol(symbol);
    };

    // Schedule or cancel daily notifications based on `notificationsEnabled` state
    const scheduleDailyNotification = async () => {
         try { // Wrap notification scheduling logic
            // Cancel all previous notifications first
            await Notifications.cancelAllScheduledNotificationsAsync();
            console.log("Cancelled existing scheduled notifications.");

            // Schedule new ones only if enabled
            if (notificationsEnabled) {
                // Example: Schedule for 5 PM
                await Notifications.scheduleNotificationAsync({
                    content: { title: "Daily Expense Reminder", body: "Time to record today's transactions!", sound: 'default' },
                    trigger: { hour: 17, minute: 0, repeats: true },
                });
                console.log("Scheduled notification for 5 PM");

                // Example: Schedule for 10 AM
                await Notifications.scheduleNotificationAsync({
                    content: { title: "Morning Reminder", body: "Good morning! Track your expenses today.", sound: 'default' },
                    trigger: { hour: 10, minute: 0, repeats: true },
                });
                console.log("Scheduled notification for 10 AM");
            } else {
                console.log("Notifications reminders disabled, none scheduled.");
            }
        } catch (error: any) {
            // Catch errors during cancellation or scheduling
            console.error("Error scheduling/cancelling notifications:", error);
            // Alert user about the failure
            Alert.alert("Notification Error", `Failed to update notification schedule: ${error.message}`);
            // Re-throw the error if needed for higher-level handling
            // throw error;
        }
    };

    // --- Firestore Sync Functions (Use global `user` from context) ---

    // Syncs *all* defined SYNC_KEYS from AsyncStorage to Firestore
    const syncAllDataToFirestore = async () => {
        // Check for user upfront
        if (!user?.uid) {
            Alert.alert("Sync Error", "You must be logged in to sync data to the cloud.");
            return;
        }
        setIsSyncing(true); // Indicate loading
        console.log(`Starting sync TO Firestore for user ${user.uid}...`);
        try { // Wrap the entire sync process
            const dataToSync: { [key: string]: any } = {
                // Metadata for the sync operation
                lastSyncedToServer: serverTimestamp(), // Use server time for consistency
                appVersion: APP_VERSION,
                platform: Platform.OS,
            };
            // Get data for all keys defined in SYNC_KEYS from AsyncStorage
            const asyncData = await AsyncStorage.multiGet(SYNC_KEYS);
            // Process the retrieved data
            asyncData.forEach(([key, value]) => {
                if (value !== null) {
                    try {
                        // Attempt to parse JSON, store original string if it fails
                        dataToSync[key] = JSON.parse(value);
                    } catch (e) {
                        console.warn(`Could not parse JSON for key "${key}" during sync to Firestore. Storing as string.`);
                        dataToSync[key] = value;
                    }
                }
            });

             // Check if there's actual app data to sync besides metadata
             if (Object.keys(dataToSync).length > 3) { // 3 = metadata keys
                const userDocRef = doc(db, "userSettings", user.uid);
                // Perform the Firestore write operation (merge to avoid overwriting other fields)
                await setDoc(userDocRef, dataToSync, { merge: true });
                Alert.alert("Sync Complete", "Your data has been successfully backed up to the cloud.");
                console.log("Firestore sync successful.");
             } else {
                 // Inform user if no data was found locally to sync
                 Alert.alert("Sync Info", "No local data found to back up.");
                 console.log("No data found in AsyncStorage for specified keys to sync.");
             }
        } catch (error: any) {
            // Catch errors from AsyncStorage or Firestore operations
            console.error("Firestore Sync Error (syncAllDataToFirestore):", error);
            Alert.alert("Sync Failed", `Could not back up data to the cloud. Please check your connection and try again. ${error.message}`);
        } finally {
            setIsSyncing(false); // Stop loading indicator regardless of outcome
        }
    };

    // Syncs only a specific key from AsyncStorage to Firestore
    const syncSpecificKeyToFirestore = async (keyToSync: string) => {
         // Ensure user is logged in and the key is valid for syncing
         if (!user?.uid || !SYNC_KEYS.includes(keyToSync)) {
             console.log(`Skipping sync for key "${keyToSync}" (User not logged in or key not syncable).`);
             return;
         }

        console.log(`Syncing specific key "${keyToSync}" to Firestore for user ${user.uid}...`);
        try { // Wrap the specific key sync process
            // Get the value from AsyncStorage
            const value = await AsyncStorage.getItem(keyToSync);
            // Proceed only if a value exists
            if (value !== null) {
                let parsedValue;
                 try {
                    // Attempt to parse if it's JSON
                    parsedValue = JSON.parse(value);
                 } catch (e) {
                    // Store as string if not valid JSON
                    console.warn(`Could not parse JSON for key "${keyToSync}" during specific sync. Storing as string.`);
                    parsedValue = value;
                 }
                // Get Firestore document reference
                const userDocRef = doc(db, "userSettings", user.uid);
                // Perform Firestore write (merge to update only this key and timestamp)
                await setDoc(userDocRef, {
                    [keyToSync]: parsedValue,
                    lastSyncedToServer: serverTimestamp() // Update sync time
                 }, { merge: true });
                console.log(`Successfully synced key "${keyToSync}" to Firestore.`);
             } else {
                 console.log(`No value found locally for key "${keyToSync}" to sync.`);
             }
        } catch (error: any) {
            // Catch errors from AsyncStorage or Firestore
            // Log error without necessarily alerting the user for background syncs
            console.error(`Firestore Sync Error (Specific key: ${keyToSync}):`, error);
            // Consider if an alert is needed here depending on the key's importance
        }
    }

    // Syncs data *from* Firestore to AsyncStorage, overwriting local keys
    const syncDataFromFirestore = async () => {
        // Check for user upfront
        if (!user?.uid) {
            Alert.alert("Sync Error", "You must be logged in to restore data from the cloud.");
            return;
        }
         setIsSyncing(true); // Indicate loading
         console.log(`Starting sync FROM Firestore for user ${user.uid}...`);
        try { // Wrap the entire restore process
            const userDocRef = doc(db, "userSettings", user.uid);
            // Get the Firestore document
            const docSnap = await getDoc(userDocRef);

            // Check if the document exists
            if (docSnap.exists()) {
                const firestoreData = docSnap.data();
                console.log("Data retrieved from Firestore:", firestoreData);
                const itemsToSet: [string, string][] = []; // Array for AsyncStorage multiSet
                let prefsChanged = false; // Flag to update local state if preferences change

                // Iterate through keys designated for syncing
                for (const key of SYNC_KEYS) {
                    // Check if the key exists in the retrieved Firestore data
                    if (firestoreData.hasOwnProperty(key) && firestoreData[key] !== undefined) {
                        try { // Wrap stringification for safety
                            // Stringify non-string data before storing in AsyncStorage
                            const valueString = typeof firestoreData[key] === 'string'
                                ? firestoreData[key]
                                : JSON.stringify(firestoreData[key]);
                            itemsToSet.push([key, valueString]);
                            // If user_preferences were synced, set flag
                            if (key === 'user_preferences') prefsChanged = true;
                        } catch (stringifyError) {
                            console.error(`Failed to stringify data for key "${key}" from Firestore:`, stringifyError);
                            // Skip this key if stringification fails
                        }
                    }
                }

                 // If any valid data was prepared for AsyncStorage
                 if (itemsToSet.length > 0) {
                    // Update AsyncStorage with the retrieved data
                    await AsyncStorage.multiSet(itemsToSet);
                    Alert.alert("Restore Complete", "Your data has been restored from the cloud backup.");
                    console.log("AsyncStorage updated from Firestore.");

                    // If preferences were updated, reload them into the local state
                    if (prefsChanged) {
                         console.log("Preferences updated from Firestore, reloading local state...");
                         // Re-use the loading logic (or parts of it) to update state
                         // This assumes loadPreferences correctly handles defaults and parsing
                         try {
                             const storedPrefs = await AsyncStorage.getItem('user_preferences');
                             if (storedPrefs) {
                                 const prefs = JSON.parse(storedPrefs); // Assume parsing works now
                                 setNotificationsEnabled(prefs.notificationsEnabled ?? true);
                                 setCurrency(prefs.currency ?? 'INR');
                                 updateCurrencySymbol(prefs.currency ?? 'INR');
                             }
                         } catch (reloadError) {
                              console.error("Error reloading preferences state after restore:", reloadError);
                              Alert.alert("Settings Update Error", "Restored data, but failed to update settings view. Please restart the app.");
                         }
                    }
                 } else {
                     // No relevant data found in Firestore for the SYNC_KEYS
                     Alert.alert("Restore Info", "No relevant app data found in your cloud backup to restore.");
                 }
            } else {
                // No document exists for this user in Firestore
                console.log("No settings document found for this user in Firestore.");
                Alert.alert("Restore Info", "No cloud backup found for your account.");
            }
        } catch (error: any) {
            // Catch errors from Firestore or AsyncStorage operations
            console.error("Firestore Sync Error (syncDataFromFirestore):", error);
            Alert.alert("Restore Failed", `Could not restore data from the cloud. Please check your connection and try again. ${error.message}`);
        } finally {
            setIsSyncing(false); // Stop loading indicator
        }
    };

    // --- Action Handlers ---

    // Clear LOCAL data (excluding auth keys)
    const handleClearData = async () => {
        // Confirmation dialog
        Alert.alert(
            'Confirm Clear Local Data',
            'This will remove app data stored ONLY on this device (like expenses, categories, preferences). Your cloud backup (if any) and login status will NOT be affected. This action cannot be undone locally. Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' }, // Cancel button
                {
                    text: 'Clear Local Data', style: 'destructive', // Destructive action button
                    onPress: async () => {
                        setIsSyncing(true); // Use sync indicator for visual feedback
                        console.log("Attempting to clear local data...");
                        try { // Wrap the data clearing process
                            // Get all keys currently in AsyncStorage
                            const allKeys = await AsyncStorage.getAllKeys();
                            // Define keys to preserve (Firebase internal keys, potentially device info)
                            const keysToPreserve = allKeys.filter(key =>
                                key.startsWith('firebase:') ||
                                key.startsWith('@firebase') ||
                                key.includes('ExpoDevice') // Example: Keep Expo device identifier
                                // Add any other essential keys here
                            );
                            // Determine keys to remove by excluding preserved keys
                            const keysToRemove = allKeys.filter(key => !keysToPreserve.includes(key));

                            console.log("Keys to remove:", keysToRemove);
                            console.log("Keys to preserve:", keysToPreserve);

                            // Perform removal only if there are keys to remove
                            if (keysToRemove.length > 0) {
                                await AsyncStorage.multiRemove(keysToRemove);
                                console.log("Local AsyncStorage data cleared (excluding essential keys).");
                            } else {
                                console.log("No local data found to clear.");
                            }

                            // Reset local component state to defaults AFTER clearing storage
                            setNotificationsEnabled(true);
                            setCurrency('INR');
                            updateCurrencySymbol('INR');
                            // Reset other relevant local states if necessary

                            Alert.alert('Local Data Cleared', 'App data on this device has been reset to defaults.');
                            // Optional: Trigger a reload or navigation reset if the app state depends heavily on cleared data
                        } catch (error: any) {
                            // Catch errors during key retrieval or removal
                            console.error("AsyncStorage clear error:", error);
                            Alert.alert('Error', `Failed to clear local data: ${error.message}`);
                        } finally {
                            setIsSyncing(false); // Stop loading indicator
                        }
                    }
                }
            ],
            { cancelable: true } // Allow dismissing the alert by tapping outside
        );
    };

    // Download local AsyncStorage data as CSV
    const handleDownloadData = async () => {
        console.log("Attempting to download local data...");
        try { // Wrap the download and sharing process
            // Get all data from AsyncStorage
            const allKeys = await AsyncStorage.getAllKeys();
            const data = await AsyncStorage.multiGet(allKeys);

            // Format data as CSV
            let csvContent = "Key,Value\n"; // CSV Header
            data.forEach(([key, value]) => {
                try { // Wrap potential formatting errors for individual rows
                    // Format value for CSV: escape double quotes by doubling them
                    const formattedValue = value ? value.replace(/"/g, '""') : '';
                    // Enclose key and value in double quotes for robustness
                    csvContent += `"${key}","${formattedValue}"\n`;
                } catch (formatError) {
                     console.error(`Error formatting row for key "${key}":`, formatError);
                     // Add a placeholder or skip the row
                     csvContent += `"${key}","ERROR_FORMATTING_VALUE"\n`;
                }
            });

            // Create a unique filename using timestamp
            const filename = `app_local_data_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
            // Define the file path in the app's cache directory
            const fileUri = `${FileSystem.cacheDirectory}${filename}`;

            // Write the CSV string to the file
            await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
            console.log(`Local data saved to CSV: ${fileUri}`);

            // Check if sharing is available on the device
            if (await Sharing.isAvailableAsync()) {
                // Share the created file
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv', // Set MIME type for CSV
                    dialogTitle: 'Share Local App Data Backup' // Title for the share dialog
                });
            } else {
                // Inform user if sharing is not possible
                Alert.alert('Sharing Not Available', 'Could not share the data file. You might need to manually access it from the cache directory if possible.');
            }
        } catch (error: any) {
            // Catch errors during AsyncStorage access, file writing, or sharing
            console.error("Error downloading/sharing local data:", error);
            Alert.alert('Download Error', `Failed to create or share the local data backup: ${error.message}`);
        }
    };

    // --- Navigation/Linking Handlers (with basic error handling) ---
    const handleContactUs = async () => {
        const email = 'support@example.com'; // Replace with your support email
        const subject = 'App Support Request';
        const body = `Device Info:\nPlatform: ${Platform.OS}\nVersion: ${APP_VERSION}\n\nPlease describe your issue:\n`;
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        try {
            // Check if the URL can be opened
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                console.error(`Mail URL not supported: ${url}`);
                Alert.alert('Error', 'Could not open email app. Please contact us directly at ' + email);
            }
        } catch (error) {
            console.error('Failed to open mail app:', error);
            Alert.alert('Error', 'An error occurred while trying to open the email app.');
        }
    };

    const handleRateApp = async () => {
        // Replace with your actual App Store/Play Store links or IDs
        const APP_STORE_ID = null; // e.g., 123456789
        const PLAY_STORE_PACKAGE = 'com.anuj149.budgetbuddy'; // e.g., com.example.myapp

        // Construct platform-specific URL
        const url = Platform.OS === 'ios'
            ? `itms-apps://itunes.apple.com/app/id${APP_STORE_ID}?action=write-review`
            : `market://details?id=${PLAY_STORE_PACKAGE}`;

        try {
            // Check if the URL can be opened
             const supported = await Linking.canOpenURL(url);
             if (supported) {
                await Linking.openURL(url);
             } else {
                 console.error(`Store URL not supported: ${url}`);
                 // Fallback: Open web URL if direct link fails (optional)
                 const webUrl = Platform.OS === 'ios'
                     ? `https://apps.apple.com/app/id${APP_STORE_ID}`
                     : `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
                 const webSupported = await Linking.canOpenURL(webUrl);
                 if (webSupported) {
                     await Linking.openURL(webUrl);
                 } else {
                     Alert.alert('Error', 'Could not open the app store or website.');
                 }
             }
        } catch (error) {
            console.error('Failed to open app store:', error);
            Alert.alert('Error', 'An error occurred while trying to open the app store.');
        }
    };

    const handleShareApp = async () => {
        try {
            const message = 'Check out this awesome expense tracker app!'; // Customize your message
            // Add your app's website or store link here if available
            const url = 'https://example.com';
            await Sharing.share({
                message: message,
                // url: url // Optional: include a URL to share
                title: 'Share this App' // Optional: Title for the share sheet (Android)
            });
        } catch (error: any) {
            // Catch errors during the sharing process
            console.error("Error sharing app:", error);
            // Provide specific feedback if the user cancelled vs. an actual error
            if (error.code === 'USER_CANCELLED') {
                 console.log('Share action cancelled by user.');
            } else {
                 Alert.alert('Share Error', `Could not share the app: ${error.message}`);
            }
        }
    };

    // --- Dynamic Theme ---
    // (Theme object remains the same - no error handling needed here)
    const theme = {
        background: darkMode ? '#121212' : '#f5f5f5',
        box: darkMode ? '#1e1e1e' : '#ffffff',
        text: darkMode ? '#e1e1e1' : '#1c1c1e',
        separator: darkMode ? '#333' : '#e0e0e0',
        primary: '#007AFF',
        destructive: '#FF3B30',
        disabled: darkMode ? '#555' : '#aaa',
        success: '#34C759',
    };

    // --- Error Fallback Component (for ErrorBoundary) ---
    // (Error Fallback remains the same - it's the safety net)
    const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) => (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: theme.background }}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.destructive} />
            <Text style={{ fontSize: 18, color: theme.text, textAlign: 'center', marginVertical: 15 }}>
                Oops! Something went wrong.
            </Text>
            <Text style={{ fontSize: 14, color: theme.disabled, textAlign: 'center', marginBottom: 20 }}>
                 Error: {error.message}
            </Text>
            <TouchableOpacity
                onPress={resetErrorBoundary} // Function to attempt recovery (e.g., re-render)
                style={{ backgroundColor: theme.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 }}
            >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Try again</Text>
            </TouchableOpacity>
        </View>
    );

    // --- Render Logic ---
    // The main ErrorBoundary already wraps the entire render output
    return (
        <ErrorBoundary FallbackComponent={ErrorFallback}>
            <ScrollView
                style={[styles.container, { backgroundColor: theme.background }]}
                contentContainerStyle={{ paddingBottom: 40 }} // Space at bottom
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside input
            >

                {/* === Authentication Section === */}
                 <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                     <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>
                     {/* Show loader ONLY during auth actions (login/logout) */}
                     {isAuthLoading && <ActivityIndicator size="small" color={theme.primary} style={styles.inlineLoader} />}

                     {/* --- Login Button (Show if not loading and not logged in) --- */}
                     {!isAuthLoading && !user && (
                        <View style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
                             <TouchableOpacity
                                onPress={login} // Use login function from context (assume it has its own error handling)
                                disabled={isAuthLoading} // Disable while loading
                                style={[
                                    styles.button,
                                    styles.googleButton,
                                    isAuthLoading && { opacity: 0.5 } // Dim if disabled
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel="Sign in with Google"
                             >
                                <Ionicons name="logo-google" size={20} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.googleButtonText}>Sign in with Google</Text>
                            </TouchableOpacity>
                        </View>
                     )}

                     {/* --- Logged In View (Show if not loading and logged in) --- */}
                     {!isAuthLoading && user && (
                         <View style={styles.loggedInContainer}>
                             {/* User Info Row */}
                             <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                 {/* Display user avatar or fallback icon */}
                                 {user.photoURL ? (
                                     <Image source={{ uri: user.photoURL }} style={styles.avatar} accessibilityLabel="User avatar"/>
                                 ) : (
                                     <Ionicons name="person-circle-outline" size={30} color={theme.text} style={[styles.avatar, { backgroundColor: theme.separator }]}/>
                                 )}
                                 {/* Display user name or email */}
                                 <Text style={[styles.loggedInText, { color: theme.text, flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
                                     Signed in as: <Text style={{ fontWeight: 'bold' }}>{user.displayName || user.email || 'User'}</Text>
                                 </Text>
                             </View>
                             {/* Logout Button */}
                            <TouchableOpacity
                                 onPress={logout} // Use logout function from context (assume it has its own error handling)
                                 disabled={isAuthLoading} // Disable while loading
                                 style={[
                                     styles.button,
                                     styles.logoutButton,
                                     { backgroundColor: theme.destructive }, // Use theme color
                                     isAuthLoading && { opacity: 0.5 }
                                 ]}
                                 accessibilityRole="button"
                                 accessibilityLabel="Logout"
                             >
                                 <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                 <Text style={styles.buttonText}>Logout</Text>
                             </TouchableOpacity>
                        </View>
                     )}
                </View>

                {/* === Cloud Sync Section (Only show if logged in) === */}
                 {user && ( // Conditionally render based on user state from context
                    <View style={[styles.sectionContainer, { backgroundColor: theme.box, opacity: isSyncing ? 0.6 : 1.0 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Cloud Sync</Text>
                        {/* Show loader specifically for sync actions */}
                        {isSyncing && <ActivityIndicator size="small" color={theme.primary} style={styles.inlineLoader} />}
                         {/* Sync Buttons Row */}
                         <View style={styles.syncButtonsContainer}>
                             {/* Backup Button */}
                             <TouchableOpacity
                                onPress={syncAllDataToFirestore} // Already wrapped in try/catch
                                disabled={isSyncing} // Disable during sync
                                style={[styles.button, styles.syncButton, { marginRight: 5, backgroundColor: theme.primary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Backup data to cloud"
                            >
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                 <Text style={styles.buttonText}>Backup Now</Text>
                             </TouchableOpacity>
                             {/* Restore Button */}
                            <TouchableOpacity
                                onPress={syncDataFromFirestore} // Already wrapped in try/catch
                                disabled={isSyncing} // Disable during sync
                                style={[styles.button, styles.syncButton, { marginLeft: 5, backgroundColor: theme.success } ]} // Use theme green
                                accessibilityRole="button"
                                accessibilityLabel="Restore data from cloud"
                            >
                                 <Ionicons name="cloud-download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Restore</Text>
                             </TouchableOpacity>
                         </View>
                         {/* Info Text */}
                         <Text style={[styles.syncInfoText, { color: theme.disabled }]}>
                             Restoring overwrites local data (expenses, categories, preferences) with your latest cloud backup.
                         </Text>
                    </View>
                 )}


                {/* === General Preferences Section === */}
                {/* (No major error handling needed here besides what's in the useEffect for loading/saving) */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                     <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
                     {/* --- Notifications Setting --- */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="notifications-outline" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Daily Reminders</Text>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled} // State change triggers useEffect for saving/scheduling
                            thumbColor={Platform.OS === 'android' ? (notificationsEnabled ? theme.primary : theme.separator) : undefined}
                            trackColor={{ false: theme.separator, true: theme.primary }}
                            ios_backgroundColor={theme.separator}
                            accessibilityLabel="Enable daily reminder notifications"
                            accessibilityValue={{ text: notificationsEnabled ? 'On' : 'Off' }}
                        />
                    </View>
                    <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                    {/* --- Dark Mode Setting (Informational) --- */}
                    <View style={styles.settingItem}>
                         <View style={styles.settingLabelContainer}>
                            <Ionicons name={darkMode ? "moon" : "moon-outline"} size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
                        </View>
                        <Text style={{ color: theme.disabled }}>Follows System</Text>
                    </View>
                     <View style={[styles.separator, { backgroundColor: theme.separator }]} />

                     {/* --- Currency Setting --- */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="cash-outline" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Currency</Text>
                        </View>
                        <Picker
                            selectedValue={currency}
                            onValueChange={(itemValue) => setCurrency(itemValue)} // State change triggers useEffect for saving
                            style={[styles.picker, Platform.OS === 'ios' ? {} : { color: theme.text, backgroundColor: theme.box }]}
                            itemStyle={{ color: theme.text }} // iOS item text color
                            dropdownIconColor={theme.text} // Android dropdown arrow color
                            mode="dropdown" // Use dropdown mode on Android
                            accessibilityLabel={`Select default currency. Currently selected: ${currency}`}
                        >
                            <Picker.Item label={`INR (${currencySymbol})`} value="INR" />
                            <Picker.Item label={`USD ($)`} value="USD" />
                            <Picker.Item label={`EUR (€)`} value="EUR" />
                            <Picker.Item label={`GBP (£)`} value="GBP" />
                            <Picker.Item label={`JPY (¥)`} value="JPY" />
                        </Picker>
                    </View>
                 </View>


                 {/* === About & Support Section === */}
                 {/* (Linking handlers now have try/catch) */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>About & Support</Text>
                    {/* --- About Link --- */}
                    <TouchableOpacity onPress={() => navigation.navigate('About')} style={styles.linkItem} accessibilityRole="link">
                        <Ionicons name="information-circle-outline" size={22} color={theme.primary} style={styles.icon} />
                        <Text style={[styles.linkText, { color: theme.primary }]}>About This App</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.disabled} />
                     </TouchableOpacity>
                     <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                     {/* --- Contact Link --- */}
                    <TouchableOpacity onPress={handleContactUs} style={styles.linkItem} accessibilityRole="link">
                         <Ionicons name="mail-outline" size={22} color={theme.primary} style={styles.icon} />
                        <Text style={[styles.linkText, { color: theme.primary }]}>Contact Support</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.disabled} />
                     </TouchableOpacity>
                     <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                     {/* --- Rate App Link --- */}
                     <TouchableOpacity onPress={handleRateApp} style={styles.linkItem} accessibilityRole="link">
                         <Ionicons name="star-outline" size={22} color={theme.primary} style={styles.icon} />
                        <Text style={[styles.linkText, { color: theme.primary }]}>Rate This App</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.disabled} />
                     </TouchableOpacity>
                     <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                     {/* --- Share App Link --- */}
                    <TouchableOpacity onPress={handleShareApp} style={styles.linkItem} accessibilityRole="button">
                         <Ionicons name="share-social-outline" size={22} color={theme.primary} style={styles.icon} />
                        <Text style={[styles.linkText, { color: theme.primary }]}>Share App</Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.disabled} />
                     </TouchableOpacity>
                     <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                     {/* --- App Version Info --- */}
                     <View style={styles.linkItem}>
                         <Ionicons name="build-outline" size={22} color={theme.text} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text, flex: 1 }]}>App Version</Text>
                        <Text style={{ color: theme.disabled }}>{APP_VERSION}</Text>
                    </View>
                 </View>


                 {/* === Advanced Data Management Section === */}
                 {/* (Handlers for buttons now have try/catch) */}
                 <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                     {/* --- Toggle Button --- */}
                    <TouchableOpacity
                        style={styles.linkItem}
                        onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showAdvancedSettings }}
                        accessibilityLabel="Toggle Advanced Data Management section"
                    >
                         <View style={styles.settingLabelContainer}>
                            <Ionicons name="cog-outline" size={22} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text, flex: 1 }]}>Advanced Data Management</Text>
                         </View>
                         <Ionicons name={showAdvancedSettings ? "chevron-up" : "chevron-down"} size={20} color={theme.disabled} />
                    </TouchableOpacity>

                    {/* --- Collapsible Content --- */}
                    {showAdvancedSettings && (
                        <View style={{ paddingHorizontal: 15, paddingBottom: 15 }}>
                             <View style={[styles.separator, { backgroundColor: theme.separator, marginVertical: 10, marginLeft: 0 }]} />
                             {/* --- Download Data Button --- */}
                             <TouchableOpacity
                                onPress={handleDownloadData} // Already wrapped in try/catch
                                style={[styles.button, styles.advancedButton, { borderColor: theme.primary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Download local app data as CSV file"
                             >
                                <Ionicons name="download-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
                                <Text style={{ color: theme.primary, fontWeight: '600' }}>Download Local Data (CSV)</Text>
                            </TouchableOpacity>
                             {/* --- Clear Data Button --- */}
                            <TouchableOpacity
                                onPress={handleClearData} // Already wrapped in try/catch with confirmation
                                style={[styles.button, styles.advancedButton, { borderColor: theme.destructive, marginTop: 15 }]}
                                accessibilityRole="button"
                                accessibilityLabel="Clear local app data from this device"
                            >
                                <Ionicons name="trash-outline" size={20} color={theme.destructive} style={{ marginRight: 8 }} />
                                <Text style={{ color: theme.destructive, fontWeight: '600' }}>Clear Local App Data</Text>
                            </TouchableOpacity>
                            {/* --- Warning Text --- */}
                            <Text style={[styles.syncInfoText, { color: theme.disabled, marginTop: 10, textAlign: 'left' }]}>
                                 Clearing data only affects this device and cannot be undone locally. It does not delete your cloud backup or log you out.
                             </Text>
                        </View>
                    )}
                 </View>

            </ScrollView>
        </ErrorBoundary>
    );
};


// --- Styles ---
// (Styles remain the same)
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sectionContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        minHeight: 50,
    },
    linkItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 15,
        minHeight: 50,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        paddingRight: 10,
    },
    icon: {
        marginRight: 15,
        width: 24,
        textAlign: 'center',
    },
    settingText: {
        fontSize: 16,
    },
     linkText: {
        fontSize: 16,
        flex: 1,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 15 + 24 + 15,
    },
    picker: {
        width: Platform.OS === 'ios' ? 130 : 150,
        height: 50,
        transform: Platform.OS === 'ios' ? [] : [{ scaleX: 0.9 }, { scaleY: 0.9 }],
        marginRight: Platform.OS === 'ios' ? 0 : -10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    googleButton: {
        backgroundColor: '#4285F4',
        marginVertical: 10,
    },
     googleButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutButton: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginTop: 5,
        alignSelf: 'flex-start',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    loggedInContainer: {
        paddingHorizontal: 15,
        paddingBottom: 15,
        paddingTop: 5,
    },
    loggedInText: {
        fontSize: 15,
        marginLeft: 10,
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    syncButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        marginVertical: 10,
    },
    syncButton: {
        flex: 1,
    },
    syncInfoText: {
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 15,
        marginTop: 0,
        marginBottom: 10,
    },
    advancedButton: {
        borderWidth: 1.5,
        backgroundColor: 'transparent',
        paddingVertical: 10,
    },
    inlineLoader: {
        position: 'absolute',
        right: 15,
        top: 18,
    }
});

export default SettingsPage;
