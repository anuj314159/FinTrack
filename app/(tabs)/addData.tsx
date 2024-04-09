import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    Alert,
    TouchableOpacity,
    ScrollView,
    useColorScheme,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const STORAGE_KEY = 'expenses';

const expenseOptions = [
    'Food', 'Housing', 'Transport', 'Entertainment', 'Utilities',
    'Fuel', 'Groceries', 'Education', 'Learning', 'Rent',
    'Internet', 'Mobile Recharge', 'Tea and/or Coffee', 'Other'
];
const incomeOptions = [
    'Salary', 'Freelancing', 'Gift', 'Investment', 'Other'
];
const borrowingOptions = [
    'Friend', 'Family', 'Bank Loan', 'Credit Card', 'Other'
];

const AddData = () => {
    const [selectedView, setSelectedView] = useState<'entry' | 'budget'>('entry');

    const [type, setType] = useState('--Select--');
    const [amount, setAmount] = useState('');
    const [nature, setNature] = useState('--Select--');
    const [otherNature, setOtherNature] = useState('');
    const [showOtherInput, setShowOtherInput] = useState(false);

    const [expenseNatureBudget, setExpenseNatureBudget] = useState<Record<string, number>>({});
    const [borrowingNatureLimit, setBorrowingNatureLimit] = useState<Record<string, number>>({});
    const [isBudgetEditing, setIsBudgetEditing] = useState(false);
    const [editingBudgetType, setEditingBudgetType] = useState(''); // 'Expense' or 'Borrowing'
    const [editingBudgetNature, setEditingBudgetNature] = useState(''); // Specific nature being edited
    const [tempBudgetAmount, setTempBudgetAmount] = useState('');

    const currentColorScheme = useColorScheme();
    const [mounted, setMounted] = useState(false);

    const theme = {
        background: currentColorScheme === 'dark' ? '#121212' : '#f5f5f5',
        box: currentColorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
        text: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        textSecondary: currentColorScheme === 'dark' ? '#b0b0b0' : '#666666',
        separator: currentColorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
        primary: '#007AFF',
        destructive: '#FF3B30', // Updated destructive color
        income: currentColorScheme === 'dark' ? '#30D158' : '#34C759',
        expense: currentColorScheme === 'dark' ? '#FF453A' : '#FF3B30',
        borrowing: currentColorScheme === 'dark' ? '#FF9F0A' : '#FF9500',
        inputBg: currentColorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0',
        inputBorder: currentColorScheme === 'dark' ? '#444' : '#d1d1d6',
        placeholder: currentColorScheme === 'dark' ? '#888' : '#999',
        segmentActive: currentColorScheme === 'dark' ? '#636366' : '#ffffff', // Segment control active bg
        segmentInactive: 'transparent', // Segment control inactive bg
        segmentTextActive: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        segmentTextInactive: currentColorScheme === 'dark' ? '#e5e5e5' : '#007AFF', // Use primary for inactive text in light mode
    };

    const getNatureOptions = (selectedType: string) => {
        if (selectedType === 'Expense') return expenseOptions;
        if (selectedType === 'Income') return incomeOptions;
        if (selectedType === 'Borrowing') return borrowingOptions;
        return []; // Return empty array if type is not set or invalid
    };

    const getButtonColor = () => {
        switch (type) {
            case 'Income': return theme.income;
            case 'Expense': return theme.expense;
            case 'Borrowing': return theme.borrowing;
            default: return theme.primary; // Default color if type isn't set
        }
    };

    // --- Load Budgets on Mount ---
    useEffect(() => {
        setMounted(true);
        const loadBudgets = async () => {
            try {
                // Load only nature-specific budgets, as overall budgets were removed for simplicity
                const storedExpenseNatureBudget = await AsyncStorage.getItem('expenseNatureBudget');
                const storedBorrowingNatureLimit = await AsyncStorage.getItem('borrowingNatureLimit');

                if (mounted && storedExpenseNatureBudget) {
                    setExpenseNatureBudget(JSON.parse(storedExpenseNatureBudget) || {});
                }
                if (mounted && storedBorrowingNatureLimit) {
                    setBorrowingNatureLimit(JSON.parse(storedBorrowingNatureLimit) || {});
                }
            } catch (error) {
                console.error('Failed to load budget values', error);
                Alert.alert("Load Error", "Could not load saved budget data.");
            }
        };
        loadBudgets();

        return () => {
            setMounted(false); // Cleanup mounted state
        };
    }, []); // Run only once on mount

    // --- Save Budgets when they change (and not editing) ---
    // Note: This saves whenever the budget state changes. Consider adding a manual "Save Budgets" button if frequent auto-saving is undesirable.
    useEffect(() => {
        const saveBudgets = async () => {
            if (!mounted || isBudgetEditing) return; // Don't save while editing or if not mounted
            try {
                await AsyncStorage.setItem('expenseNatureBudget', JSON.stringify(expenseNatureBudget));
                await AsyncStorage.setItem('borrowingNatureLimit', JSON.stringify(borrowingNatureLimit));
            } catch (error) {
                console.error("Failed to auto-save budgets", error);
                // Optionally alert the user if auto-save fails
                // Alert.alert("Save Error", "Could not automatically save budget changes.");
            }
        };
        // Only run saveBudgets if component is mounted and not currently editing
        if (mounted && !isBudgetEditing) {
             saveBudgets();
        }
    }, [expenseNatureBudget, borrowingNatureLimit, isBudgetEditing, mounted]);


    // --- Save Entry Data ---
    const saveData = async () => {
        const finalNature = showOtherInput ? otherNature.trim() : nature;

        // Validation
        if (type === '--Select--' || nature === '--Select--' || !amount) {
            Alert.alert('Missing Information', 'Please select a type, category, and enter an amount.');
            return;
        }
        if (showOtherInput && !finalNature) {
            Alert.alert('Missing Information', 'Please enter the custom category.');
            return;
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid positive amount.');
            return;
        }

        const record = {
            amount: parsedAmount,
            nature: finalNature,
            type,
            date: new Date().toISOString(), // Use ISO string for consistency
            id: Date.now().toString(), // Use string ID
        };

        try {
            const existing = await AsyncStorage.getItem(STORAGE_KEY);
            const parsed = existing ? JSON.parse(existing) : [];
            // Ensure data is an array
            const dataToSave = Array.isArray(parsed) ? parsed : [];
            dataToSave.push(record);

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            Alert.alert('Success', `${type} entry saved successfully!`);

            // Reset form fields
            setAmount('');
            setNature('--Select--');
            setOtherNature('');
            setShowOtherInput(false);
            setType('--Select--'); // Reset type as well

        } catch (err) {
            console.error('AsyncStorage error:', err);
            Alert.alert('Error', 'Failed to save data. Please try again.');
        }
    };

    // --- Handle Budget Setting ---
    const handleSetBudget = () => {
        if (!editingBudgetType || !editingBudgetNature || !tempBudgetAmount) {
            Alert.alert('Missing Information', 'Please select a budget type, category, and enter an amount.');
            return;
        }

        const parsedAmount = parseFloat(tempBudgetAmount);
        if (isNaN(parsedAmount) || parsedAmount < 0) { // Allow 0 budget
            Alert.alert('Invalid Input', 'Budget amount must be a valid non-negative number.');
            return;
        }

        // Update the respective budget state
        if (editingBudgetType === 'Expense') {
            setExpenseNatureBudget(prev => ({
                ...prev,
                [editingBudgetNature]: parsedAmount // Store as number
            }));
        } else if (editingBudgetType === 'Borrowing') {
            setBorrowingNatureLimit(prev => ({
                ...prev,
                [editingBudgetNature]: parsedAmount // Store as number
            }));
        }

        // Reset editing fields
        setTempBudgetAmount('');
        // Optionally reset nature/type or keep them for next entry
        // setEditingBudgetNature('');
        // setEditingBudgetType('');
        setIsBudgetEditing(false); // Exit editing mode after setting one budget
        Alert.alert('Budget Set', `Budget for ${editingBudgetNature} (${editingBudgetType}) set to ${parsedAmount}.`);
    };

    // --- Render Budget Editing Inputs ---
    const renderBudgetInputs = () => {
        const options = editingBudgetType === 'Expense' ? expenseOptions : borrowingOptions;
        const budgetMap = editingBudgetType === 'Expense' ? expenseNatureBudget : borrowingNatureLimit;

        return (
            <>
                {/* Nature Picker */}
                <Text style={[styles.label, { color: theme.textSecondary, marginTop: 15 }]}>Category</Text>
                <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                    <Picker
                        selectedValue={editingBudgetNature}
                        onValueChange={setEditingBudgetNature}
                        dropdownIconColor={theme.textSecondary}
                        style={[styles.pickerStyle, { color: theme.text }]}
                        prompt={`Select ${editingBudgetType}Category`} // Android prompt
                    >
                        <Picker.Item label="-- Select category --" value="" color={theme.placeholder}/>
                        {options.filter(opt => opt !== 'Other').map(option => ( // Exclude 'Other' from direct budget setting
                            <Picker.Item key={option} label={`${option} (Current: ${budgetMap[option] !== undefined ? budgetMap[option] : 'Not Set'})`} value={option} color={theme.text} />
                        ))}
                    </Picker>
                </View>

                {/* Amount Input */}
                <Text style={[styles.label, { color: theme.textSecondary }]}>Budget Amount</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                    keyboardType="numeric"
                    value={tempBudgetAmount}
                    onChangeText={setTempBudgetAmount}
                    placeholder={`Enter new budget for ${editingBudgetNature || 'selected category'}`}
                    placeholderTextColor={theme.placeholder}
                    returnKeyType="done"
                />

                {/* Set Budget Button */}
                <TouchableOpacity
                    onPress={handleSetBudget}
                    disabled={!editingBudgetNature || !tempBudgetAmount} // Disable if nature or amount is empty
                    style={[
                        styles.button,
                        { backgroundColor: theme.primary, marginTop: 5 },
                        (!editingBudgetNature || !tempBudgetAmount) && styles.buttonDisabled // Apply disabled style
                    ]}
                >
                     <Ionicons name="checkmark-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Set Budget</Text>
                </TouchableOpacity>
            </>
        );
    };

    // --- Render View ---
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
        >
            <ScrollView
                style={[styles.container, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled" // Dismiss keyboard on tap outside
            >
                {/* --- Segmented Control --- */}
                <View style={styles.segmentContainer}>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            selectedView === 'entry' && { backgroundColor: theme.segmentActive }
                        ]}
                        onPress={() => setSelectedView('entry')}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={selectedView === 'entry' ? theme.segmentTextActive : theme.segmentTextInactive} style={{ marginRight: 5 }} />
                        <Text style={[styles.segmentText, { color: selectedView === 'entry' ? theme.segmentTextActive : theme.segmentTextInactive }]}>
                            Add Entry
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.segmentButton,
                            selectedView === 'budget' && { backgroundColor: theme.segmentActive }
                        ]}
                        onPress={() => setSelectedView('budget')}
                    >
                        <Ionicons name="options-outline" size={20} color={selectedView === 'budget' ? theme.segmentTextActive : theme.segmentTextInactive} style={{ marginRight: 5 }} />
                        <Text style={[styles.segmentText, { color: selectedView === 'budget' ? theme.segmentTextActive : theme.segmentTextInactive }]}>
                            Manage Budgets
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* --- Conditional Rendering based on selectedView --- */}
                {selectedView === 'entry' && (
                    <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>New Transaction</Text>

                        {/* Type Picker */}
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Type</Text>
                        <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                            <Picker
                                selectedValue={type}
                                onValueChange={(val) => {
                                    setType(val);
                                    setNature('--Select--'); // Reset nature when type changes
                                    setShowOtherInput(false);
                                    setOtherNature('');
                                }}
                                dropdownIconColor={theme.textSecondary}
                                style={[styles.pickerStyle, { color: theme.text }]}
                                prompt="Select Transaction Type" // Android prompt
                            >
                                <Picker.Item label="-- Select Type --" value="--Select--" color={theme.placeholder} />
                                <Picker.Item label="Expense" value="Expense" color={theme.text}/>
                                <Picker.Item label="Income" value="Income" color={theme.text}/>
                                <Picker.Item label="Borrowing" value="Borrowing" color={theme.text}/>
                            </Picker>
                        </View>

                        {/* Amount Input */}
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Amount</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="Enter amount (e.g., 50.00)"
                            placeholderTextColor={theme.placeholder}
                            returnKeyType="next" // Go to next field
                        />

                        {/* Nature Picker */}
                        <Text style={[styles.label, { color: theme.textSecondary }]}>
                            {type === '--Select--' ? 'category' : `category of ${type}`}
                        </Text>
                        <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                            <Picker
                                selectedValue={nature}
                                onValueChange={(val) => {
                                    setNature(val);
                                    setShowOtherInput(val === 'Other');
                                    setOtherNature(''); // Clear other nature if a standard one is selected
                                }}
                                enabled={type !== '--Select--'} // Disable if type is not selected
                                dropdownIconColor={theme.textSecondary}
                                style={[styles.pickerStyle, { color: type === '--Select--' ? theme.placeholder : theme.text }]}
                                prompt={`Select category of ${type}`} // Android prompt
                            >
                                <Picker.Item label="-- Select category --" value="--Select--" color={theme.placeholder}/>
                                {getNatureOptions(type).map((option) => (
                                    <Picker.Item key={option} label={option} value={option} color={theme.text}/>
                                ))}
                            </Picker>
                        </View>

                        {/* Other Nature Input (Conditional) */}
                        {showOtherInput && (
                             <>
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Custom category</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
                                    value={otherNature}
                                    onChangeText={setOtherNature}
                                    placeholder={`Enter custom ${type.toLowerCase()} nature`}
                                    placeholderTextColor={theme.placeholder}
                                    returnKeyType="done"
                                />
                             </>
                        )}

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={saveData}
                            style={[styles.button, { backgroundColor: getButtonColor() }]}
                            disabled={type === '--Select--'} // Disable if type not selected
                        >
                            <Ionicons
                                name={type === 'Expense' ? 'arrow-down-circle' : type === 'Income' ? 'arrow-up-circle' : type === 'Borrowing' ? 'download' : 'save'}
                                size={20}
                                color={type === '--Select--' ? theme.placeholder : "white"}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[styles.buttonText, type === '--Select--' && { color: theme.placeholder }]}>
                                {type === '--Select--' ? 'Save Entry' : `Save ${type}`}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {selectedView === 'budget' && (
                    <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Manage Budgets</Text>

                        {/* Display Current Budgets */}
                        <View style={styles.budgetDisplayContainer}>
                             <Text style={[styles.budgetCategoryTitle, { color: theme.text }]}>Expense Budgets</Text>
                             {Object.keys(expenseNatureBudget).length === 0 ? (
                                 <Text style={[styles.budgetText, { color: theme.textSecondary, fontStyle: 'italic' }]}>No expense budgets set.</Text>
                             ) : (
                                Object.entries(expenseNatureBudget).map(([nature, budget]) => (
                                    <Text key={`exp-${nature}`} style={[styles.budgetText, { color: theme.text }]}>
                                        • {nature}: <Text style={{fontWeight: 'bold'}}>{String(budget)}</Text>
                                    </Text>
                                ))
                             )}

                             <View style={[styles.separator, { backgroundColor: theme.separator, marginVertical: 15 }]} />

                             <Text style={[styles.budgetCategoryTitle, { color: theme.text }]}>Borrowing Limits</Text>
                              {Object.keys(borrowingNatureLimit).length === 0 ? (
                                 <Text style={[styles.budgetText, { color: theme.textSecondary, fontStyle: 'italic' }]}>No borrowing limits set.</Text>
                             ) : (
                                Object.entries(borrowingNatureLimit).map(([nature, limit]) => (
                                    <Text key={`bor-${nature}`} style={[styles.budgetText, { color: theme.text }]}>
                                         • {nature}: <Text style={{fontWeight: 'bold'}}>{String(limit)}</Text>
                                    </Text>
                                ))
                             )}
                        </View>

                         <View style={[styles.separator, { backgroundColor: theme.separator, marginVertical: 15 }]} />

                        {/* Budget Editing Section */}
                        {!isBudgetEditing ? (
                             <TouchableOpacity
                                onPress={() => {
                                    setIsBudgetEditing(true);
                                    setEditingBudgetType(''); // Reset selection
                                    setEditingBudgetNature('');
                                    setTempBudgetAmount('');
                                }}
                                style={[styles.button, { backgroundColor: theme.primary, marginTop: 0 }]}
                            >
                                 <Ionicons name="create-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Edit Budgets</Text>
                            </TouchableOpacity>
                        ) : (
                            <View>
                                 <Text style={[styles.sectionTitle, { color: theme.text, paddingTop: 0, paddingBottom: 5 }]}>Edit Budget</Text>
                                {/* Budget Type Picker */}
                                <Text style={[styles.label, { color: theme.textSecondary }]}>Budget Type</Text>
                                <View style={[styles.pickerContainer, { borderColor: theme.inputBorder, backgroundColor: theme.inputBg }]}>
                                    <Picker
                                        selectedValue={editingBudgetType}
                                        onValueChange={(val) => {
                                            setEditingBudgetType(val);
                                            setEditingBudgetNature(''); // Reset nature when type changes
                                            setTempBudgetAmount('');
                                        }}
                                        dropdownIconColor={theme.textSecondary}
                                        style={[styles.pickerStyle, { color: theme.text }]}
                                        prompt="Select Budget Type to Edit"
                                    >
                                        <Picker.Item label="-- Select Type --" value="" color={theme.placeholder}/>
                                        <Picker.Item label="Expense" value="Expense" color={theme.text}/>
                                        <Picker.Item label="Borrowing" value="Borrowing" color={theme.text}/>
                                    </Picker>
                                </View>

                                {/* Render inputs only if a type is selected */}
                                {editingBudgetType ? renderBudgetInputs() : null}

                                {/* Cancel Edit Button */}
                                <TouchableOpacity
                                    onPress={() => setIsBudgetEditing(false)}
                                    style={[styles.button, { backgroundColor: theme.textSecondary, marginTop: 10 }]}
                                >
                                     <Ionicons name="close-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonText}>Cancel Editing</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

// --- Styles (Adapted from other pages) ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContentContainer: {
        flexGrow: 1,
        padding: 16,
        paddingBottom: 40,
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: Platform.OS === 'ios' ? '#7676801F' : '#e0e0e0',
        borderRadius: 8,
        marginBottom: 20,
        overflow: 'hidden',
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row', // Icon and text side-by-side
    },
    segmentText: {
        fontSize: 14,
        fontWeight: '600',
    },
    sectionContainer: {
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 6,
    },
    input: {
        height: 56,
        borderWidth: 1,
        marginBottom: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    pickerContainer: {
        height: 54,
        borderWidth: 1,
        borderRadius: 8,
        marginBottom: 16,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    pickerStyle: {
        height: '100%',
        width: '100%',
    },
    button: {
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        minHeight: 48,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    budgetDisplayContainer: {
        marginBottom: 15,
    },
    budgetCategoryTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    budgetText: {
        fontSize: 15,
        marginBottom: 4,
        marginLeft: 10,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
    },
});

export default AddData;
