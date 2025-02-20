import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CounselingMode } from '../types';

export default function HomeScreen() {
  const [mode, setMode] = useState<CounselingMode>('counselor');
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveArgument, setIsLiveArgument] = useState(false);

  const startRecording = async () => {
    try {
      // We'll implement audio recording logic here
      Alert.alert('Coming soon', 'Audio recording functionality will be added soon');
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Verdict</Text>
          <Text style={styles.subtitle}>
            Let AI analyze your arguments objectively
          </Text>
        </View>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              !isLiveArgument && styles.modeButtonActive,
            ]}
            onPress={() => setIsLiveArgument(false)}
          >
            <Text style={styles.modeButtonText}>Separate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modeButton,
              isLiveArgument && styles.modeButtonActive,
            ]}
            onPress={() => setIsLiveArgument(true)}
          >
            <Text style={styles.modeButtonText}>Live</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.recordButton}
          onPress={startRecording}
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  modeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f3f5',
    marginHorizontal: 4,
  },
  modeButtonActive: {
    backgroundColor: '#1a1a1a',
  },
  modeButtonText: {
    color: '#1a1a1a',
    fontWeight: '500',
  },
  recordButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  recordButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
