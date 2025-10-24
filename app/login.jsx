// app/login.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../components/Colors'
import { getAuthApp } from '../firebase/firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    try {
      const auth = getAuthApp
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
      // signed in
      const u = cred.user
      Alert.alert('Success', `Welcome back, ${u.displayName || u.email}!`)
      router.replace('/profile')
    } catch (error) {
      console.error('Login error:', error);
      // provide clearer error messages for auth
      const msg = error?.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : 'Something went wrong'
      Alert.alert('Error', msg)
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Text style={[styles.title, { color: theme.text }]}>Log In</Text>

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

      <Button title="Log In" onPress={handleLogin} color={theme.accent} />
    </View>
  );
};

export default Login;

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
