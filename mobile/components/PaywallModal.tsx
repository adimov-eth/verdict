import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TextInput, Platform, Alert } from 'react-native';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      // For now, simulate checkout. On iOS, notify that in-app purchases are coming soon.
      if (Platform.OS === 'ios') {
        Alert.alert('Coming Soon', 'In-app purchases will be available soon.', [
          { text: 'OK', onPress: onClose }
        ]);
      } else {
        Alert.alert('Success', 'Subscribed successfully', [
          { text: 'OK', onPress: onClose }
        ]);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Error', 'Failed to subscribe.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.description}>
            Get unlimited access to AI-powered relationship analysis and conflict resolution for just $9.99/month.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.subscribeButton, { opacity: isLoading || !email ? 0.6 : 1 }]}
              onPress={handleSubscribe}
              disabled={isLoading || !email}
            >
              <Text style={styles.subscribeButtonText}>
                {isLoading ? 'Processing...' : 'Subscribe Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalView: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    elevation: 5
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16
  },
  input: {
    height: 40,
    width: '100%',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginBottom: 16
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between'
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  cancelButtonText: {
    color: '#000',
    fontSize: 14
  },
  subscribeButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 4
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 14
  }
});