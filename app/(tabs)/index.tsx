import React, { useEffect, useState, useCallback } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router'; // Keep useRouter
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
  Dimensions,
  Platform,
  Modal,
  TextInput, // Import Dimensions
} from 'react-native';
import { Link } from 'expo-router';

// Key for storing expense data (ensure this matches AddData.js)
const STORAGE_KEY = 'expenses';
// Key for storing user preferences (to get currency)
const PREFS_KEY = 'user_preferences';

// --- Index Page Component ---
const IndexPage = () => {
    // --- State Variables ---
    const [entries, setEntries] = useState([]); // Array to hold expense/income entries
    const [totals, setTotals] = useState({ Expense: 0, Income: 0, Borrowing: 0 }); // Totals for each type
    const [balance, setBalance] = useState(0); // Calculated balance
    const [editModalVisible, setEditModalVisible] = useState(false); // Visibility state for edit modal
    const [selectedEntry, setSelectedEntry] = useState(null); // Entry currently being edited
    const [editedAmount, setEditedAmount] = useState(''); // Edited amount in modal input
    const [editedNature, setEditedNature] = useState(''); // Edited nature in modal picker/input
    const [editedOtherNature, setEditedOtherNature] = useState(''); // Custom nature input value
    const [showOtherNatureInput, setShowOtherNatureInput] = useState(false); // Whether to show custom nature input
    const [currencySymbol, setCurrencySymbol] = useState('₹'); // Default currency symbol
    const [isLoading, setIsLoading] = useState(true); // Loading state
    const [error, setError] = useState(null); // Error state

    // --- Hooks ---
    const colorScheme = useColorScheme(); // Get system color scheme (light/dark)
    const router = useRouter(); // Router hook for navigation

    // --- Dynamic Theme ---
    const theme = {
        background: colorScheme === 'dark' ? '#121212' : '#f5f5f5',
        box: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
        text: colorScheme === 'dark' ? '#e1e1e1' : '#1c1c1e',
        separator: colorScheme === 'dark' ? '#333' : '#e0e0e0',
        primary: '#007AFF',
        destructive: '#FF3B30',
        success: '#34C759',
        warning: '#FF9500',
        disabled: colorScheme === 'dark' ? '#555' : '#aaa',
        inputBg: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
        inputBorder: colorScheme === 'dark' ? '#444' : '#ddd',
        modalBg: colorScheme === 'dark' ? '#252525' : '#ffffff',
        expenseColor: colorScheme === 'dark' ? '#5c2a2a' : '#ffdddd',
        incomeColor: colorScheme === 'dark' ? '#2a5c2a' : '#dfffdc',
        borrowingColor: colorScheme === 'dark' ? '#614a1f' : '#ffe0b2',
        balanceColor: colorScheme === 'dark' ? '#1f4f5c' : '#e0f7fa',
        textSecondary: colorScheme === 'dark' ? '#b0b0b0' : '#666666',

    };
    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null || isNaN(amount)) {
          return `${currencySymbol} 0.00`;
        }
        return `${currencySymbol}${amount.toFixed(2)}`;
      };

    // --- Data Fetching and Processing ---

    // Function to fetch data from AsyncStorage and update state
    const fetchData = useCallback(async () => {
        let isMounted = true; // Flag to prevent state updates on unmounted component
        console.log("Fetching data and preferences...");
        setIsLoading(true); // Set loading state
        setError(null); // Reset error state

        try {
            // Fetch expenses/entries
            const storedEntries = await AsyncStorage.getItem(STORAGE_KEY);
            let entryData = []; // Default to empty array

            // *** Enhanced Parsing Logic ***
            if (storedEntries) { // Check if data exists
                try {
                    const parsed = JSON.parse(storedEntries);
                    // Ensure the parsed data is an array
                    if (Array.isArray(parsed)) {
                        entryData = parsed;
                    } else {
                        console.warn("Stored data under 'expenses' is not an array. Resetting.", parsed);
                        // Optionally, clear the invalid data or attempt recovery
                        // await AsyncStorage.removeItem(STORAGE_KEY); // Example: Clear invalid data
                        entryData = [];
                    }
                } catch (parseError) {
                    console.error("Failed to parse 'expenses' JSON:", parseError, "Raw data:", storedEntries);
                    setError("Failed to load transaction data. It might be corrupted.");
                    // Optionally, clear the invalid data
                    // await AsyncStorage.removeItem(STORAGE_KEY); // Example: Clear invalid data
                    entryData = []; // Reset to empty array on parse error
                }
            } else {
                 console.log("No data found under 'expenses' key.");
                 entryData = []; // Ensure it's an empty array if no data exists
            }

            // Fetch user preferences (for currency) - Keep existing logic
            const storedPrefs = await AsyncStorage.getItem(PREFS_KEY);
            let currentSymbol = '₹'; // Default
            if (storedPrefs) {
                 try {
                    const parsedPrefs = JSON.parse(storedPrefs);
                    const currencyCode = parsedPrefs?.currency ?? 'INR';
                    switch (currencyCode) {
                        case 'USD': currentSymbol = '$'; break;
                        case 'EUR': currentSymbol = '€'; break;
                        case 'GBP': currentSymbol = '£'; break;
                        case 'JPY': currentSymbol = '¥'; break;
                        case 'INR': currentSymbol = '₹'; break;
                        // Add more cases if needed
                    }
                 } catch (parseError) {
                     console.error("Failed to parse preferences JSON:", parseError);
                     // Keep default symbol on error
                 }
            }

            // Only update state if the component is still mounted
            if (isMounted) {
                setCurrencySymbol(currentSymbol);
                processData(entryData); // Process the (potentially empty) entry data
            }

        } catch (fetchErr) {
            console.error("AsyncStorage fetch error:", fetchErr);
            if (isMounted) { // Show alert only if mounted
                setError(`Failed to load data: ${fetchErr.message}`);
                // Reset state in case of fetch error
                setEntries([]);
                setTotals({ Expense: 0, Income: 0, Borrowing: 0 });
                setBalance(0);
            }
        } finally {
            // Ensure loading is set to false even if errors occur, if mounted
            if (isMounted) {
                setIsLoading(false);
            }
        }
        // Cleanup function to set isMounted to false when component unmounts or callback changes
        return () => {
            isMounted = false;
            console.log("IndexPage cleanup: isMounted set to false.");
        };
    }, []); // No dependencies, fetchData itself doesn't change

    // Function to calculate totals and balance from entry data
    const processData = (data) => {
        // Ensure data is an array before processing
        if (!Array.isArray(data)) {
            console.error("Invalid data passed to processData (not an array):", data);
            setError("Received invalid data format for processing.");
            setTotals({ Expense: 0, Income: 0, Borrowing: 0 });
            setBalance(0);
            setEntries([]);
            return;
        }
        try {
            const newTotals = { Expense: 0, Income: 0, Borrowing: 0 };
            let validEntries = []; // Store only valid entries

            // Calculate totals for each type and filter valid entries
            data.forEach((item) => {
                // More robust check for valid items
                const isValidItem = item &&
                                    typeof item === 'object' &&
                                    item.type && // Check if type exists
                                    newTotals.hasOwnProperty(item.type) && // Check if type is known
                                    item.amount !== undefined && // Check if amount exists
                                    !isNaN(parseFloat(item.amount)) && // Check if amount is a number
                                    item.id && // Check if id exists
                                    item.date && // Check if date exists
                                    item.nature; // Check if nature exists

                if (isValidItem) {
                    newTotals[item.type] += parseFloat(item.amount);
                    validEntries.push(item); // Add valid item to the list
                } else {
                    console.warn("Invalid or incomplete item found during processing, skipping:", item);
                    // Optionally notify the user about skipped items
                    // setError("Some entries were invalid and could not be displayed.");
                }
            });

            // Calculate balance
            const newBalance = (newTotals.Income + newTotals.Borrowing) - newTotals.Expense;

            // Update state with calculated totals
            setTotals(newTotals);
            setBalance(newBalance);

            // Sort valid entries by date (most recent first)
            // Add check for valid date before sorting
            const sortedEntries = validEntries
                                     .filter(item => new Date(item.date) instanceof Date && !isNaN(new Date(item.date)))
                                     .sort((a, b) => new Date(b.date) - new Date(a.date));

            // Update state with sorted, valid entries
            setEntries(sortedEntries);

        } catch (error) {
            console.error("Error processing data:", error);
            setError(`An error occurred while calculating totals or sorting data: ${error.message}`);
            // Reset state to prevent inconsistent display
            setTotals({ Expense: 0, Income: 0, Borrowing: 0 });
            setBalance(0);
            setEntries([]);
        }
    }

    // --- Effects ---
    const SummaryStatItem = ({ label, value, iconName, color, isHalfWidth = false }) => (
        <View style={[styles.summaryStatItem, isHalfWidth && styles.summaryStatItemHalf]}>
            <View style={styles.summaryStatLabelContainer}>
                <Ionicons name={iconName} size={20} color={color} style={styles.summaryStatIcon} />
                <Text style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>{label}</Text>
            </View>
            <Text style={[styles.summaryStatAmount, { color: color }]}>{formatCurrency(value)}</Text>
        </View>
    );


    // Fetch data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            const cleanup = fetchData(); // Call the memoized fetchData function
            // Return the cleanup function from fetchData
            return () => {
                if (typeof cleanup === 'function') {
                    cleanup();
                }
            };
        }, [fetchData]) // Depend on the memoized fetchData
    );

    // --- CRUD Operations ---

    // Handle deleting an entry
    const handleDelete = async (idToDelete) => {
        Alert.alert(
            "Confirm Delete",
            "Are you sure you want to delete this entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        console.log("Deleting entry:", idToDelete);
                        setIsLoading(true); // Show loading indicator during delete
                        try {
                            const stored = await AsyncStorage.getItem(STORAGE_KEY);
                            let parsed = [];
                            // Robust parsing before delete
                            if (stored) {
                                try {
                                    const tempParsed = JSON.parse(stored);
                                    if (Array.isArray(tempParsed)) {
                                        parsed = tempParsed;
                                    } else {
                                        console.warn("Data corruption detected before delete. Resetting.");
                                        parsed = [];
                                    }
                                } catch (parseError) {
                                     console.error("Failed to parse entries JSON before delete:", parseError);
                                     Alert.alert('Error', 'Could not load data to perform delete. Data might be corrupted.');
                                     setIsLoading(false);
                                     return; // Stop deletion if parsing fails
                                }
                            }
                            // Filter out the entry to be deleted
                            const filtered = parsed.filter((item) => item && item.id !== idToDelete);
                            // Save the updated array back to AsyncStorage
                            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
                            Alert.alert('Success', 'Entry deleted successfully');
                            // Re-process data to update totals and list
                            processData(filtered); // Process the already filtered data
                        } catch (err) {
                            console.error('Delete error:', err);
                            Alert.alert('Error', `Failed to delete entry: ${err.message}`);
                        } finally {
                            setIsLoading(false); // Hide loading indicator
                        }
                    }
                }
            ],
             { cancelable: true }
        );
    };

    // Handle opening the edit modal
    const handleEdit = (entry) => {
        // Enhanced check for valid entry structure before editing
        if (!entry || typeof entry !== 'object' || !entry.id || !entry.type || typeof entry.amount === 'undefined' || !entry.nature || !entry.date) {
            console.error("Invalid or incomplete entry passed to handleEdit:", entry);
            Alert.alert("Edit Error", "Cannot edit this entry due to missing or invalid data.");
            return;
        }
        try {
            setSelectedEntry(entry);
            setEditedAmount(entry.amount.toString());
            setEditedNature(entry.nature);
            setEditedOtherNature('');

            // Determine if 'Other' should be shown based on predefined options
            const options = getNatureOptions(entry.type);
            const isStandardNature = options.includes(entry.nature);

            // If nature is not standard AND not explicitly 'Other', treat it as custom
            if (!isStandardNature && entry.nature !== 'Other') {
                setShowOtherNatureInput(true);
                setEditedOtherNature(entry.nature); // Pre-fill custom field
                setEditedNature('Other'); // Select 'Other' in picker
            } else if (entry.nature === 'Other') {
                // If nature is 'Other', ensure custom input is shown (might need pre-filling if custom value was saved differently)
                setShowOtherNatureInput(true);
                // If AddData saves custom nature directly, you might need to fetch/prefill editedOtherNature here too
            } else {
                // Standard nature selected
                setShowOtherNatureInput(false);
            }

            setEditModalVisible(true);
        } catch (error) {
            console.error("Error opening edit modal:", error);
            Alert.alert("Edit Error", `Failed to open edit dialog: ${error.message}`);
        }
    };


    // Handle saving the edited entry
    const saveEdit = async () => {
        const newAmount = parseFloat(editedAmount);
        const finalNature = (editedNature === 'Other' ? editedOtherNature.trim() : editedNature);

        // Enhanced Validation
        if (!selectedEntry || !selectedEntry.id) {
            Alert.alert("Error", "Cannot save edit. No entry selected or entry has invalid ID.");
            return;
        }
        if (isNaN(newAmount) || newAmount <= 0) {
            Alert.alert("Input Error", "Please enter a valid positive amount.");
            return;
        }
        if (!finalNature) {
            Alert.alert("Input Error", "Please select or enter a catogory for the entry.");
            return;
        }
        // Check if 'Other' is selected but custom input is empty
        if (editedNature === 'Other' && !editedOtherNature.trim()) {
             Alert.alert("Input Error", "Please enter the custom catogory when 'Other' is selected.");
             return;
        }

        console.log("Saving edit for entry:", selectedEntry.id);
        setIsLoading(true); // Show loading indicator

        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
             let parsed = [];
             // Robust parsing before save
             if (stored) {
                 try {
                     const tempParsed = JSON.parse(stored);
                     if (Array.isArray(tempParsed)) {
                         parsed = tempParsed;
                     } else {
                         console.warn("Data corruption detected before save. Resetting.");
                         parsed = [];
                     }
                 } catch (parseError) {
                      console.error("Failed to parse entries JSON before save:", parseError);
                      Alert.alert('Error', 'Could not load data to save edit. Data might be corrupted.');
                      setIsLoading(false);
                      return; // Stop saving if parsing fails
                 }
             }
            // Map through entries and update the one being edited
            const updatedEntries = parsed.map((item) =>
                item && item.id === selectedEntry.id
                    ? { ...item, amount: newAmount, nature: finalNature } // Update amount and nature
                    : item
            );
            // Save the updated array back to AsyncStorage
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
            Alert.alert('Success', 'Entry updated successfully');

            // Close modal and reset state
            setEditModalVisible(false);
            setSelectedEntry(null);
            setEditedAmount('');
            setEditedNature('');
            setEditedOtherNature('');
            setShowOtherNatureInput(false);

            // Re-process data to update totals and list
            processData(updatedEntries); // Process the already updated data
        } catch (err) {
            console.error('Save edit error:', err);
            Alert.alert('Error', `Failed to update entry: ${err.message}`);
        } finally {
            setIsLoading(false); // Hide loading indicator
        }
    };

    // --- Helper Functions ---

    // Get predefined nature options based on entry type
    const getNatureOptions = (type) => {
        // Define options directly here or import from a shared constants file
        const expenseOptions = ['Food', 'Housing', 'Transport', 'Entertainment', 'Utilities', 'Fuel', 'Groceries', 'Education', 'Learning', 'Rent', 'Internet', 'Mobile Recharge', 'Tea/Coffee', 'Shopping', 'Health', 'Other'];
        const incomeOptions = ['Salary', 'Freelancing', 'Gift', 'Investment', 'Business', 'Rental', 'Other'];
        const borrowingOptions = ['Friend', 'Family', 'Bank Loan', 'Credit Card', 'Other'];

        if (!type) return ['Other']; // Default if type is missing
        switch (type) {
            case 'Expense': return expenseOptions;
            case 'Income': return incomeOptions;
            case 'Borrowing': return borrowingOptions;
            default:
                console.warn(`Unknown entry type for catogory options: ${type}`);
                return ['Other']; // Fallback for unknown types
        }
    };

    // --- Sub-Components ---

    // Component for displaying stats (Expenses, Income, etc.)
    const StatBox = ({ label, value, color }) => (
        <View style={[styles.statBox, { backgroundColor: color }]}>
            <Text style={[styles.statLabel, { color: theme.text }]} numberOfLines={1}>{label}</Text>
            <Text style={[styles.statAmount, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
                {currencySymbol}{value ? value.toFixed(2) : '0.00'}
            </Text>
        </View>
    );

    // Component for rendering each entry in the FlatList
    const renderItem = ({ item }) => {
        // Item validation is now primarily done in processData
        // Assume items reaching here are valid
        const dotColor = item.type === 'Income' ? theme.success
                       : item.type === 'Expense' ? theme.destructive
                       : theme.warning; // Borrowing

        const displayDate = new Date(item.date);
        const formattedDate = displayDate.toLocaleString(); // Assumes valid date from processData

        return (
            <View style={[styles.entryCard, { backgroundColor: theme.box, borderBottomColor: theme.separator }]}>
                {/* Left side: Details */}
                <View style={styles.entryDetails}>
                    <View style={styles.entryNatureRow}>
                        <View style={[styles.entryDot, { backgroundColor: dotColor }]} />
                        <Text style={[styles.entryNatureText, { color: theme.text }]} numberOfLines={1}>{item.nature}</Text>
                    </View>
                    <Text style={[styles.entryAmountText, { color: theme.text }]}>
                        {item.type} • {currencySymbol}{parseFloat(item.amount).toFixed(2)}
                    </Text>
                    <Text style={[styles.entryDateText, { color: theme.disabled }]}>
                        {formattedDate}
                    </Text>
                </View>
                {/* Right side: Action Buttons */}
                <View style={styles.entryActions}>
                    <TouchableOpacity
                        onPress={() => handleEdit(item)}
                        style={styles.actionButton}
                        accessibilityLabel={`Edit entry ${item.nature}`}
                        accessibilityRole="button"
                    >
                        <Ionicons name="create-outline" size={22} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={styles.actionButton}
                        accessibilityLabel={`Delete entry ${item.nature}`}
                        accessibilityRole="button"
                    >
                        <Ionicons name="trash-outline" size={22} color={theme.destructive} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // --- Main Render ---
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {/* === Loading Indicator === */}
            {isLoading && <View style={styles.loadingOverlay}><Text style={{color: theme.text}}>Loading...</Text></View>}

            {/* === Error Message Display === */}
            {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

            {/* === Stats Section === */}
            <View style={[styles.sectionContainerStat, { backgroundColor: theme.box, paddingBottom: 8 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>This Month's Summary</Text>
                <View style={styles.summaryRow}>
                          <SummaryStatItem label="Income" value={totals.Income} iconName="arrow-up-circle-outline" color={theme.income} isHalfWidth />
                          <SummaryStatItem label="Expenses" value={totals.Expense} iconName="arrow-down-circle-outline" color={theme.expense} isHalfWidth />
                        </View>
                        <View style={[styles.separator, { backgroundColor: theme.separator, marginLeft: 0, marginRight: 0 }]} /> {/* Full width separator */}
                        {/* Row 2: Borrowing & Balance */}
                        <View style={styles.summaryRow}>
                           <SummaryStatItem label="Borrowing" value={totals.Borrowing} iconName="download-outline" color={theme.borrowing} isHalfWidth />
                           <SummaryStatItem label="Net Balance" value={balance} iconName="wallet-outline" color={balance >= 0 ? theme.balance : theme.destructive} isHalfWidth />
                        </View>
                </View>

            {/* === Entries List Section === */}
            <View style={[styles.sectionContainer, styles.entriesListContainer, { backgroundColor: theme.box }]}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text, flexShrink: 1 }]}>Recent Entries</Text>
                    <TouchableOpacity
                        onPress={() => {
                            try {
                                router.push('/Search'); // Navigate to Search route
                            } catch (e) {
                                console.error("Navigation error:", e);
                                Alert.alert("Navigation Error", "Could not open search page.");
                            }
                        }}
                        style={styles.headerIconTouchable}
                        accessibilityLabel="Search entries"
                        accessibilityRole="button"
                        >
                        <Ionicons name="search-outline" size={24} color={theme.primary} />
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.id.toString()} // Assume valid ID from processData
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyListContainer}>
                             <Text style={[styles.emptyListText, {color: theme.disabled}]}>No entries yet.</Text>
                             <Text style={[styles.emptyListSubText, {color: theme.disabled}]}>Tap the '+' button to add one!</Text>
                        </View>
                    }
                    // Add pull-to-refresh functionality
                    refreshing={isLoading} // Show refresh indicator while loading
                    onRefresh={fetchData} // Call fetchData on pull-to-refresh
                />
            </View>

            {/* === Edit Modal === */}
            <Modal
                visible={editModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
                        <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Entry</Text>

                        {/* Amount Input */}
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Amount ({currencySymbol})</Text>
                        <TextInput
                            value={editedAmount}
                            onChangeText={setEditedAmount}
                            keyboardType="numeric"
                            placeholder="Enter amount"
                            placeholderTextColor={theme.disabled}
                            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                        />

                        {/* Nature Picker */}
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Catogory</Text>
                        <View style={[styles.pickerContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
                            <Picker
                                selectedValue={editedNature}
                                onValueChange={(itemValue) => {
                                    setEditedNature(itemValue);
                                    setShowOtherNatureInput(itemValue === 'Other');
                                    // Clear custom input if a standard option is selected
                                    if (itemValue !== 'Other') {
                                        setEditedOtherNature('');
                                    }
                                }}
                                style={[styles.pickerStyle, { color: theme.text }]} // Apply text color directly for Android/Web
                                itemStyle={Platform.OS === 'ios' ? { color: theme.text } : {}} // iOS item style
                                dropdownIconColor={theme.text}
                            >
                                {/* Map through options based on the selected entry's type */}
                                {getNatureOptions(selectedEntry?.type).map((opt) => (
                                    // Use a unique key, label, and value for each item
                                    <Picker.Item key={opt} label={opt} value={opt} color={theme.text} />
                                ))}
                            </Picker>
                        </View>


                        {/* Custom Nature Input (Conditional) */}
                        {showOtherNatureInput && (
                            <>
                                <Text style={[styles.inputLabel, { color: theme.text }]}>Custom catogory</Text>
                                <TextInput
                                    value={editedOtherNature}
                                    onChangeText={setEditedOtherNature}
                                    placeholder="Enter custom nature"
                                    placeholderTextColor={theme.disabled}
                                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                />
                            </>
                        )}

                        {/* Modal Action Buttons */}
                        <View style={styles.modalButtonRow}>
                            <TouchableOpacity
                                onPress={() => setEditModalVisible(false)}
                                style={[styles.modalButton, { backgroundColor: theme.disabled }]}
                                accessibilityRole="button"
                                accessibilityLabel="Cancel editing"
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={saveEdit}
                                style={[styles.modalButton, { backgroundColor: theme.primary }]}
                                accessibilityRole="button"
                                accessibilityLabel="Save changes"
                            >
                                <Text style={styles.modalButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- Stylesheet ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingOverlay: { // Simple loading overlay
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10, // Ensure it's above other content
    },
    errorBox: { // Box to display errors
        backgroundColor: '#FF3B30', // Destructive color
        padding: 10,
        margin: 16,
        borderRadius: 8,
    },
    errorText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '500',
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
    separator: {
        height: StyleSheet.hairlineWidth,
        //
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingRight: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
    },
    headerIconTouchable: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRowContainer: {
        paddingHorizontal: 10,
        paddingTop: 10,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statBox: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 8,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    statAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
        textAlign: 'center',
    },
    entriesListContainer: {
        flex: 1,
        paddingBottom: 0,
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
        paddingHorizontal: 20,
    },
    emptyListText: {
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
    },
     emptyListSubText: {
        textAlign: 'center',
        fontSize: 14,
        marginTop: 5,
    },
    entryCard: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    entryDetails: {
        flex: 1,
        marginRight: 10,
    },
    entryNatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    summaryStatItem: {
        paddingHorizontal: 15, // Padding within each item
        paddingVertical: 8,
        alignItems: 'flex-start', // Align text to the start
      },
      summaryStatItemHalf: {
         width: '50%', // Make items take half the width
      },
      summaryStatLabelContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4, // Space between icon/label and amount
      },
      summaryStatIcon: {
          marginRight: 6,
      },
      summaryStatLabel: {
          fontSize: 14, // Smaller label
          fontWeight: '500',
      },
      summaryStatAmount: {
          fontSize: 18, // Larger amount
          fontWeight: '600',
          marginLeft: 2, // Align with label text start
      },
    entryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    entryNatureText: {
        fontWeight: 'bold',
        fontSize: 15,
        flexShrink: 1,
    },
    entryAmountText: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 2,
    },
    entryDateText: {
        fontSize: 12,
        marginTop: 4,
    },
    entryActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionButton: {
        padding: 6,
        marginLeft: 8,
    },
    summaryStatItem: {
        paddingHorizontal: 15, // Padding within each item
        paddingVertical: 8,
        alignItems: 'flex-start', // Align text to the start
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 5,
        marginLeft: 2,
    },
    input: {
        height: 54,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        marginBottom: 15,
        fontSize: 16,
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 15,
        height: 56,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pickerStyle: {
        width: '100%',
        height: '100%',
    },
    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionContainerStat:{
        marginHorizontal: 16,
        marginBottom: 12, // Consistent spacing below sections
        borderRadius: 12,
        overflow: 'hidden',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Distribute items evenly
        paddingHorizontal: 0, // Padding handled by items
        paddingVertical: 10, // Vertical padding for the row
    }
});

export default IndexPage;
