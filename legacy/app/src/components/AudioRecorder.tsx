import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Recorder, Player } from '@react-native-community/audio-toolkit';
import type { AudioRecording } from '../types';

interface AudioRecorderProps {
  onRecordingComplete: (recording: AudioRecording) => void;
}

export default function AudioRecorder({ onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recorder = useRef<Recorder | null>(null);
  const player = useRef<Player | null>(null);
  const durationInterval = useRef<NodeJS.Timeout>();
  const recordingPath = useRef<string>('');

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      stopRecording();
      if (player.current) {
        player.current.destroy();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Generate unique filename
      const filename = `recording-${Date.now()}.aac`;
      recordingPath.current = filename;

      recorder.current = new Recorder(filename, {
        bitrate: 128000,
        channels: 1,
        sampleRate: 44100,
        quality: 'max',
        format: 'aac',
        encoder: 'aac',
      });

      recorder.current.prepare((err, fsPath) => {
        if (err) {
          Alert.alert('Error', 'Failed to start recording');
          return;
        }

        recorder.current?.record((err) => {
          if (err) {
            Alert.alert('Error', 'Failed to start recording');
            return;
          }

          setIsRecording(true);
          setRecordingDuration(0);

          // Start duration tracking
          durationInterval.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);
        });
      });
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (recorder.current && isRecording) {
      recorder.current.stop((err) => {
        if (err) {
          Alert.alert('Error', 'Failed to stop recording');
          return;
        }

        setIsRecording(false);
        if (durationInterval.current) {
          clearInterval(durationInterval.current);
        }

        onRecordingComplete({
          uri: recordingPath.current,
          duration: recordingDuration,
        });

        // Setup player for playback
        player.current = new Player(recordingPath.current);
        player.current.prepare();
      });
    }
  };

  const togglePlayback = () => {
    if (!player.current) return;

    if (isPlaying) {
      player.current.pause();
      setIsPlaying(false);
    } else {
      player.current.play((err) => {
        if (err) {
          Alert.alert('Error', 'Failed to play recording');
          return;
        }
      });
      setIsPlaying(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, isRecording && styles.recordingButton]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Text>
      </TouchableOpacity>

      {recordingDuration > 0 && (
        <Text style={styles.duration}>
          Recording duration: {recordingDuration}s
        </Text>
      )}

      {!isRecording && recordingPath.current && (
        <TouchableOpacity
          style={[styles.button, styles.playButton]}
          onPress={togglePlayback}
        >
          <Text style={styles.buttonText}>
            {isPlaying ? 'Pause' : 'Play Recording'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 8,
    width: '100%',
  },
  recordingButton: {
    backgroundColor: '#dc2626',
  },
  playButton: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  duration: {
    marginTop: 8,
    color: '#666',
    fontSize: 14,
  },
});