import { Stack } from 'expo-router'

// Authentication, PIN and all other screens are rendered by the live website.
export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="(app)" />
    </Stack>
  )
}
