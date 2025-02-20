import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const handleSubscribe = async () => {
    // On iOS, this should integrate with StoreKit for in-app purchases
    // For now, we'll just show an alert
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Coming Soon',
        'In-app purchases will be available soon.',
        [{ text: 'OK', onPress: onClose }]
      );
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.title}>Upgrade to Premium</Text>
          <Text style={styles.description}>
            Get unlimited access to AI-powered relationship analysis, conflict resolution,
            and personalized recommendations for just $9.99/month.
          </Text>

          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
          >
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  subscribeButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});