import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface ResponseDisplayProps {
  response: string;
}

export default function ResponseDisplay({ response }: ResponseDisplayProps) {
  // Split the response into sections based on header markers.
  const sections = response.split('\n').reduce((acc: string[][], line) => {
    if (
      line.trim().startsWith('VERDICT:') ||
      line.trim().startsWith('WHY:') ||
      line.trim().startsWith('ALTERNATIVES:') ||
      line.trim().startsWith('KEY POINTS:') ||
      line.trim().startsWith('ADVICE:') ||
      line.trim().startsWith('WINNER:')
    ) {
      acc.push([line.trim()]);
    } else if (line.trim() && acc.length > 0) {
      acc[acc.length - 1].push(line.trim());
    }
    return acc;
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Analysis Results</Text>
      <ScrollView style={styles.scrollArea}>
        {sections.map((section, i) => (
          <View key={i} style={styles.section}>
            {section.map((line, j) => (
              <Text
                key={j}
                style={[styles.text, j === 0 ? styles.headerText : styles.bodyText]}
              >
                {line}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    backgroundColor: '#fff'
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  scrollArea: {
    maxHeight: 200
  },
  section: {
    marginBottom: 8
  },
  text: {
    fontSize: 14
  },
  headerText: {
    fontWeight: 'bold',
    color: '#1e90ff'
  },
  bodyText: {
    paddingLeft: 8,
    color: '#333'
  }
});