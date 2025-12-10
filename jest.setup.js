// Global test setup for non-component tests

// Mock expo-crypto for UUID generation
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => `mock-uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
}));

// Suppress verbose console output during tests
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

beforeAll(() => {
  // Only show errors, suppress warnings and logs during tests
  console.warn = jest.fn();
  console.log = jest.fn();

  console.error = (...args) => {
    const message = args[0];
    // Suppress known non-critical errors
    if (
      typeof message === 'string' &&
      (message.includes('Not implemented') ||
       message.includes('Warning:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});
