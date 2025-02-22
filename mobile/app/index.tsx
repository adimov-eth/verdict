import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import AudioRecorder from '../components/AudioRecorder';
import CustomButton from '../components/CustomButton';
import PaywallModal from '../components/PaywallModal';
import ResponseDisplay from '../components/ResponseDisplay';
import CounselingModes, { type CounselingMode } from '../components/CounselingModes';
import useToast from '../hooks/useToast';
import { apiRequest } from '../lib/queryClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { blobUrlToBase64 } from '../lib/audioUtils';

const uri = `http://172.20.10.5:3000`;

interface APIStatus {
  hasAccess: boolean;
  message: string;
}

export default function Index() {
  const [partner1Audio, setPartner1Audio] = useState<string | null>(null);
  const [partner2Audio, setPartner2Audio] = useState<string | null>(null);
  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [mode, setMode] = useState<CounselingMode>("counselor");
  const [showApiWarning, setShowApiWarning] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isLiveArgument, setIsLiveArgument] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [currentPartner, setCurrentPartner] = useState<1 | 2>(1);
  const { showToast } = useToast();

  // Load saved names
  useEffect(() => {
    async function loadSavedData() {
      try {
        const [p1Name, p2Name, email] = await Promise.all([
          AsyncStorage.getItem('partner1Name'),
          AsyncStorage.getItem('partner2Name'),
          AsyncStorage.getItem('userEmail')
        ]);
        
        // Auto-set dev email
        if (__DEV__ && !email) {
          await AsyncStorage.setItem('userEmail', 'dev@example.com');
          setUserEmail('dev@example.com');
        } else if (email) {
          setUserEmail(email);
        }
        
        if (p1Name) setPartner1Name(p1Name);
        if (p2Name) setPartner2Name(p2Name);
      } catch (error) {
        showToast("Failed to load saved data");
      }
    }
    loadSavedData();
  }, []);

  // Save names when they change
  useEffect(() => {
    async function saveData() {
      try {
        await Promise.all([
          AsyncStorage.setItem('partner1Name', partner1Name),
          AsyncStorage.setItem('partner2Name', partner2Name)
        ]);
      } catch (error) {
        showToast("Failed to save names");
      }
    }
    saveData();
  }, [partner1Name, partner2Name]);

  const apiStatus = useQuery<APIStatus>({
    queryKey: ['/api/openai/status'],
    enabled: false,
  });

  const createSession = useMutation({
    mutationFn: async (data: any) => {
      if (!partner1Name || !partner2Name) {
        throw new Error("Both names are required");
      }

      setAnalysisProgress(0);
      const progressInterval = setInterval(() => {
        setAnalysisProgress(current => Math.min(99, current + 1));
      }, 300);

      try {
        const status = await apiStatus.refetch();
        if (status.data?.hasAccess === false) {
          setShowApiWarning(true);
          throw new Error(status.data?.message || "API is currently unavailable");
        }

        // Convert blob URLs to base64
        const [partner1Base64, partner2Base64] = await Promise.all([
          partner1Audio ? blobUrlToBase64(partner1Audio) : null,
          partner2Audio ? blobUrlToBase64(partner2Audio) : null,
        ]);

        const response = await fetch(`${uri}/api/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            partner1Name,
            partner2Name,
            partner1Audio: partner1Base64,
            partner2Audio: partner2Base64,
            mode,
            isLiveArgument,
            email: userEmail,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create session');
        }

        const result = await response.json();
        setAnalysisProgress(100);
        clearInterval(progressInterval);
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setAnalysisProgress(0);
        throw error;
      }
    },
    onSuccess: () => {
      setShowApiWarning(false);
      showToast("Analysis complete. Check out the verdict below.");
    },
    onError: (error: Error) => {
      let errorMessage = error.message;
      if (errorMessage.includes('quota exceeded')) {
        errorMessage = "API quota exceeded. Please try again later.";
      } else if (errorMessage.includes('Failed to process audio')) {
        errorMessage = "Audio processing failed. Please ensure clear recordings.";
      } else if (errorMessage.includes('Both names are required')) {
        errorMessage = "Please enter both names before analyzing.";
      }
      showToast(errorMessage);
    },
  });

  const handleSubmit = async () => {
    if (!partner1Audio || !partner2Audio) {
      showToast("Both sides need to record their perspective first.");
      return;
    }

    if (!userEmail) {
      setShowPaywall(true);
      return;
    }

    try {
      await createSession.mutateAsync({
        partner1Name,
        partner2Name,
        partner1Audio,
        partner2Audio,
        mode,
        isLiveArgument,
        email: userEmail,
      });
    } catch (error: any) {
      if (error.message?.includes("Subscription required")) {
        setShowPaywall(true);
      }
    }
  };

  const testConnection = async () => {
    try {
      const response = await apiRequest('GET', '/api/openai/status');
      const data = await response.json();
      showToast(`API Status: ${data.message}`);
    } catch (error) {
      showToast(`Connection failed: ${error.message}`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Verdict</Text>
      <Text style={styles.subtitle}>
        Let AI analyze your arguments objectively
      </Text>

      <CounselingModes mode={mode} onChange={setMode} />

      <View style={styles.modeSwitch}>
        <TouchableOpacity 
          style={[styles.modeButton, !isLiveArgument && styles.modeButtonActive]}
          onPress={() => setIsLiveArgument(false)}
        >
          <Text style={[styles.modeButtonText, !isLiveArgument && styles.modeButtonTextActive]}>
            Separate
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.modeButton, isLiveArgument && styles.modeButtonActive]}
          onPress={() => setIsLiveArgument(true)}
        >
          <Text style={[styles.modeButtonText, isLiveArgument && styles.modeButtonTextActive]}>
            Live
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Partner 1's name"
          value={partner1Name}
          onChangeText={setPartner1Name}
        />
        <TextInput
          style={styles.input}
          placeholder="Partner 2's name"
          value={partner2Name}
          onChangeText={setPartner2Name}
        />
      </View>

      {!isLiveArgument && (
        <View style={styles.partnerSwitch}>
          <TouchableOpacity 
            style={[styles.partnerButton, currentPartner === 1 && styles.partnerButtonActive]}
            onPress={() => setCurrentPartner(1)}
          >
            <Text style={styles.partnerButtonText}>
              {partner1Name || "Partner 1"}
              {partner1Audio && " ✓"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.partnerButton, currentPartner === 2 && styles.partnerButtonActive]}
            onPress={() => setCurrentPartner(2)}
          >
            <Text style={styles.partnerButtonText}>
              {partner2Name || "Partner 2"}
              {partner2Audio && " ✓"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <AudioRecorder 
        onRecordingComplete={(uri) => {
          if (isLiveArgument) {
            setPartner1Audio(uri);
            setPartner2Audio(uri);
          } else if (currentPartner === 1) {
            setPartner1Audio(uri);
          } else {
            setPartner2Audio(uri);
          }
        }}
        initialAudio={currentPartner === 1 ? partner1Audio : partner2Audio}
      />

      {analysisProgress > 0 && analysisProgress < 100 && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${analysisProgress}%` }]} />
          <Text style={styles.progressText}>
            {analysisProgress < 30 && "Processing audio..."}
            {analysisProgress >= 30 && analysisProgress < 60 && "Transcribing..."}
            {analysisProgress >= 60 && analysisProgress < 90 && "Analyzing..."}
            {analysisProgress >= 90 && "Finalizing..."}
          </Text>
        </View>
      )}

      <CustomButton
        title={createSession.isPending ? "Analyzing..." : "Analyze"}
        onPress={handleSubmit}
        disabled={(!isLiveArgument && (!partner1Audio || !partner2Audio)) || createSession.isPending}
      />

      <CustomButton
        title="Test Connection"
        onPress={testConnection}
        variant="destructive"
      />

      {createSession.data && (
        <ResponseDisplay 
          response={createSession.data.aiResponse} 
          isStreaming={analysisProgress > 0 && analysisProgress < 100}
        />
      )}

      <PaywallModal 
        visible={showPaywall} 
        onClose={() => setShowPaywall(false)} 
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    color: '#666'
  },
  inputContainer: {
    marginVertical: 16,
    gap: 8
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12
  },
  progressContainer: {
    marginVertical: 16,
    height: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1e90ff'
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  modeSwitch: {
    flexDirection: 'row',
    marginVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6
  },
  modeButtonActive: {
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
    }),
  },
  modeButtonText: {
    color: '#666'
  },
  modeButtonTextActive: {
    color: '#000',
    fontWeight: '500'
  },
  partnerSwitch: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8
  },
  partnerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center'
  },
  partnerButtonActive: {
    backgroundColor: '#e0e0e0'
  },
  partnerButtonText: {
    color: '#333',
    fontWeight: '500'
  }
}); 