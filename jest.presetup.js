/**
 * Pre-setup file that runs BEFORE jest-expo setup
 * Used to polyfill required React Native modules
 */

// Ensure UIManager exists before jest-expo tries to use it
const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules');
if (!mockNativeModules.UIManager) {
  mockNativeModules.UIManager = {};
}
