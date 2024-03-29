import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    FlatList,
    Alert,
    ActivityIndicator,
    Dimensions,
    TouchableOpacity
} from 'react-native';
import { useColorScheme } from 'react-native'; // Hook to detect theme
import { PieChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Progress from 'react-native-progress';
import { Ionicons } from '@expo/vector-icons'; // Import icons

// --- Helper Function to Format Currency ---
const formatCurrency = (amount: number | undefined | null, symbol: string): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return `${symbol} 0.00`;
    }
    return `${symbol}${amount.toFixed(2)}`;
};

const ChartPage = () => {
    // --- State Variables ---
    const [selectedChart, setSelectedChart] = useState<'Income' | 'Expense' | 'Borrowing'>('Expense');
    const [viewMode, setViewMode] = useState('Monthly');
    const navigation = useNavigation();
    const [entries, setEntries] = useState<any[]>([]);
    const currentColorScheme = useColorScheme(); // Get current color scheme
    const screenWidth = Dimensions.get('window').width;
    const [incomeTotal, setIncomeTotal] = useState(0);
    const [expenseTotal, setExpenseTotal] = useState(0);
    const [borrowingTotal, setBorrowingTotal] = useState(0);
    const [balance, setBalance] = useState(0);
    const [currencySymbol, setCurrencySymbol] = useState('₹');
    const [expenseNatureBudget, setExpenseNatureBudget] = useState<{ [key: string]: number }>({});
    const [borrowingNatureBudget, setBorrowingNatureBudget] = useState<{ [key: string]: number }>({});
    const [loading, setLoading] = useState(true);

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
        balance: currentColorScheme === 'dark' ? '#0A84FF' : '#007AFF',
        switchThumb: currentColorScheme === 'dark' ? '#f4f3f4' : '#ffffff',
        switchTrackFalse: currentColorScheme === 'dark' ? '#2C2C2E' : '#E9E9EA',
        progressBackground: currentColorScheme === 'dark' ? '#424242' : '#e0e0e0',
        chartLabel: currentColorScheme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
    };

    // --- Data Fetching ---
    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch expenses
            const storedExpenses = await AsyncStorage.getItem('expenses');
            let data = storedExpenses ? JSON.parse(storedExpenses) : [];
            if (!Array.isArray(data)) {
                console.error("Error: 'expenses' data is not an array. Resetting to []");
                Alert.alert("Data Error", "Expense data corrupted. Resetting.");
                data = [];
                await AsyncStorage.setItem('expenses', '[]');
            }
            // Ensure amount is a number
            data = data.map(entry => ({ ...entry, amount: parseFloat(entry.amount) || 0 }));

            // Calculate totals
            const newIncomeTotal = data.filter(e => e.type === 'Income').reduce((acc, curr) => acc + curr.amount, 0);
            const newExpenseTotal = data.filter(e => e.type === 'Expense').reduce((acc, curr) => acc + curr.amount, 0);
            const newBorrowingTotal = data.filter(e => e.type === 'Borrowing').reduce((acc, curr) => acc + curr.amount, 0);
            const newBalance = newBorrowingTotal + newIncomeTotal - newExpenseTotal;

            setIncomeTotal(newIncomeTotal);
            setExpenseTotal(newExpenseTotal);
            setBorrowingTotal(newBorrowingTotal);
            setBalance(newBalance);
            setEntries(data);

            // Fetch budgets safely
            const storedExpenseNatureBudget = await AsyncStorage.getItem('expenseNatureBudget');
            const storedBorrowingNatureBudget = await AsyncStorage.getItem('borrowingNatureBudget');
            let parsedExpenseBudget = {};
            let parsedBorrowingBudget = {};

            try {
                parsedExpenseBudget = storedExpenseNatureBudget ? JSON.parse(storedExpenseNatureBudget) : {};
                if (typeof parsedExpenseBudget !== 'object' || parsedExpenseBudget === null) throw new Error("Invalid format");
                Object.keys(parsedExpenseBudget).forEach(key => { parsedExpenseBudget[key] = parseFloat(parsedExpenseBudget[key]) || 0; });
            } catch (e) {
                console.error("Error parsing expenseNatureBudget", e);
                Alert.alert("Data Error", "Expense nature budget corrupted. Resetting.");
                parsedExpenseBudget = {};
                await AsyncStorage.setItem('expenseNatureBudget', '{}');
            }
            setExpenseNatureBudget(parsedExpenseBudget);

            try {
                parsedBorrowingBudget = storedBorrowingNatureBudget ? JSON.parse(storedBorrowingNatureBudget) : {};
                if (typeof parsedBorrowingBudget !== 'object' || parsedBorrowingBudget === null) throw new Error("Invalid format");
                Object.keys(parsedBorrowingBudget).forEach(key => { parsedBorrowingBudget[key] = parseFloat(parsedBorrowingBudget[key]) || 0; });
            } catch (e) {
                console.error("Error parsing borrowingNatureBudget", e);
                Alert.alert("Data Error", "Borrowing nature budget corrupted. Resetting.");
                parsedBorrowingBudget = {};
                await AsyncStorage.setItem('borrowingNatureBudget', '{}');
            }
            setBorrowingNatureBudget(parsedBorrowingBudget);

            // Fetch preferences safely
            const prefs = await AsyncStorage.getItem('user_preferences');
            let parsedPrefs = {};
            try {
                parsedPrefs = prefs ? JSON.parse(prefs) : {};
                if (typeof parsedPrefs !== 'object' || parsedPrefs === null) throw new Error("Invalid format");
            } catch (e) {
                console.error("Error parsing user_preferences", e);
                Alert.alert("Data Error", "User preference data corrupted. Resetting.");
                parsedPrefs = {};
                await AsyncStorage.setItem('user_preferences', '{}');
            }
            const symbol = parsedPrefs.currency === 'USD' ? '$'
                : parsedPrefs.currency === 'EUR' ? '€'
                : parsedPrefs.currency === 'GBP' ? '£'
                : parsedPrefs.currency === 'JPY' ? '¥'
                : '₹';
            setCurrencySymbol(symbol);

        } catch (error: any) {
            Alert.alert("Error Loading Data", `Failed to load data: ${error.message}`);
            console.error("Error fetching data:", error);
            // Optionally reset state here if needed
        } finally {
            setLoading(false);
        }
    };

    // --- UseFocusEffect for Data Refresh ---
    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, []) // Empty dependency array means it runs on focus
    );

    // --- Data Grouping ---
    const groupByTypeAndNature = (type: 'Income' | 'Expense' | 'Borrowing') => {
        if (!Array.isArray(entries)) return {};
        const filtered = entries.filter((entry) => entry.type === type);
        return filtered.reduce((acc, curr) => {
            const nature = curr.nature || 'Uncategorized'; // Default category
            if (!acc[nature]) acc[nature] = 0;
            acc[nature] += curr.amount;
            return acc;
        }, {} as { [key: string]: number });
    };

    // --- Pie Chart Data Builder ---
    const buildPieData = (groupedData: { [key: string]: number }, colorMap: string[]) => {
        return Object.entries(groupedData)
            .filter(([key, amount]) => amount > 0) // Exclude zero-amount slices
            .map(([key, amount], index) => ({
                name: key,
                amount: amount,
                color: colorMap[index % colorMap.length], // Cycle through colors
                legendFontColor: theme.textSecondary, // Use theme color
                legendFontSize: 12,
            }));
    };

    // Define chart colors based on theme
    const pieColors = currentColorScheme === 'dark'
        ? ['#0A84FF', '#FF9F0A', '#30D158', '#FF453A', '#BF5AF2', '#64D2FF', '#FFD60A', '#A2845E'] // iOS Dark mode system colors (approx)
        : ['#007AFF', '#FF9500', '#34C759', '#FF3B30', '#AF52DE', '#5AC8FA', '#FFCC00', '#8E8E93']; // iOS Light mode system colors (approx)

    // Prepare data for charts
    const groupedIncome = groupByTypeAndNature('Income');
    const groupedExpense = groupByTypeAndNature('Expense');
    const groupedBorrowing = groupByTypeAndNature('Borrowing');
    const incomeData = buildPieData(groupedIncome, pieColors);
    const expenseData = buildPieData(groupedExpense, pieColors.slice(2)); // Offset colors
    const borrowingData = buildPieData(groupedBorrowing, pieColors.slice(4)); // Offset colors

    // Chart config using theme
    const chartConfig = {
        backgroundGradientFrom: theme.box,
        backgroundGradientTo: theme.box,
        decimalPlaces: 0,
        color: (opacity = 1) => theme.chartLabel,
        labelColor: (opacity = 1) => theme.chartLabel,
        propsForDots: { r: "4", strokeWidth: "1", stroke: theme.separator },
        style: { borderRadius: 12 },
    };

    // --- Render Logic ---
    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.scrollContentContainer}
        >
            {/* --- Summary Section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Summary</Text>
                {/* Income */}
                <View style={styles.settingItem}>
                    <View style={styles.settingLabelContainer}>
                        <Ionicons name="arrow-up-circle-outline" size={24} color={theme.income} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Income</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: theme.income }]}>{formatCurrency(incomeTotal, currencySymbol)}</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                {/* Expense */}
                <View style={styles.settingItem}>
                    <View style={styles.settingLabelContainer}>
                        <Ionicons name="arrow-down-circle-outline" size={24} color={theme.expense} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Expenses</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: theme.expense }]}>{formatCurrency(expenseTotal, currencySymbol)}</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                {/* Borrowing */}
                <View style={styles.settingItem}>
                    <View style={styles.settingLabelContainer}>
                        <Ionicons name="download-outline" size={24} color={theme.borrowing} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Borrowing</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: theme.borrowing }]}>{formatCurrency(borrowingTotal, currencySymbol)}</Text>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                {/* Balance */}
                <View style={styles.settingItem}>
                    <View style={styles.settingLabelContainer}>
                        <Ionicons name="wallet-outline" size={24} color={theme.balance} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>Net Balance</Text>
                    </View>
                    <Text style={[styles.summaryAmount, { color: balance >= 0 ? theme.balance : theme.destructive }]}>
                        {formatCurrency(balance, currencySymbol)}
                    </Text>
                </View>
            </View>

            {/* --- Breakdown Section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Breakdown</Text>
                {/* Chart Type Selector */}
                <View style={styles.chartTypeSelector}>
                    {['Income', 'Expense', 'Borrowing'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => setSelectedChart(type as 'Income' | 'Expense' | 'Borrowing')}
                            style={[
                                styles.chartTypeButton,
                                selectedChart === type && { backgroundColor: theme.primary } // Selected style
                            ]}
                        >
                            <Text style={[
                                styles.chartTypeButtonText,
                                { color: selectedChart === type ? '#fff' : theme.primary } // Text color adapts
                            ]}>
                                {type}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Pie Chart Area */}
                <View style={styles.pieChartContainer}>
                    {selectedChart === 'Income' && (
                        incomeData.length > 0
                            ? <PieChart data={incomeData} width={screenWidth - 32} height={220} chartConfig={chartConfig} accessor={"amount"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />
                            : <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No Income data.</Text>
                    )}
                    {selectedChart === 'Expense' && (
                        expenseData.length > 0
                            ? <PieChart data={expenseData} width={screenWidth - 32} height={220} chartConfig={chartConfig} accessor={"amount"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />
                            : <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No Expense data.</Text>
                    )}
                    {selectedChart === 'Borrowing' && (
                        borrowingData.length > 0
                            ? <PieChart data={borrowingData} width={screenWidth - 32} height={220} chartConfig={chartConfig} accessor={"amount"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />
                            : <Text style={[styles.noDataText, { color: theme.textSecondary }]}>No Borrowing data.</Text>
                    )}
                </View>
                <Text style={[styles.totalText, { color: theme.text }]}>
                    Total {selectedChart}: {formatCurrency(
                        selectedChart === 'Income' ? incomeTotal :
                        selectedChart === 'Expense' ? expenseTotal :
                        borrowingTotal,
                        currencySymbol
                    )}
                </Text>
            </View>

            {/* --- Details Section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>{selectedChart} Details</Text>
                {/* Daily/Monthly Switch */}
                <View style={styles.settingItem}>
                    <View style={styles.settingLabelContainer}>
                        <Ionicons name="calendar-outline" size={20} color={theme.text} style={styles.icon} />
                        <Text style={[styles.settingText, { color: theme.text }]}>View Mode</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.switchLabel, { color: viewMode === 'Daily' ? theme.primary : theme.textSecondary }]}>Daily</Text>
                        <Switch
                            value={viewMode === 'Monthly'}
                            onValueChange={(value) => setViewMode(value ? 'Monthly' : 'Daily')}
                            trackColor={{ false: theme.switchTrackFalse, true: theme.primary + '70' }}
                            thumbColor={theme.switchThumb}
                            ios_backgroundColor={theme.switchTrackFalse}
                        />
                        <Text style={[styles.switchLabel, { color: viewMode === 'Monthly' ? theme.primary : theme.textSecondary }]}>Monthly</Text>
                    </View>
                </View>
                <View style={[styles.separator, { backgroundColor: theme.separator, marginLeft: 0, marginRight: 0 }]} />

                {/* Details List */}
                <FlatList
                    // TODO: Implement filtering based on viewMode if required
                    data={Object.entries(
                        selectedChart === 'Income' ? groupedIncome :
                        selectedChart === 'Expense' ? groupedExpense :
                        groupedBorrowing
                    ).filter(([key, amount]) => amount > 0)}
                    keyExtractor={item => item[0]} // Nature is the key
                    renderItem={({ item, index }) => {
                        const [nature, totalAmount] = item;
                        let budget: number | undefined = undefined;
                        let progress = 0;
                        let isOverBudget = false;

                        // Determine budget and progress (only for Expense and Borrowing)
                        if (selectedChart === 'Expense') { budget = expenseNatureBudget[nature]; }
                        else if (selectedChart === 'Borrowing') { budget = borrowingNatureBudget[nature]; }

                        if (budget !== undefined && budget > 0) {
                            progress = Math.min(1, totalAmount / budget);
                            isOverBudget = totalAmount > budget;
                        }

                        const dotColor = pieColors[index % pieColors.length]; // Get color from chart palette

                        return (
                            <View>
                                {/* Detail Item Row */}
                                <View style={styles.detailItem}>
                                    <Ionicons name="ellipse" size={10} color={dotColor} style={styles.detailIcon} />
                                    <View style={styles.detailTextContainer}>
                                        <Text style={[styles.detailNature, { color: isOverBudget ? theme.destructive : theme.text }]}>{nature}</Text>
                                        {budget !== undefined && budget > 0 && (
                                            <Text style={[styles.detailBudget, { color: theme.textSecondary }]}>
                                                Budget: {formatCurrency(budget, currencySymbol)}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={[styles.detailAmount, { color: isOverBudget ? theme.destructive : theme.text }]}>
                                        {formatCurrency(totalAmount, currencySymbol)}
                                    </Text>
                                </View>
                                {/* Progress Bar (if applicable) */}
                                {(selectedChart === 'Expense' || selectedChart === 'Borrowing') && budget !== undefined && budget > 0 && (
                                    <View style={styles.progressBarContainer}>
                                        <Progress.Bar
                                            progress={isNaN(progress) ? 0 : progress} // Safety check
                                            width={null} // Full width
                                            color={isOverBudget ? theme.destructive : theme.primary}
                                            unfilledColor={theme.progressBackground}
                                            borderColor={"transparent"}
                                            borderWidth={0}
                                            height={6}
                                        />
                                    </View>
                                )}
                                {/* Separator */}
                                <View style={[styles.separator, { backgroundColor: theme.separator }]} />
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <Text style={[styles.noDataText, { color: theme.textSecondary, paddingVertical: 20 }]}>
                            No {selectedChart.toLowerCase()} details.
                        </Text>
                    }
                />
            </View>
        </ScrollView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingBottom: 40, // Ensures last item isn't hidden
    },
    sectionContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        overflow: 'hidden',
        paddingBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
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
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 15,
    },
    settingText: {
        fontSize: 16,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 15,
        marginRight: 15,
        marginTop: 5,
        marginBottom: 5,
    },
    summaryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    chartTypeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 15,
        paddingBottom: 15,
        paddingTop: 5,
    },
    chartTypeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: 'transparent', // Selected state handles background/border look
    },
    chartTypeButtonText: {
        fontWeight: '600',
        fontSize: 14,
    },
    pieChartContainer: {
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 10,
        // Ensure container doesn't clip chart labels if they extend
    },
    totalText: {
        marginTop: 0,
        marginBottom: 10,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    noDataText: {
        textAlign: 'center',
        paddingVertical: 30,
        fontSize: 15,
    },
    switchLabel: {
        fontSize: 14,
        marginHorizontal: 5,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    detailIcon: {
        marginRight: 12,
        opacity: 0.9,
    },
    detailTextContainer: {
        flex: 1,
        marginRight: 8,
    },
    detailNature: {
        fontSize: 15,
        fontWeight: '500',
    },
    detailBudget: {
        fontSize: 12,
        opacity: 0.8,
        marginTop: 2,
    },
    detailAmount: {
        fontSize: 15,
        fontWeight: '500',
    },
    progressBarContainer: {
        // Align progress bar start with the text, considering icon width and margins
        paddingLeft: 15 + 10 + 12, // Approx: item padding + icon size + icon margin
        paddingRight: 15, // Match item padding on the right
        paddingBottom: 8,
        marginTop: -4, // Pull bar slightly closer to text
    },
});

export default ChartPage;