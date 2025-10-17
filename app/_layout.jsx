import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Slot } from 'expo-router'
import FooterNav from './components/FooterNav'

const RootLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      {/* Slot renders the child screens from the file-based router; make it grow */}
      <View style={{ flex: 1 }}>
        <Slot />
      </View>
      {/* Global footer navigation */}
      <FooterNav />
    </View>
  )
}

export default RootLayout

const styles = StyleSheet.create({
  
})