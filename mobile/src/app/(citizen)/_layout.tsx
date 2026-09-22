import React from 'react';
import { Stack } from 'expo-router';

export default function CitizenLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="report/camera"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="report/confirm"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="report/[id]"
        options={{
          headerShown: false,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}
