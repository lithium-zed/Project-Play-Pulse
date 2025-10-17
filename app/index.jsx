import { StyleSheet, Text, View } from 'react-native'
import React from 'react'

const Home = () => {
  return (
    <View style = {styles.container}>

      <Text style = {styles.title}>Hello World</Text>
      <Text> 2nd line</Text>

        <View style = {styles.card}>
            <Text> A card</Text>
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