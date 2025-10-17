import { StyleSheet, Text, View, useColorScheme} from 'react-native'
import React from 'react'
import {Link} from 'expo-router'
import { Colors } from "../components/Colors"
import ThemedView from './components/ThemedView'
import ThemedText from './components/ThemedText'

const Home = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark

  return (
    <ThemedView style = {styles.container}>

      <ThemedText style = {styles.title}>Live Events</ThemedText>
      
        
    </ThemedView>
    
  )
}

export default Home

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        display: 'inline-flex'
    },
    card : {
        backgroundColor: '#eee',
        padding: 20,
        borderRadius: 10,
        boxShadow: '4px 4px rgba(0,0,0,0.1)'
    },
    title: {
        fontWeight: 'bold',
        fontSize: 25
    }
})