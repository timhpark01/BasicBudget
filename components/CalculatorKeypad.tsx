import { Pressable, StyleSheet, Text, View } from 'react-native';

interface CalculatorKeypadProps {
  amount: string;
  onNumberPress: (num: string) => void;
  onDecimalPress: () => void;
  onBackspace: () => void;
  onClear: () => void;
}

export default function CalculatorKeypad({
  amount,
  onNumberPress,
  onDecimalPress,
  onBackspace,
  onClear,
}: CalculatorKeypadProps) {
  return (
    <>
      {/* Amount Display */}
      <View style={styles.amountDisplay}>
        <Text style={styles.currencySymbol}>$</Text>
        <Text style={styles.amountText}>{amount}</Text>
      </View>

      {/* Calculator Keypad */}
      <View style={styles.keypad}>
        <View style={styles.keypadRow}>
          <CalculatorButton label="1" onPress={() => onNumberPress('1')} />
          <CalculatorButton label="2" onPress={() => onNumberPress('2')} />
          <CalculatorButton label="3" onPress={() => onNumberPress('3')} />
        </View>
        <View style={styles.keypadRow}>
          <CalculatorButton label="4" onPress={() => onNumberPress('4')} />
          <CalculatorButton label="5" onPress={() => onNumberPress('5')} />
          <CalculatorButton label="6" onPress={() => onNumberPress('6')} />
        </View>
        <View style={styles.keypadRow}>
          <CalculatorButton label="7" onPress={() => onNumberPress('7')} />
          <CalculatorButton label="8" onPress={() => onNumberPress('8')} />
          <CalculatorButton label="9" onPress={() => onNumberPress('9')} />
        </View>
        <View style={styles.keypadRow}>
          <CalculatorButton label="." onPress={onDecimalPress} />
          <CalculatorButton label="0" onPress={() => onNumberPress('0')} />
          <CalculatorButton
            label="⌫"
            onPress={onBackspace}
            onLongPress={onClear}
          />
        </View>
      </View>
    </>
  );
}

interface CalculatorButtonProps {
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
}

function CalculatorButton({ label, onPress, onLongPress }: CalculatorButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.calcButton,
        pressed && styles.calcButtonPressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Text style={styles.calcButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  amountDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
  },
  keypad: {
    paddingHorizontal: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calcButton: {
    flex: 1,
    aspectRatio: 2.5,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  calcButtonPressed: {
    backgroundColor: '#e0e0e0',
  },
  calcButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
});
