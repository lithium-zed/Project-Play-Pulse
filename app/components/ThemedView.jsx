import { StyleSheet, Text, View, useColorScheme} from 'react-native'
import React from 'react'
import { Colors } from "../../components/Colors"

const ThemedView = ({style, ...props}) => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark

  return (
    <View
        style = {[{backgroundColor: theme.background}, style]}
        {...props}
    />
     
  )
}

export default ThemedView

const styles = StyleSheet.create({})