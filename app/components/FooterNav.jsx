import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme, Keyboard, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useSegments } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from "../../components/Colors"

export default function FooterNav() {

  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false))

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const router = useRouter()
  const segments = useSegments()
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  const navigate = (to) => {
    router.push(to)
  }

  const isActive = (path) => {
    // simple active check: first segment
    return segments[0] === path.replace(/^\//, '')
  }

  if (keyboardVisible) return null

  return (
    // compute theme-aware styles so they reliably override static styles
    <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <View style={[styles.container, { borderTopColor: theme.accent, backgroundColor: theme.accent }]}> 
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigate('/') }
          accessibilityLabel="Home"
          accessibilityRole="button"
        >
          <Ionicons
            name={isActive('/') ? 'home' : 'home-outline'}
            size={24}
            color={isActive('/') ? theme.secondary : theme.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigate('/book') }
          accessibilityLabel="Book"
          accessibilityRole="button"
        >
          <Ionicons
            name={isActive('/book') ? 'add-circle' : 'add-circle-outline'}
            size={24}
            color={isActive('/book') ? theme.secondary : theme.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigate('/profile') }
          accessibilityLabel="Profile"
          accessibilityRole="button"
        >
          <Ionicons
            name={isActive('/profile') ? 'person' : 'person-outline'}
            size={24}
            color={isActive('/profile') ? theme.secondary : theme.text}
          />
        </TouchableOpacity>

        {/* TEMP: quick debug route button for development */}
        {/* <TouchableOpacity
          style={styles.button}
          onPress={() => navigate('/debug') }
          accessibilityLabel="Debug"
          accessibilityRole="button"
        >
          <Ionicons
            name={'bug'}
            size={20}
            color={theme.text}
          />
        </TouchableOpacity> */}

      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 15
  },
  button: {
    flex: 1,
    alignItems: 'center'
  },
  label: {
    fontSize: 13,
    
  },
  active: {
    fontWeight: '600'
  }
  ,
  safeArea: {

  }
})
