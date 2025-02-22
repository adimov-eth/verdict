import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';

interface CustomButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export default function CustomButton({ title, onPress, variant = 'default', disabled }: CustomButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button, 
        variant === 'destructive' && styles.destructive,
        disabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, disabled && styles.disabledText]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 8,
    alignSelf: 'stretch',
    marginHorizontal: 16
  },
  destructive: {
    backgroundColor: '#ff4d4d'
  },
  disabled: {
    backgroundColor: '#cccccc'
  },
  text: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center'
  },
  disabledText: {
    color: '#999999'
  }
});