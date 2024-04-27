import React from 'react';
import { View, Text, StyleSheet, ScrollView , TouchableOpacity} from 'react-native';
import { useColorScheme } from 'react-native';
import { router, useRouter } from 'expo-router';

const AboutPage = () => {
  const colorScheme = useColorScheme();
  const navigateToBack = () => {
    router.push('/overview');
  };

  const theme = {
    background: colorScheme === 'dark' ? '#121212' : '#f5f5f5',
    text: colorScheme === 'dark' ? '#ffffff' : '#000000',
    box: colorScheme === 'dark' ? '#1e1e1e' : '#ffffff',
    separator: colorScheme === 'dark' ? '#333' : '#ccc',
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>About This App</Text>
      <Text style={[styles.paragraph, { color: theme.text }]}>This app is designed to help users track their income, expenses, and borrowings in a clean and intuitive way. It provides visual reports and data storage with customization options.</Text>

      <View style={[styles.card, { backgroundColor: theme.box }]}>
        <Text style={[styles.subtitle, { color: theme.text }]}>Version</Text>
        <Text style={[styles.text, { color: theme.text }]}>1.0.0</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.box }]}>
        <Text style={[styles.subtitle, { color: theme.text }]}>Developer</Text>
        <Text style={[styles.text, { color: theme.text }]}>@anuj314159</Text>
        <Text style={[styles.text, { color: theme.text }]}>@kanahiya22</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.box }]}>
        <Text style={styles.title}> Project Credits & Acknowledgements</Text>
        <Text style={styles.text}>• React Native — by Facebook / Meta</Text>
        <Text style={styles.text}>• Expo — by Expo.dev</Text>
        <Text style={styles.text}>• Firebase — by Google</Text>
        <Text style={styles.text}>• AsyncStorage — maintained by React Native Community</Text>
        <Text style={styles.text}>• React Navigation — by Software Mansion & contributors</Text>
        <Text style={styles.text}>• Expo Notifications — powered by Expo Team</Text>
        <Text style={styles.text}>• React Native Picker — by React Native Community</Text>
        <Text style={styles.text}>• Ionicons — by Ionic Framework team</Text>
        <TouchableOpacity
            style={styles.title}
            onPress={navigateToBack}
        >
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 16,
    marginBottom: 20,
  },
  card: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
  },
});



export default AboutPage;
