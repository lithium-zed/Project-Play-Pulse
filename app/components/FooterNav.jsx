import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useSegments } from 'expo-router'
import { Colors } from "../../components/Colors"

export default function FooterNav() {

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

  return (
    // compute theme-aware styles so they reliably override static styles
    <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { backgroundColor: theme.background }]}> 
      <View style={[styles.container, { borderTopColor: theme.accent, backgroundColor: theme.accent }]}> 
        <TouchableOpacity style={styles.button} onPress={() => navigate('/') }>
          <Text style={[styles.label, { color: theme.text }, isActive('/') && { color: theme.secondary, fontWeight: '600' }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigate('/book') }>
          <Text style={[styles.label, { color: theme.text }, isActive('/book') && { color: theme.secondary, fontWeight: '600' }]}>Book</Text>
        </TouchableOpacity>
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
