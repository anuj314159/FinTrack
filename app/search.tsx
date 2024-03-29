import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    Switch,
    Modal,
    ScrollView,
    ActivityIndicator,
    useColorScheme,
    Keyboard, // Import Keyboard
    Platform, // Import Platform for specific styling if needed
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { format, isAfter, parseISO, isValid } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';

const STORAGE_KEY = 'expenses';
const PREFS_KEY = 'user_preferences'; // Key for preferences

// Helper Function to Format Currency
const formatCurrency = (amount: number | undefined | null, symbol: string): string => {
    // Added check for NaN after potential parsing
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
        return `${symbol}0.00`;
    }
    return `${symbol}${Number(amount).toFixed(2)}`;
};

const SearchTransactions = () => {
    // --- State Variables ---
    const [allTransactionsCache, setAllTransactionsCache] = useState<any[]>([]); // Cache raw data, typed as any[]
    const [transactions, setTransactions] = useState<any[]>([]); // Filtered data for display
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(''); // Explicitly string
    const [showCalendar, setShowCalendar] = useState(false);
    const currentColorScheme = useColorScheme();
    const router = useRouter();
    const [currencySymbol, setCurrencySymbol] = useState('₹');
    const [loading, setLoading] = useState(true); // Start loading true
    const [error, setError] = useState<string | null>(null); // Error message state

    // Edit functionality states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState<any | null>(null); // Entry being edited
    const [editedAmount, setEditedAmount] = useState('');
    const [editedNature, setEditedNature] = useState('');
    const [editedOtherNature, setEditedOtherNature] = useState('');
    const [showOtherNatureInput, setShowOtherNatureInput] = useState(false);
    const [isSavingEdit, setIsSavingEdit] = useState(false); // Specific loading state for save action

    // --- Refs ---
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null); // Ref for debounce timer

    // --- Theme Object ---
    const theme = {
        background: currentColorScheme === 'dark' ? '#121212' : '#f5f5f5',
        box: currentColorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
        text: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        textSecondary: currentColorScheme === 'dark' ? '#b0b0b0' : '#666666',
        separator: currentColorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
        primary: '#007AFF',
        destructive: '#FF3B30',
        income: currentColorScheme === 'dark' ? '#30D158' : '#34C759',
        expense: currentColorScheme === 'dark' ? '#FF453A' : '#FF3B30',
        borrowing: currentColorScheme === 'dark' ? '#FF9F0A' : '#FF9500',
        switchThumb: currentColorScheme === 'dark' ? '#f4f3f4' : '#ffffff',
        switchTrackFalse: currentColorScheme === 'dark' ? '#2C2C2E' : '#E9E9EA',
        inputBg: currentColorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
        inputBorder: currentColorScheme === 'dark' ? '#444' : '#d1d1d6',
        modalBg: currentColorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
        placeholder: currentColorScheme === 'dark' ? '#888' : '#999',
    };

    // --- Debounced Search Term Update ---
    const handleSearchChange = (text: string) => {
        setSearchTerm(text); // Update input immediately
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        debounceTimeout.current = setTimeout(() => {
            // Trigger filtering via useEffect dependency change
            // No need to call fetchTransactions or applyFilters directly here
            console.log("Debounced search triggered");
        }, 500); // 500ms delay
    };

    // --- Data Fetching and Processing ---
    const fetchTransactions = useCallback(async () => {
        console.log("fetchTransactions called");
        setError(null); // Reset error before fetch
        // Keep loading true if it wasn't already set by initial mount or retry
        if (!loading) setLoading(true);

        let rawTransactions: any[] = []; // Initialize as empty array

        try {
            // --- Fetch Preferences ---
            try {
                const prefs = await AsyncStorage.getItem(PREFS_KEY);
                if (prefs) {
                    const parsedPrefs = JSON.parse(prefs); // Assume valid JSON for simplicity here, could add try/catch
                    const currencyCode = parsedPrefs?.currency ?? 'INR';
                     switch (currencyCode) {
                         case 'USD': setCurrencySymbol('$'); break;
                         case 'EUR': setCurrencySymbol('€'); break;
                         case 'GBP': setCurrencySymbol('£'); break;
                         case 'JPY': setCurrencySymbol('¥'); break;
                         default: setCurrencySymbol('₹'); break;
                     }
                } else {
                    setCurrencySymbol('₹'); // Default if no prefs
                }
            } catch (prefError) {
                console.error("Failed to fetch or parse preferences:", prefError);
                setCurrencySymbol('₹'); // Default on error
                // Optionally set a non-critical error message
            }

            // --- Fetch Main Transaction Data ---
            const expensesData = await AsyncStorage.getItem(STORAGE_KEY);

            // *** Robust Parsing ***
            if (expensesData) {
                try {
                    const parsedData = JSON.parse(expensesData);
                    if (Array.isArray(parsedData)) {
                        rawTransactions = parsedData;
                    } else {
                        console.warn("Stored 'expenses' data is not an array. Resetting.", parsedData);
                        rawTransactions = [];
                        // Optionally clear the invalid data
                        // await AsyncStorage.removeItem(STORAGE_KEY);
                    }
                } catch (parseError: any) {
                    console.error("Failed to parse 'expenses' JSON:", parseError, "Raw data:", expensesData);
                    setError(`Failed to load transaction data. It might be corrupted. Details: ${parseError.message}`);
                    rawTransactions = []; // Use empty array on parse error
                    // Optionally clear the invalid data
                    // await AsyncStorage.removeItem(STORAGE_KEY);
                }
            } else {
                console.log("No data found under 'expenses' key.");
                rawTransactions = []; // Ensure empty array if no data
            }

            // --- Pre-process and Cache Data ---
            const processedTransactions = rawTransactions
                .map(entry => {
                    // **Safe Date Parsing**
                    let dateObj = null;
                    if (entry?.date && typeof entry.date === 'string') {
                        try {
                            const parsed = parseISO(entry.date);
                            if (isValid(parsed)) {
                                dateObj = parsed;
                            } else {
                                console.warn("Invalid date string found in entry:", entry.date, entry.id);
                            }
                        } catch (dateParseError) {
                             console.warn("Error parsing date string:", entry.date, entry.id, dateParseError);
                        }
                    } else {
                        console.warn("Missing or invalid date property in entry:", entry?.id);
                    }

                    // **Safe Amount Parsing**
                    const parsedAmount = parseFloat(entry?.amount);

                    // **Ensure Basic Structure**
                    return {
                        id: entry?.id ?? `invalid-${Math.random()}`, // Provide fallback ID
                        type: entry?.type ?? 'Unknown',
                        nature: entry?.nature ?? 'Unknown',
                        amount: isNaN(parsedAmount) ? 0 : parsedAmount, // Default amount to 0 if invalid
                        originalDateString: entry?.date ?? null,
                        dateObject: dateObj, // Store Date object or null
                    };
                })
                // **Filter out entries with invalid dates AFTER mapping**
                .filter(entry => entry.dateObject !== null && entry.id !== `invalid-${Math.random()}`);

             // Sort by date descending (most recent first) using the valid Date object
             processedTransactions.sort((a, b) => b.dateObject!.getTime() - a.dateObject!.getTime()); // Use non-null assertion as we filtered nulls

            setAllTransactionsCache(processedTransactions); // Update the cache
            // applyFilters will be triggered by the useEffect watching allTransactionsCache

        } catch (error: any) {
            console.error("Failed to fetch or process transactions", error);
            setError(`Failed to retrieve transactions: ${error.message || 'An unknown error occurred.'}`);
            setAllTransactionsCache([]); // Clear cache on major fetch error
            setTransactions([]); // Clear displayed transactions
        } finally {
            setLoading(false); // Ensure loading is set to false
            console.log("fetchTransactions finished");
        }
    }, []); // No dependencies needed here, it's meant for initial load/retry


    // --- Function to Apply Filters to Data ---
    const applyFilters = useCallback(() => {
        console.log("applyFilters called. Search:", searchTerm, "Date:", selectedDate);
        if (!allTransactionsCache) return; // Guard against null cache

        setLoading(true); // Show loading while filtering (can be quick)
        let filtered = [...allTransactionsCache]; // Start with a copy of the cache

        try {
            // 1. Filter by Search Term
            if (searchTerm) {
                const termLower = searchTerm.toLowerCase().trim();
                const searchAmount = parseFloat(termLower); // Try parsing as number

                filtered = filtered.filter(item => {
                    // Use optional chaining and nullish coalescing for safety
                    const natureMatch = item.nature?.toLowerCase().includes(termLower) ?? false;
                    const typeMatch = item.type?.toLowerCase().includes(termLower) ?? false;
                    // Strict amount match only if search term is a valid number
                    const amountMatch = !isNaN(searchAmount) && item.amount === searchAmount;

                    return natureMatch || typeMatch || amountMatch;
                });
            }

            // 2. Filter by Selected Date
            if (selectedDate) {
                filtered = filtered.filter(item => {
                    // item.dateObject is guaranteed to be a valid Date by fetchTransactions filter
                    try {
                        const itemDateFormatted = format(item.dateObject!, 'yyyy-MM-dd'); // Use non-null assertion
                        return itemDateFormatted === selectedDate;
                    } catch (formatError) {
                         console.error("Error formatting date during filter:", item.dateObject, formatError);
                         return false; // Exclude item if formatting fails
                    }
                });
            }

            setTransactions(filtered); // Update the state for the FlatList
        } catch (filterError: any) {
             console.error("Error during filtering:", filterError);
             setError(`Error applying filters: ${filterError.message}`);
             setTransactions([]); // Clear transactions on filter error
        } finally {
             setLoading(false); // Hide loading after filtering
             console.log("applyFilters finished. Results:", filtered.length);
        }
    }, [allTransactionsCache, searchTerm, selectedDate]); // Depend on cache and filters


    // --- Effects ---

    // Fetch data on initial mount
    useEffect(() => {
        console.log("Initial mount effect: Fetching data...");
        fetchTransactions();
    }, [fetchTransactions]); // Depend on the memoized fetchTransactions


    // Re-apply filters when searchTerm, selectedDate, or the cache changes
    useEffect(() => {
        console.log("Filter effect triggered");
        // Apply filters only if cache has data (or has been reset to [])
        if (allTransactionsCache) {
             applyFilters();
        }
    }, [searchTerm, selectedDate, allTransactionsCache, applyFilters]); // Depend on filters and cache


    // --- Event Handlers ---
    const handleDateSelect = (date: { dateString: string }) => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Compare dates only
            const selected = parseISO(date.dateString); // dateString is 'yyyy-MM-dd'

            if (!isValid(selected)) {
                 Alert.alert("Error", "Invalid date selected from calendar.");
                 return;
            }

            if (isAfter(selected, today)) {
                Alert.alert("Invalid Date", "Future dates cannot be selected.");
            } else {
                setSelectedDate(date.dateString); // Update state -> triggers useEffect
                setShowCalendar(false); // Hide calendar
                Keyboard.dismiss();
            }
        } catch (error: any) {
            console.error("Error selecting date", error);
            setError(`Failed to process selected date: ${error.message}`);
            Alert.alert("Error", "Failed to process selected date.");
        }
    };

     const clearDateFilter = () => {
         setSelectedDate(''); // Update state -> triggers useEffect
     };


    const handleDelete = async (id: string) => {
        if (!id) {
            Alert.alert("Error", "Cannot delete entry: Invalid ID.");
            return;
        }
        Alert.alert(
            "Confirm Deletion",
            "Are you sure you want to delete this transaction?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        setLoading(true); // Show loading during delete
                        try {
                            // Optimistic UI Update: Update cache first
                            const updatedCache = allTransactionsCache.filter(item => item.id !== id);
                            setAllTransactionsCache(updatedCache);
                            // applyFilters will be triggered by useEffect watching cache change

                            // Update AsyncStorage in the background
                            const stored = await AsyncStorage.getItem(STORAGE_KEY);
                            let parsed = [];
                            if (stored) {
                                try {
                                    const tempParsed = JSON.parse(stored);
                                    parsed = Array.isArray(tempParsed) ? tempParsed : [];
                                } catch (e) { console.error("Parse error before delete", e); /* Ignore parse error, proceed with filter */ }
                            }
                            const filteredStorage = parsed.filter((item: any) => item?.id !== id);
                            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredStorage));
                            console.log("Entry deleted from storage:", id);

                        } catch (err: any) {
                            console.error('Error during delete:', err);
                            Alert.alert('Error', `Failed to delete entry: ${err.message}`);
                            // Rollback optimistic update if storage fails? Maybe refetch.
                            fetchTransactions(); // Refetch to ensure consistency on error
                        } finally {
                            setLoading(false); // Hide loading
                        }
                    }
                }
            ],
            { cancelable: true }
        );
    };

    const handleEdit = (entry: any) => {
         // **Add validation for entry structure**
         if (!entry || typeof entry !== 'object' || !entry.id || !entry.type || typeof entry.amount === 'undefined' || !entry.nature) {
             console.error("Invalid or incomplete entry passed to handleEdit:", entry);
             Alert.alert("Edit Error", "Cannot edit this entry due to missing or invalid data.");
             return;
         }
        try {
            setSelectedEntry(entry);
            setEditedAmount(entry.amount.toString());
            setEditedNature(entry.nature); // Set initial nature

            const standardOptions = getNatureOptions(entry.type);
            // Check if the current nature is NOT in the standard list AND not explicitly 'Other'
            const isCustomNonOther = !standardOptions.includes(entry.nature) && entry.nature !== 'Other';

            if (isCustomNonOther) {
                setShowOtherNatureInput(true);
                setEditedOtherNature(entry.nature); // Pre-fill custom input
                setEditedNature('Other'); // Select 'Other' in picker
            } else if (entry.nature === 'Other') {
                setShowOtherNatureInput(true);
                setEditedOtherNature(''); // Start with empty custom input if nature was 'Other'
            } else {
                setShowOtherNatureInput(false);
                setEditedOtherNature(''); // Clear custom input if standard nature
            }

            setEditModalVisible(true);
        } catch (error: any) {
            console.error("Error opening edit modal:", error);
            Alert.alert("Edit Error", `Failed to open edit dialog: ${error.message}`);
        }
    };

    const saveEdit = async () => {
        if (!selectedEntry) {
             Alert.alert("Error", "No entry selected for saving.");
             return;
        }

        setIsSavingEdit(true); // Use specific loading state for save button

        try {
            const newAmount = parseFloat(editedAmount);
            // Determine final nature: Use trimmed custom nature if 'Other' is selected AND custom input is not empty, otherwise use picker value.
            const finalNature = (editedNature === 'Other' && editedOtherNature.trim())
                                 ? editedOtherNature.trim()
                                 : editedNature;

            // --- Validation ---
            if (isNaN(newAmount) || newAmount <= 0) {
                 Alert.alert("Input Error", "Please enter a valid positive amount.");
                 setIsSavingEdit(false);
                 return;
            }
            // Ensure a nature is selected/entered
            if (!finalNature || finalNature.trim().length === 0) {
                Alert.alert("Input Error", "Please select or enter a valid category.");
                setIsSavingEdit(false);
                return;
            }
             // If 'Other' is selected, ensure the custom field isn't empty
             if (editedNature === 'Other' && !editedOtherNature.trim()) {
                 Alert.alert("Input Error", "Please enter the custom category when 'Other' is selected.");
                 setIsSavingEdit(false);
                 return;
             }
            // --- End Validation ---


            // Optimistic UI Update
            const updatedEntryData = { ...selectedEntry, amount: newAmount, nature: finalNature };
            const updatedCache = allTransactionsCache.map(item =>
                item.id === selectedEntry.id ? updatedEntryData : item
            );
            setAllTransactionsCache(updatedCache);
            // applyFilters will trigger via useEffect

            // Close modal immediately after optimistic update
            setEditModalVisible(false);
            setSelectedEntry(null); // Clear selected entry state

            // Update AsyncStorage in background
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            let parsed = [];
            if (stored) {
                try {
                    const tempParsed = JSON.parse(stored);
                    parsed = Array.isArray(tempParsed) ? tempParsed : [];
                } catch (e) { console.error("Parse error before save", e); /* Proceed with update */ }
            }

            let entryFoundInStorage = false;
            const updatedStorage = parsed.map((item: any) => {
                if (item?.id === selectedEntry.id) {
                    entryFoundInStorage = true;
                    return updatedEntryData; // Use the already prepared updated data
                }
                return item;
            });

            if (!entryFoundInStorage) {
                 // This case might happen if the entry was deleted between opening modal and saving.
                 // Add the edited entry back? Or just warn? For now, warn.
                 console.warn("Entry ID", selectedEntry.id, "not found in storage during save. UI updated optimistically.");
                 // Optionally add the entry back: updatedStorage.push(updatedEntryData);
            }

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStorage));
            console.log("Entry updated in storage:", selectedEntry.id);

        } catch (err: any) {
            console.error('Error during save:', err);
            Alert.alert('Error', `Failed to update entry: ${err.message}`);
            // Rollback optimistic update? Refetch might be safer.
            fetchTransactions(); // Refetch to correct state on error
        } finally {
             setIsSavingEdit(false); // Stop save button loading
        }
    };

    // Nature options based on type
    const getNatureOptions = (type: string): string[] => {
        // Define standard options (ensure these match AddData page)
        const expenseOptions = ['Food', 'Housing', 'Transport', 'Entertainment', 'Utilities', 'Fuel', 'Groceries', 'Education', 'Learning', 'Rent', 'Internet', 'Mobile Recharge', 'Tea/Coffee', 'Shopping', 'Health', 'Other']; // Added more common options
        const incomeOptions = ['Salary', 'Freelancing', 'Gift', 'Investment', 'Business', 'Rental', 'Other']; // Added more common options
        const borrowingOptions = ['Friend', 'Family', 'Bank Loan', 'Credit Card', 'Other'];

        switch (type) {
            case 'Expense': return expenseOptions;
            case 'Income': return incomeOptions;
            case 'Borrowing': return borrowingOptions;
            default:
                console.warn("getNatureOptions called with unknown type:", type);
                return ['Other']; // Default case
        }
    };

    // --- Render Item for FlatList ---
    const renderTransactionItem = ({ item }: { item: any }) => {
        // **Assume item structure is valid here due to pre-processing**
        const iconName =
            item.type === 'Income' ? 'arrow-up-circle' :
            item.type === 'Expense' ? 'arrow-down-circle' :
            'download'; // Borrowing icon

        const color =
            item.type === 'Income' ? theme.income :
            item.type === 'Expense' ? theme.expense :
            theme.borrowing;

        // Use the valid Date object for formatting
        // Added fallback for safety, though filtering should prevent null dateObject
        const displayDate = item.dateObject ? format(item.dateObject, 'MMM d, yyyy') : 'Invalid Date';

        return (
            // Using View instead of TouchableOpacity if no navigation on item press
            <View style={styles.detailItemContainer}>
                <View style={styles.detailItem}>
                    <Ionicons name={iconName} size={22} color={color} style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                        {/* Use nullish coalescing for safer access */}
                        <Text style={[styles.detailNature, { color: theme.text }]} numberOfLines={1}>{item.nature ?? 'N/A'}</Text>
                        <Text style={[styles.detailSubText, { color: theme.textSecondary }]}>
                            {item.type ?? 'N/A'} • {displayDate}
                        </Text>
                    </View>
                    <View style={styles.detailActionContainer}>
                        <Text style={[styles.detailAmount, { color: color }]}>
                            {formatCurrency(item.amount, currencySymbol)}
                        </Text>
                        <View style={styles.actionButtons}>
                             <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton} accessibilityLabel="Edit Transaction">
                                <Ionicons name="create-outline" size={20} color={theme.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton} accessibilityLabel="Delete Transaction">
                                <Ionicons name="trash-outline" size={20} color={theme.destructive} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                {/* Separator */}
                <View style={[styles.separator, { backgroundColor: theme.separator, marginLeft: 15 + 22 + 12 }]} />
            </View>
        );
    };

    // --- Loading State ---
    const renderLoadingIndicator = () => (
         <View style={styles.loadingOverlay}>
             <ActivityIndicator size="large" color={theme.primary} />
         </View>
    );

    // --- Error State ---
    if (error && !loading) { // Show error only if not loading
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Keep filter section visible but maybe disabled/greyed out? */}
                 <View style={[styles.sectionContainer, { backgroundColor: theme.box, opacity: 0.7, marginBottom: 10 }]}>
                     <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Filter Transactions</Text>
                     {/* Simplified display or hide inputs on error */}
                 </View>
                {/* Error Display Area */}
                <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
                    <Ionicons name="cloud-offline-outline" size={60} color={theme.textSecondary} />
                    <Text style={[styles.errorText, { color: theme.destructive }]}>Loading Failed</Text>
                    <Text style={[styles.errorDetails, { color: theme.textSecondary }]}>{error}</Text>
                    <TouchableOpacity onPress={() => { setError(null); setLoading(true); fetchTransactions(); }} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // --- Main Content ---
    return (
        // Use a parent View to contain ScrollView and potential absolute positioned elements like loading overlay
        <View style={{flex: 1, backgroundColor: theme.background}}>
            <ScrollView
                style={styles.container} // ScrollView takes flex 1
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* --- Search and Filter Section --- */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Filter Transactions</Text>

                    {/* Search Input */}
                    <View style={styles.inputWrapper}>
                        <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                            placeholder="Category, Type, or Amount" // Simplified placeholder
                            placeholderTextColor={theme.placeholder}
                            value={searchTerm}
                            onChangeText={handleSearchChange} // Debounced handler
                            returnKeyType="search"
                            clearButtonMode="while-editing" // iOS clear button
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Date Filter Toggle */}
                    <View style={styles.settingItem}>
                        <View style={styles.settingLabelContainer}>
                            <Ionicons name="calendar-outline" size={24} color={theme.text} style={styles.icon} />
                            <Text style={[styles.settingText, { color: theme.text }]}>Filter by Date</Text>
                            {selectedDate && !showCalendar && (
                                <Text style={[styles.selectedDateTextInline, { color: theme.textSecondary }]}>
                                    ({format(parseISO(selectedDate), 'MMM d')})
                                </Text>
                            )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {selectedDate && (
                                <TouchableOpacity onPress={clearDateFilter} style={{ marginRight: 10 }} accessibilityLabel="Clear Date Filter">
                                    <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                            <Switch
                                value={showCalendar}
                                onValueChange={() => setShowCalendar(prev => !prev)}
                                trackColor={{ false: theme.switchTrackFalse, true: theme.primary + '70' }}
                                thumbColor={theme.switchThumb}
                                ios_backgroundColor={theme.switchTrackFalse}
                            />
                        </View>
                    </View>

                    {/* Calendar View */}
                    {showCalendar && (
                        <View style={styles.calendarWrapper}>
                            <Calendar
                                current={selectedDate || format(new Date(), 'yyyy-MM-dd')}
                                onDayPress={handleDateSelect}
                                markedDates={selectedDate ? { [selectedDate]: { selected: true, selectedColor: theme.primary, disableTouchEvent: true } } : {}}
                                maxDate={format(new Date(), 'yyyy-MM-dd')} // Prevent future dates
                                theme={{
                                    backgroundColor: theme.box,
                                    calendarBackground: theme.box,
                                    textSectionTitleColor: theme.textSecondary,
                                    selectedDayBackgroundColor: theme.primary,
                                    selectedDayTextColor: '#ffffff',
                                    todayTextColor: theme.primary,
                                    dayTextColor: theme.text,
                                    textDisabledColor: currentColorScheme === 'dark' ? '#555' : '#d9e1e8',
                                    dotColor: theme.primary,
                                    selectedDotColor: '#ffffff',
                                    arrowColor: theme.primary,
                                    monthTextColor: theme.text,
                                    indicatorColor: theme.primary,
                                    textDayFontSize: 15,
                                    textMonthFontSize: 16,
                                    textDayHeaderFontSize: 13,
                                }}
                                style={{ borderRadius: 8 }}
                            />
                        </View>
                    )}
                </View>

                {/* --- Transactions List Section --- */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.box, paddingBottom: 0, minHeight: 150 }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text, paddingBottom: 15 }]}>Results</Text>
                    <View style={[styles.separator, { backgroundColor: theme.separator, marginLeft: 0, marginRight: 0, marginBottom: 5 }]} />

                    {/* Conditional Rendering for Loading/Empty/List */}
                    {loading && transactions.length === 0 && ( // Show loading only if list is empty
                         <ActivityIndicator size="small" color={theme.primary} style={{paddingVertical: 40}}/>
                    )}
                    {!loading && transactions.length === 0 && ( // Show empty message only if not loading and list is empty
                        <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
                            {searchTerm || selectedDate ? 'No transactions match filters.' : 'No transactions found.'}
                        </Text>
                    )}
                    {transactions.length > 0 && ( // Show list if there are transactions (even while loading new filters)
                        <FlatList
                            data={transactions}
                            renderItem={renderTransactionItem}
                            keyExtractor={(item) => item.id.toString()} // Ensure key is string and unique
                            contentContainerStyle={{ paddingBottom: 10 }}
                            // Optimization props (can be adjusted)
                            initialNumToRender={15}
                            maxToRenderPerBatch={10}
                            windowSize={11}
                            removeClippedSubviews={Platform.OS === 'android'} // Potential optimization for Android
                        />
                    )}
                </View>

                {/* Edit Modal */}
                <Modal
                    visible={editModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => { if (!isSavingEdit) setEditModalVisible(false); }} // Prevent closing while saving
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContainer, { backgroundColor: theme.modalBg }]}>
                            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Transaction</Text>

                            {/* Amount Input */}
                            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Amount ({currencySymbol})</Text>
                            <TextInput
                                value={editedAmount}
                                onChangeText={setEditedAmount}
                                keyboardType="numeric"
                                style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                returnKeyType="done"
                            />

                            {/* category Picker */}
                            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Category</Text>
                            <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                                <Picker
                                    selectedValue={editedNature}
                                    onValueChange={(val) => {
                                        setEditedNature(val);
                                        setShowOtherNatureInput(val === 'Other');
                                        // Clear custom input if a standard option is selected
                                        if (val !== 'Other') {
                                            setEditedOtherNature('');
                                        }
                                    }}
                                    dropdownIconColor={theme.textSecondary}
                                    style={[styles.pickerStyle, { color: theme.text }]} // Direct color for Android/Web
                                    itemStyle={Platform.OS === 'ios' ? { color: theme.text } : {}} // iOS specific
                                >
                                    {/* Ensure selectedEntry and type exist before mapping */}
                                    {selectedEntry?.type && getNatureOptions(selectedEntry.type).map((opt) => (
                                        <Picker.Item key={opt} label={opt} value={opt} color={theme.text} />
                                    ))}
                                </Picker>
                            </View>

                            {/* Other Nature Input */}
                            {showOtherNatureInput && (
                                <>
                                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Custom category</Text>
                                <TextInput
                                    value={editedOtherNature}
                                    onChangeText={setEditedOtherNature}
                                    placeholder="Enter custom category"
                                    placeholderTextColor={theme.placeholder}
                                    style={[styles.modalInput, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                    returnKeyType="done"
                                />
                                </>
                            )}

                            {/* Action Buttons */}
                            <View style={styles.modalActions}>
                                <TouchableOpacity
                                    onPress={() => setEditModalVisible(false)}
                                    style={[styles.modalButton, styles.cancelButton]}
                                    disabled={isSavingEdit} // Disable cancel while saving
                                >
                                    <Text style={[styles.modalButtonText, { color: isSavingEdit ? theme.textSecondary : theme.primary }]}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={saveEdit}
                                    style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
                                    disabled={isSavingEdit} // Prevent double-press
                                >
                                    {isSavingEdit ? (
                                         <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                         <Text style={[styles.modalButtonText, { color: '#ffffff' }]}>Save Changes</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
             {/* Global Loading Overlay (Only show during initial full fetch, not filtering) */}
             {/* {loading && transactions.length === 0 && renderLoadingIndicator()} */}
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    // --- Loading & Error States ---
    loadingOverlay: {
         ...StyleSheet.absoluteFillObject,
         backgroundColor: 'rgba(0,0,0,0.3)',
         justifyContent: 'center',
         alignItems: 'center',
         zIndex: 10,
    },
    errorContainer: {
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
         padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 5,
    },
    errorDetails: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#DDDDDD',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#333333',
        fontWeight: '500',
        fontSize: 16,
    },
    // --- Main Layout & Sections ---
    container: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 40,
        paddingHorizontal: 0,
    },
    sectionContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 10,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
    },
    // --- Filter Controls ---
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 15,
        marginBottom: 15,
        position: 'relative',
    },
    inputIcon: {
         position: 'absolute',
         left: 12,
         zIndex: 1,
    },
    input: {
        flex: 1,
        height: 46,
        borderWidth: 1,
        borderRadius: 8,
        paddingLeft: 40, // Make space for icon
        paddingRight: 12,
        fontSize: 16,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        minHeight: 46,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
    },
    icon: {
        marginRight: 12,
    },
    settingText: {
        fontSize: 16,
        marginRight: 5,
    },
    selectedDateTextInline: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    calendarWrapper: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        marginTop: 5,
        borderTopWidth: StyleSheet.hairlineWidth,
        // Use dynamic border color based on theme
        // borderTopColor: theme.separator, // Apply dynamically if needed
    },
    // --- Transaction List Item ---
    detailItemContainer: {
        // No background needed, section has it
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        minHeight: 60,
    },
    detailIcon: {
        marginRight: 12,
        width: 22, // Fixed width for alignment
        textAlign: 'center', // Center icon if needed
    },
    detailTextContainer: {
        flex: 1, // Take available space
        marginRight: 8,
    },
    detailNature: {
        fontSize: 15,
        fontWeight: '500',
        marginBottom: 2,
    },
    detailSubText: {
        fontSize: 12,
        opacity: 0.8,
    },
    detailActionContainer: {
        alignItems: 'flex-end',
    },
    detailAmount: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    actionButtons: {
        flexDirection: 'row',
    },
    actionButton: {
        marginLeft: 15, // Space between edit/delete
        padding: 2, // Increase touch target
    },
    noDataText: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 15,
        fontStyle: 'italic',
    },
    // --- Edit Modal ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        borderRadius: 14,
        padding: 20,
        elevation: 5,
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },
    modalLabel: {
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 5,
        marginTop: 10,
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    modalInput: {
        height: 46,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        marginBottom: 10,
    },
    pickerContainer: {
        height: 56,
        borderWidth: 1,
        borderRadius: 8,
        justifyContent: 'center',
        marginBottom: 10,
        overflow: 'hidden',
    },
    pickerStyle: {
        height: '100%',
        width: '100%',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end', // Align buttons to the right
        marginTop: 25,
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
        marginLeft: 10,
        minWidth: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    cancelButton: {
        // No background, relies on text color
    },
    saveButton: {
        // Background applied inline via theme
    },
});

export default SearchTransactions;
