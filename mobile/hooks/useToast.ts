import { Alert, Platform } from 'react-native';

export default function useToast() {
  const showToast = (message: string) => {
    if (Platform.OS === 'web') {
      // Web platform
      if (typeof window !== 'undefined') {
        window.alert(message);
      }
    } else {
      // iOS and Android
      Alert.alert('', message);
    }
  };

  return { showToast };
}