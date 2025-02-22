import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export type CounselingMode = 'counselor' | 'evaluator' | 'dinner' | 'entertainment';

interface Option {
  value: CounselingMode;
  label: string;
  subLabel: string;
  icon: React.ReactNode;
}

interface CounselingModesProps {
  mode: CounselingMode;
  onChange: (mode: CounselingMode) => void;
}

const options: Option[] = [
  {
    value: 'counselor',
    label: 'Mediator',
    subLabel: 'Get balanced insights',
    icon: <MaterialCommunityIcons name="scale-balance" size={24} color="#4B5563" />,
  },
  {
    value: 'evaluator',
    label: 'Judge',
    subLabel: 'Get a clear verdict',
    icon: <MaterialCommunityIcons name="gavel" size={24} color="#4B5563" />,
  },
  {
    value: 'dinner',
    label: 'Dinner Planner',
    subLabel: 'Decide what to eat',
    icon: <MaterialCommunityIcons name="food-fork-drink" size={24} color="#4B5563" />,
  },
  {
    value: 'entertainment',
    label: 'Movie Night',
    subLabel: 'Find something to watch',
    icon: <Ionicons name="tv-outline" size={24} color="#4B5563" />,
  },
];

export default function CounselingModes({ mode, onChange }: CounselingModesProps) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = option.value === mode;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              isSelected ? styles.selectedOption : styles.unselectedOption,
            ]}
            onPress={() => onChange(option.value)}
          >
            <View style={styles.iconContainer}>{option.icon}</View>
            <View style={styles.textContainer}>
              <Text style={[styles.label, isSelected && styles.selectedLabel]}>
                {option.label}
              </Text>
              <Text style={styles.subLabel}>{option.subLabel}</Text>
            </View>
            {isSelected && (
              <View style={styles.checkmark}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#1e90ff" />
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  selectedOption: {
    borderColor: '#1e90ff',
    backgroundColor: '#EFF6FF',
  },
  unselectedOption: {
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  iconContainer: {
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    color: '#374151',
  },
  selectedLabel: {
    fontWeight: 'bold',
  },
  subLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkmark: {
    marginLeft: 8,
  },
});