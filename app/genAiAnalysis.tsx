// AnalysisPage.js
import React, { useState } from "react";
import {
    View,
    ScrollView,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    useColorScheme,
    Platform // Import Platform for potential minor tweaks if needed
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { analyzeTextData } from "../app/analyzeTextData"; // Ensure path is correct
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { API_KEY } from "../firebaseConfig";//NON FIREBASE KEY


const AnalyzeStoredText = () => {
    const [analysis, setAnalysis] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const currentColorScheme = useColorScheme();

    // --- Theme Object (with subtle additions) ---
    const theme = {
        background: currentColorScheme === 'dark' ? '#121212' : '#f5f5f5',
        box: currentColorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
        text: currentColorScheme === 'dark' ? '#ffffff' : '#000000',
        textSecondary: currentColorScheme === 'dark' ? '#b0b0b0' : '#666666', // For placeholders/secondary info
        separator: currentColorScheme === 'dark' ? '#333' : '#eee',
        primary: '#007AFF',
        destructive: '#ff3b30', // Slightly adjusted red for destructive elements
        destructiveBackground: currentColorScheme === 'dark' ? 'rgba(255, 59, 48, 0.15)' : 'rgba(255, 59, 48, 0.08)', // Subtle error background
        disabled: '#999',
        buttonText: '#ffffff',
        outlineButtonText: currentColorScheme === 'dark' ? '#0A84FF' : '#007AFF', // Outline button text color matches primary
        resultsBackground: currentColorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0', // Subtle background for results area
    };

    // --- Analysis Logic (as before) ---
    const handleAnalyze = async (dataKeys: string[]) => {
        // ... (logic remains the same) ...
        setLoading(true);
        setErrorMessage(null);
        setAnalysis("");
        try {
            let combinedText = "";
            for (const key of dataKeys) {
                const text = await AsyncStorage.getItem(key);
                if (text) {
                    combinedText += `\n--- ${key} ---\n${text}\n`; // Add spaces around key
                } else {
                    combinedText += `\n--- ${key} ---\n(No data found for key: ${key})\n`;
                     // Consider logging this instead of including it in the analysis text
                     console.warn(`No data found for key: ${key}`);
                }
            }
            if (!combinedText.trim()) {
                // Use a more informative message
               setAnalysis("No relevant data found in local storage to analyze.");
               setLoading(false);
               return;
           }
            const result = await analyzeTextData(combinedText, API_KEY);
            if (result.error) { setErrorMessage(typeof result.error === 'string' ? result.error : result.error.message || "Analysis failed."); }
            else if (result.data) { setAnalysis(result.data); }
            else { setErrorMessage("Unexpected response from analysis."); }
        } catch (error: any) { setErrorMessage(`An error occurred: ${error.message || "Could not process request."}`); }
        finally { setLoading(false); }
    };

    const analyzeSpecificData = () => handleAnalyze(["expenses"]); // Example keys
    const analyzeAllData = async () => {
      try {
          const allKeys = await AsyncStorage.getAllKeys();
          // Optional: Filter keys you *don't* want to analyze (e.g., internal config)
          const filteredKeys = allKeys.filter(key => !key.startsWith('firebase:') && !key.includes('Expo') /* Add other filters */);
          if (filteredKeys.length === 0) {
              setAnalysis("No applicable data found in local storage.");
              return;
          }
          handleAnalyze(filteredKeys);
      } catch (error: any) { // Type error
          console.error("Error getting AsyncStorage keys:", error);
          setErrorMessage(`Error retrieving data keys: ${error.message}`);
      }
    };  
    const goBack = () => {

      router.push('/'); // Go back using Expo Router
      
    };
    // --- Render Logic ---
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>

            {/* --- Actions Section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.box }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Run Analysis</Text>

                {/* Analyze Specific Button (Primary) */}
                <TouchableOpacity
                    style={[styles.button, styles.buttonSolid, { backgroundColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={analyzeSpecificData}
                    disabled={loading}
                    activeOpacity={0.7} // Standard feedback
                >
                    <Ionicons name="documents-outline" size={20} color={theme.buttonText} style={styles.buttonIcon} />
                    <Text style={[styles.buttonText, { color: theme.buttonText }]}>
                        {loading ? "Analyzing..." : "Analyze Key Data"}
                    </Text>
                </TouchableOpacity>

                {/* Analyze All Button (Secondary/Outline) */}
                <TouchableOpacity
                    style={[styles.button, styles.buttonOutline, { borderColor: theme.primary }, loading && styles.disabledButton]}
                    onPress={analyzeAllData}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Ionicons name="analytics-outline" size={20} color={theme.outlineButtonText} style={styles.buttonIcon} />
                    <Text style={[styles.buttonText, { color: theme.outlineButtonText }]}>
                        {loading ? "Analyzing..." : "Analyze All Data"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* --- Results Section --- */}
            <View style={[styles.sectionContainer, { backgroundColor: theme.box, flex: 1, paddingBottom: 5 }]}>
                 <Text style={[styles.sectionTitle, { color: theme.text }]}>Analysis Result</Text>

                 <View style={styles.resultsArea}>
                    {loading && (
                        <View style={styles.centeredStatus}>
                             <ActivityIndicator size="large" color={theme.primary} />
                             <Text style={[styles.statusText, { color: theme.textSecondary, marginTop: 15 }]}>
                                 Analyzing your data...
                            </Text>
                        </View>
                    )}

                    {errorMessage && !loading && (
                        <View style={[styles.errorContainer, { backgroundColor: theme.destructiveBackground }]}>
                            <Ionicons name="warning-outline" size={22} color={theme.destructive} style={styles.statusIcon}/>
                             <Text style={[styles.errorText, { color: theme.destructive }]}>{errorMessage}</Text>
                         </View>
                    )}

                    {!loading && !errorMessage && analysis && (
                        // Added subtle background to the ScrollView content for contrast
                        <ScrollView
                             style={styles.resultsScrollView}
                             contentContainerStyle={[styles.resultsContentContainer, { backgroundColor: theme.resultsBackground }]}
                        >
                            <Text style={[styles.analysisText, { color: theme.text }]} selectable={true}>
                                 {analysis}
                            </Text>
                        </ScrollView>
                    )}

                     {/* Placeholder when no analysis/error/loading */}
                     {!loading && !errorMessage && !analysis && (
                          <View style={styles.centeredStatus}>
                              <Ionicons name="information-circle-outline" size={30} color={theme.textSecondary} style={styles.statusIcon} />
                              <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                                  Click a button above to generate insights from your stored data.
                              </Text>
                          </View>
                     )}
                 </View>
            </View>

             {/* --- Navigation Section --- */}
             <View style={[styles.sectionContainer, { backgroundColor: theme.box, marginTop: 5, marginBottom: 5 }]}>
                 <TouchableOpacity onPress={goBack} style={styles.linkItem} activeOpacity={0.7}>
                    <Ionicons name="chevron-back-outline" size={22} color={theme.primary} style={styles.icon} />
                    <Text style={[styles.linkText, { color: theme.primary }]}>Go Back</Text>
                </TouchableOpacity>
             </View>
             {/* Add some bottom spacing */}
             <View style={{ height: 30 }} />

        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 10,
    },
    sectionContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        // paddingBottom removed, handled by content or specific styles
        overflow: 'hidden',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 15,
        paddingTop: 15,
        paddingBottom: 15, // Increased bottom padding for title
    },
    // --- Button Styles ---
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginHorizontal: 15,
        marginVertical: 6, // Slightly reduced vertical margin
    },
    buttonSolid: { // For primary action
        // backgroundColor set dynamically
    },
    buttonOutline: { // For secondary action
        borderWidth: 1.5, // Make outline slightly thicker
        backgroundColor: 'transparent',
        // borderColor set dynamically
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600', // Use semibold for buttons
        textAlign: 'center',
        // color set dynamically
    },
    buttonIcon: {
        marginRight: 8, // Slightly reduced icon margin
    },
    disabledButton: {
        opacity: 0.5, // Make it more faded when disabled
    },
     // --- Link Item Styling ---
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 15,
    },
    linkText: {
        fontSize: 16,
        fontWeight: '500',
    },
    icon: {
        marginRight: 10,
    },
    // --- Results Area Styles ---
    resultsArea: {
        flex: 1, // Allow this area to grow
        paddingHorizontal: 15,
        paddingBottom: 15,
        minHeight: 150, // Ensure a minimum height for the results area
        justifyContent: 'center', // Center content vertically when empty/loading/error
    },
    centeredStatus: { // For Loading / Placeholder / Error Text
        alignItems: 'center',
        padding: 20,
    },
    statusIcon: {
        marginBottom: 10,
    },
    statusText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    errorContainer: { // Specific container for error message
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8, // Rounded corners for error box
        marginVertical: 10, // Space around error box
    },
    errorText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        lineHeight: 21,
    },
    resultsScrollView: {
        flex: 1, // Take available space within resultsArea
    },
    resultsContentContainer: { // Apply background/padding to the content inside ScrollView
        padding: 15,
        borderRadius: 8, // Match section rounding
    },
    analysisText: {
        fontSize: 15,
        lineHeight: 23, // Slightly increased line height for readability
    },
});

export default AnalyzeStoredText;