import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useSegments } from 'expo-router'

export default function FooterNav() {
  const router = useRouter()
  const segments = useSegments()

  const navigate = (to) => {
    router.push(to)
  }

  const isActive = (path) => {
    // simple active check: first segment
    return segments[0] === path.replace(/^\//, '')
  }

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
      <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={() => navigate('/') }>
        <Text style={[styles.label, isActive('/') && styles.active]}>Home</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.button} onPress={() => navigate('/book') }>
        <Text style={[styles.label, isActive('/book') && styles.active]}>Book</Text>
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
    borderTopColor: '#ddd',
    backgroundColor: '#fff'
  },
  button: {
    flex: 1,
    alignItems: 'center'
  },
  label: {
    fontSize: 13,
    color: '#444'
  },
  active: {
    color: '#007AFF',
    fontWeight: '600'
  }
  ,
  safeArea: {
    backgroundColor: '#fff'
  }
})
