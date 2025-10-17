import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'
import { Colors } from "../components/Colors"

const BookEvent = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark
    
  return (
    <View style = {[styles.container, {backgroundColor: theme.background}]}>
        <Text style = {[styles.title,{color: theme.text}]}>Book Event</Text>
        <View style = {[styles.card,{backgroundColor: theme.accent}]}>
            <Text style = {[styles.title,{color: theme.text}]}>Placeholder</Text>
        </View>
    
      
    </View>
  )
}

export default BookEvent

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    title: {
        fontWeight: 'bold',
        fontSize: 25
    },
    card : {
        backgroundColor: '#eee',
        padding: 20,
        borderRadius: 10,
        boxShadow: '4px 4px rgba(0,0,0,0.1)'
    }
})