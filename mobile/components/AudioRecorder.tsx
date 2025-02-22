import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';

interface AudioRecorderProps {
  onRecordingComplete: (uri: string | null) => void;
  initialAudio?: string | null;
}

const RECORDING_OPTIONS = {
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCM: false,
    audioQualityPriority: "sampleRate",
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
    extension: '.webm'
  },
};

export default function AudioRecorder({ onRecordingComplete, initialAudio }: AudioRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedURI, setRecordedURI] = useState<string | null>(initialAudio || null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    console.log('[AudioRecorder] Starting recording...');
    try {
      const permission = await Audio.requestPermissionsAsync();
      console.log('[AudioRecorder] Permission status:', permission.status);
      
      if (permission.status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant audio recording permissions.');
        return;
      }

      console.log('[AudioRecorder] Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[AudioRecorder] Creating new recording with options:', {
        platform: Platform.OS,
        ...RECORDING_OPTIONS[Platform.OS as keyof typeof RECORDING_OPTIONS]
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(RECORDING_OPTIONS);
      await newRecording.startAsync();
      console.log('[AudioRecorder] Recording started successfully');
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('[AudioRecorder] Recording error:', error);
      console.error('[AudioRecorder] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        platform: Platform.OS
      });
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.warn('[AudioRecorder] Stop called but no active recording');
      return;
    }

    console.log('[AudioRecorder] Stopping recording...');
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('[AudioRecorder] Recording stopped. URI:', uri);
      
      // Log file details if on web
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          console.log('[AudioRecorder] Recorded file details:', {
            size: blob.size,
            type: blob.type,
            uri: uri
          });
        } catch (error) {
          console.error('[AudioRecorder] Failed to fetch blob details:', error);
        }
      }

      setRecordedURI(uri);
      setIsRecording(false);
      setRecording(null);
      console.log('[AudioRecorder] Calling onRecordingComplete with URI');
      onRecordingComplete(uri);
    } catch (error) {
      console.error('[AudioRecorder] Stop recording error:', error);
      console.error('[AudioRecorder] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      Alert.alert('Error', 'Failed to stop recording.');
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title={isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={isRecording ? stopRecording : startRecording}
      />
      {recordedURI && (
        <Text style={styles.uriText}>Recorded Audio URI: {recordedURI}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    alignItems: 'center'
  },
  uriText: {
    marginTop: 8,
    fontSize: 14
  }
});