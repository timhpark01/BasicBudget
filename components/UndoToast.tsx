import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UndoToastProps {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export default function UndoToast({ visible, message, onUndo, onDismiss }: UndoToastProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      // Show component
      setShouldRender(true);

      // Slide up
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 4 seconds
      timeoutRef.current = setTimeout(() => {
        onDismiss();
      }, 4000);
    } else if (shouldRender) {
      // Slide down with callback to hide after animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // Hide component after animation completes
        setShouldRender(false);
      });
    }

    // Cleanup timeout on unmount or visibility change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, slideAnim, onDismiss, shouldRender]);

  const handleUndo = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    onUndo();
  };

  if (!shouldRender) {
    return null;
  }

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom, // Directly above nav bar
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={handleUndo} activeOpacity={0.7}>
          <Text style={styles.undoButton}>UNDO</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#000000CC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  undoButton: {
    color: '#355e3b',
    fontSize: 16,
    fontWeight: '700',
  },
});
