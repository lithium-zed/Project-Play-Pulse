import { StyleSheet, Text, View, useColorScheme} from 'react-native'
import React from 'react'
import {Link} from 'expo-router'
import { Colors } from "../components/Colors"

const Home = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark

  return (
    <View style = {[styles.container, {backgroundColor: theme.background}]}>

      <Text style = {[styles.title,{color: theme.text}]}>Events</Text>
      <Text style = {[styles.title,{color: theme.text}]}> 2nd line</Text>

        <View style = {[styles.card,{backgroundColor: theme.primary}]}>
            <Text style = {[styles.title,{color: theme.text}]}>Placeholder_Live</Text>
        </View>
        <View style = {[styles.card,{backgroundColor: theme.secondary}]}>
            <Text style = {[styles.title,{color: theme.text}]}>Placeholder_Upcoming</Text>
        </View>
    
    
        
    </View>
    
  )
}

export default Home

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
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