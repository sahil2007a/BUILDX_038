import React from 'react';
import { Stack } from 'expo-router';

export default function OfficerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="dashboard/index" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/ticket/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="dashboard/works-ledger" options={{ headerShown: false }} />
    </Stack>
  );
}
