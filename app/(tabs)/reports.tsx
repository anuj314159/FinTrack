import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions, // Import Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';
import { router, useRouter } from 'expo-router';


const PREFS_KEY = 'user_preferences';
const STORAGE_KEY = 'expenses';
const { width } = Dimensions.get('window'); // Get screen width

const ReportPage = () => {
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [totals, setTotals] = useState({ Expense: 0, Income: 0, Borrowing: 0 });
  const [balance, setBalance] = useState(0);
  const currentColorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // --- Theme Object ---
  const theme = {
    background: currentColorScheme === 'dark' ? '#121212' : '#f5f5f5',
    box: currentColorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
    text: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
    textSecondary: currentColorScheme === 'dark' ? '#b0b0b0' : '#666666',
    separator: currentColorScheme === 'dark' ? '#3A3A3C' : '#E5E5EA',
    primary: '#007AFF',
    income: currentColorScheme === 'dark' ? '#30D158' : '#34C759',
    expense: currentColorScheme === 'dark' ? '#FF453A' : '#FF3B30',
    borrowing: currentColorScheme === 'dark' ? '#FF9F0A' : '#FF9500',
    balance: currentColorScheme === 'dark' ? '#0A84FF' : '#007AFF',
    destructive: '#FF3B30',
  };

  // --- Format Currency Function ---
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return `${currencySymbol} 0.00`;
    }
    return `${currencySymbol}${amount.toFixed(2)}`;
  };

  // --- Get Current Month/Year ---
  const getCurrentMonthYear = () => {
    const now = new Date();
    return {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  };

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setError(null);
    let currentSymbol = '₹';
    try {
      // Fetch preferences first
      const prefs = await AsyncStorage.getItem(PREFS_KEY);
      let parsedPrefs = {};
      try {
        parsedPrefs = prefs ? JSON.parse(prefs) : {};
        if (typeof parsedPrefs !== 'object' || parsedPrefs === null) throw new Error("Invalid format");
      } catch (e) {
        console.error("Error parsing user_preferences", e);
        Alert.alert("Data Error", "User preference data corrupted. Resetting.");
        parsedPrefs = {};
        await AsyncStorage.setItem(PREFS_KEY, '{}');
      }
      currentSymbol = parsedPrefs.currency === 'USD' ? '$'
          : parsedPrefs.currency === 'EUR' ? '€'
          : parsedPrefs.currency === 'GBP' ? '£'
          : parsedPrefs.currency === 'JPY' ? '¥'
          : '₹';
      setCurrencySymbol(currentSymbol);

      // Fetch expenses
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      let data = stored ? JSON.parse(stored) : [];

      if (!Array.isArray(data)) {
        console.error("Error: 'expenses' data is not an array. Resetting to []");
        Alert.alert("Data Error", "Report data corrupted. Resetting.");
        data = [];
        await AsyncStorage.setItem(STORAGE_KEY, '[]');
      }

      data = data.map(entry => ({ ...entry, amount: parseFloat(entry.amount) || 0 }));

      const { month, year } = getCurrentMonthYear();
      const monthlyData = data.filter((item) => {
        const date = new Date(item.date);
        return !isNaN(date.getTime()) && date.getMonth() === month && date.getFullYear() === year;
      });

      // Group by nature
      const natureGroups = {};
      monthlyData.forEach((item) => {
        const nature = item.nature || 'Uncategorized';
        if (!natureGroups[nature]) {
          natureGroups[nature] = { totalAmount: 0, type: item.type, date: item.date };
        }
        natureGroups[nature].totalAmount += item.amount;
      });

      const summaryArray = Object.entries(natureGroups).map(
        ([nature, { totalAmount, type, date }]) => ({ nature, totalAmount, type, date })
      );

      // Calculate totals
      const newTotals = { Expense: 0, Income: 0, Borrowing: 0 };
      monthlyData.forEach((item) => {
        if (newTotals[item.type] !== undefined) {
           newTotals[item.type] += item.amount;
        }
      });

      setTotals(newTotals);
      setBalance(newTotals.Borrowing + newTotals.Income - newTotals.Expense);
      setMonthlySummary(summaryArray);

    } catch (err) {
      console.error('Error processing data:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to load or process data: ${message}`);
      Alert.alert('Error', `Failed to load data. ${message}`);
    } finally {
      setLoading(false);
    }
  }, []); // Keep dependencies minimal

  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  // --- Summary Stat Item (Modified for Horizontal Layout) ---
  const SummaryStatItem = ({ label, value, iconName, color, isHalfWidth = false }) => (
    <View style={[styles.summaryStatItem, isHalfWidth && styles.summaryStatItemHalf]}>
        <View style={styles.summaryStatLabelContainer}>
            <Ionicons name={iconName} size={20} color={color} style={styles.summaryStatIcon} />
            <Text style={[styles.summaryStatLabel, { color: theme.textSecondary }]}>{label}</Text>
        </View>
        <Text style={[styles.summaryStatAmount, { color: color }]}>{formatCurrency(value)}</Text>
    </View>
  );

  // --- Render Item for FlatList ---
  const renderItem = ({ item }) => {
    const iconName =
      item.type === 'Income' ? 'arrow-up-circle'
      : item.type === 'Expense' ? 'arrow-down-circle'
      : 'download';
    const color =
      item.type === 'Income' ? theme.income
      : item.type === 'Expense' ? theme.expense
      : theme.borrowing;

    let displayDate = 'Invalid Date';
    try {
      const dateObj = new Date(item.date);
      if (!isNaN(dateObj.getTime())) {
        displayDate = dateObj.toLocaleDateString();
      }
    } catch (e) { /* Ignore */ }

    return (
      <View>
        <View style={styles.detailItem}>
          <Ionicons name={iconName} size={20} color={color} style={styles.detailIcon} />
          <View style={styles.detailTextContainer}>
            <Text style={[styles.detailNature, { color: theme.text }]}>{item.nature}</Text>
            <Text style={[styles.detailSubText, { color: theme.textSecondary }]}>
              {item.type} • {displayDate}
            </Text>
          </View>
          <Text style={[styles.detailAmount, { color: color }]}>
            {formatCurrency(item.totalAmount)}
          </Text>
        </View>
        <View style={[styles.separator, { backgroundColor: theme.separator, marginLeft: 47 }]} />
      </View>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 10 }}>Loading Report...</Text>
      </View>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={50} color={theme.destructive} />
        <Text style={[styles.errorText, { color: theme.destructive }]}>Error Loading Report</Text>
        <Text style={[styles.errorDetails, { color: theme.textSecondary }]}>{error}</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function navigateToGenAiPage() {
        router.push('../genAiAnalysis');
  }

  // --- Main Content ---
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner look
    >
      {/* --- Summary Section (Revised Layout) --- */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>This Month's Summary</Text>
        {/* Row 1: Income & Expenses */}
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

      {/* --- AI Powered Report Button (Moved) --- */}
      {/* <View style={[styles.sectionContainer,{flexDirection: 'row',
        alignItems: 'center'}]}>
        <Link href="/genAiAnalysis" asChild>
          <TouchableOpacity style={[styles.aiButtonContainer, { backgroundColor: theme.box }]}>
            <Ionicons name="sparkles-outline" size={20} color={theme.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.aiButtonText, { color: theme.primary }]}>Generate AI Powered Report</Text>
          </TouchableOpacity>
        </Link>
      </View> */}

      {/* --- Entries Section --- */}
      <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
         <TouchableOpacity
          onPress={navigateToGenAiPage} 
          style={[styles.button, styles.syncButton, { marginRight: 5, backgroundColor: "#008B8B" }]}
          accessibilityRole="button"
          accessibilityLabel="AI Report"
      >
          <Ionicons name="sparkles-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
           <Text style={styles.buttonText}>Generate AI report</Text>
       </TouchableOpacity>


        <Text style={[styles.sectionTitle, { color: theme.text, paddingBottom: 10 }]}>Entries by Category</Text>
        <FlatList
          data={monthlySummary}
          keyExtractor={(item, index) => `${item.nature}-${index}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 10 }}
          ListEmptyComponent={
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No entries recorded for this month yet.
            </Text>
          }
          scrollEnabled={false} // Keep disabled as it's in ScrollView
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
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#333333',
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 40, // Ensures last item isn't hidden
    paddingTop: 8, // Add some padding at the top
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 12, // Consistent spacing below sections
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 17, // Slightly larger title
    fontWeight: '600',
    paddingHorizontal: 15,
    paddingTop: 15,
    // paddingBottom handled per instance
  },
  // --- NEW Summary Styles ---
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Distribute items evenly
    paddingHorizontal: 0, // Padding handled by items
    paddingVertical: 10, // Vertical padding for the row
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
  // --- END NEW Summary Styles ---
  separator: {
    height: StyleSheet.hairlineWidth,
    // marginLeft/Right applied where needed
  },
  // --- AI Button Styles (Moved) ---
  aiButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12, // Space below button
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 12,
    // Shadow/Elevation can be added for more prominence
    // elevation: 2,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.1,
    // shadowRadius: 2,
  },
  aiButtonText: {
    fontWeight: '500',
    fontSize: 15,
  },
  // --- Detail List Styles ---
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  detailIcon: {
    marginRight: 12,
    width: 20,
    textAlign: 'center', // Center icon within its width
  },
  detailTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  detailNature: {
    fontSize: 15,
    fontWeight: '500',
  },
  detailSubText: {
    fontSize: 12,
    opacity: 0.8,
    marginTop: 2,
  },
  detailAmount: {
    fontSize: 15,
    fontWeight: '500',
  },
  noDataText: {
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  syncButton: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
  },
});

export default ReportPage;
