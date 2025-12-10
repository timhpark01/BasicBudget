/**
 * AsyncStorage mock for testing
 * Provides an in-memory implementation of AsyncStorage
 */

let store = {};

const AsyncStorageMock = {
  getItem: jest.fn((key) => {
    return Promise.resolve(store[key] || null);
  }),

  setItem: jest.fn((key, value) => {
    store[key] = value.toString();
    return Promise.resolve();
  }),

  removeItem: jest.fn((key) => {
    delete store[key];
    return Promise.resolve();
  }),

  clear: jest.fn(() => {
    store = {};
    return Promise.resolve();
  }),

  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(store));
  }),

  multiGet: jest.fn((keys) => {
    return Promise.resolve(
      keys.map((key) => [key, store[key] || null])
    );
  }),

  multiSet: jest.fn((keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      store[key] = value.toString();
    });
    return Promise.resolve();
  }),

  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => {
      delete store[key];
    });
    return Promise.resolve();
  }),

  // Helper method to clear store between tests
  __clearStore: () => {
    store = {};
  },

  // Helper method to get current store for debugging
  __getStore: () => {
    return { ...store };
  }
};

export default AsyncStorageMock;
