import { Dimensions, Platform, PixelRatio } from 'react-native';

/**
 * Responsive utilities for consistent sizing across all iPhone screen sizes
 */

// Base dimensions (iPhone 12/13/14 as reference)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

/**
 * Get current window dimensions
 * Use this with useWindowDimensions hook in components for reactive updates
 */
export function getWindowDimensions() {
  return Dimensions.get('window');
}

/**
 * Scale size based on screen width
 * @param size - Size to scale (based on iPhone 12 width: 390)
 */
export function scaleWidth(size: number): number {
  const { width } = getWindowDimensions();
  return PixelRatio.roundToNearestPixel((width / BASE_WIDTH) * size);
}

/**
 * Scale size based on screen height
 * @param size - Size to scale (based on iPhone 12 height: 844)
 */
export function scaleHeight(size: number): number {
  const { height } = getWindowDimensions();
  return PixelRatio.roundToNearestPixel((height / BASE_HEIGHT) * size);
}

/**
 * Scale font size based on screen width with min/max constraints
 * @param size - Base font size
 * @param minSize - Minimum font size (default: size * 0.8)
 * @param maxSize - Maximum font size (default: size * 1.2)
 */
export function scaleFontSize(
  size: number,
  minSize?: number,
  maxSize?: number
): number {
  const scaled = scaleWidth(size);
  const min = minSize ?? size * 0.8;
  const max = maxSize ?? size * 1.2;
  return Math.max(min, Math.min(max, scaled));
}

/**
 * Moderate scale - less aggressive scaling for padding/margins
 * @param size - Size to scale
 * @param factor - Scale factor (default: 0.5)
 */
export function moderateScale(size: number, factor: number = 0.5): number {
  const { width } = getWindowDimensions();
  const scale = width / BASE_WIDTH;
  return PixelRatio.roundToNearestPixel(size + (scale - 1) * size * factor);
}

/**
 * Check if device is a small screen (iPhone SE, iPhone 12 mini, etc.)
 */
export function isSmallScreen(): boolean {
  const { width, height } = getWindowDimensions();
  return width <= 375 || height <= 667;
}

/**
 * Check if device is a large screen (iPhone 14 Plus, iPhone 15 Pro Max, etc.)
 */
export function isLargeScreen(): boolean {
  const { width, height } = getWindowDimensions();
  return width >= 428 || height >= 926;
}

/**
 * Get responsive padding based on screen size
 */
export function getResponsivePadding(): {
  small: number;
  medium: number;
  large: number;
  xlarge: number;
} {
  return {
    small: moderateScale(8),
    medium: moderateScale(16),
    large: moderateScale(20),
    xlarge: moderateScale(24),
  };
}

/**
 * Get responsive font sizes
 */
export function getResponsiveFontSizes(): {
  tiny: number;
  small: number;
  medium: number;
  large: number;
  xlarge: number;
  xxlarge: number;
} {
  return {
    tiny: scaleFontSize(12, 10, 14),
    small: scaleFontSize(14, 12, 16),
    medium: scaleFontSize(16, 14, 18),
    large: scaleFontSize(20, 18, 24),
    xlarge: scaleFontSize(24, 20, 28),
    xxlarge: scaleFontSize(32, 28, 36),
  };
}

/**
 * Safe area bottom spacing for devices without safe area provider
 * Use as fallback if useSafeAreaInsets returns 0
 */
export function getDefaultBottomSafeArea(): number {
  const { height } = getWindowDimensions();
  // iPhone X and newer with home indicator
  if (Platform.OS === 'ios' && height >= 812) {
    return 34;
  }
  return 0;
}
