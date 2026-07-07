import { ExpoRoot } from 'expo-router';
import React from 'react';

// Expo's AppEntry.js imports this file and calls registerRootComponent on it.
export default function App() {
  // @ts-ignore
  const ctx = require.context('./src/app');
  return <ExpoRoot context={ctx} />;
}
