import { StyleSheet, Text, View, useColorScheme } from 'react-native'
import React from 'react'
import { Colors } from "../../components/Colors"

const ThemedText = ({style,...props}) => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark
  
    return (
    <Text
      style =  {[{color: theme.text}, style]}
      {...props}   
    />
  )
}

export default ThemedText

const styles = StyleSheet.create({})