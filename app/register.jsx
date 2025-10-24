// app/register.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '../components/Colors'

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {

      const userData = { username, email, password };
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      Alert.alert('Success', 'Registration complete!');
      router.replace('/profile'); 
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save user data');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Text style={[styles.title, { color: theme.text }]}>Register</Text>

      <TextInput
        style={[styles.input, { borderColor: theme.primary, color: theme.text, backgroundColor: theme.background }]}
        placeholder="Username"
        placeholderTextColor={theme.text}
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={[styles.input, { borderColor: theme.primary, color: theme.text, backgroundColor: theme.background }]}
        placeholder="Email"
        placeholderTextColor={theme.text}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      />

      <TextInput
        style={[styles.input, { borderColor: theme.primary, color: theme.text, backgroundColor: theme.background }]}
        placeholder="Password"
        placeholderTextColor={theme.text}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button title="Submit" onPress={handleRegister} color={theme.accent} />
    </View>
  );
};

export default Register;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
});
