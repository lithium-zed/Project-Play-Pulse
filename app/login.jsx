// app/login.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../components/Colors'
import { getAuthApp } from '../firebase/firebaseConfig'
import { signInWithEmailAndPassword } from 'firebase/auth'

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
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
      // handle user-not-found with a friendly message
      if (error?.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'this account does not exist')
        return
      }
      // provide clearer error messages for other auth errors
      const msg = error?.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : 'Something went wrong'
      Alert.alert('Error', msg)
    }
  };

  useEffect(() => {
    const v = email.trim()
    if (!v) { setEmailError(''); return }
    const emailRe = /^[\w.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    setEmailError(emailRe.test(v) ? '' : 'Invalid email address')
  }, [email])

  useEffect(() => {
    if (!password) { setPasswordError(''); return }
    setPasswordError(password.length >= 8 ? '' : 'Password must be at least 8 characters')
  }, [password])

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
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

      <TextInput
        style={[styles.input, { borderColor: theme.primary, color: theme.text, backgroundColor: theme.background }]}
        placeholder="Password"
        placeholderTextColor={theme.text}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

      <Button title="Log In" onPress={handleLogin} color={theme.accent} disabled={Boolean(emailError || passwordError || !email || !password)} />
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
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
});
