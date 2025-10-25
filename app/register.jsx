// app/register.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../components/Colors'
import { getAuthApp } from '../firebase/firebaseConfig'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usernameError, setUsernameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  // Inline validation: run on field changes
  useEffect(() => {
    const trimmed = username.trim()
    if (!trimmed) setUsernameError('')
    else if (trimmed.length < 6) setUsernameError('Username must be at least 6 characters')
    else if (trimmed.length > 30) setUsernameError('Username must be at most 30 characters')
    else setUsernameError('')
  }, [username])

  useEffect(() => {
    const val = email.trim()
    if (!val) { setEmailError('') ; return }
    const emailRe = /^[\w.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    setEmailError(emailRe.test(val) ? '' : 'Invalid email address')
  }, [email])

  useEffect(() => {
    if (!password) { setPasswordError('') ; return }
    setPasswordError(password.length >= 8 ? '' : 'Password must be at least 8 characters')
  }, [password])

  const handleRegister = async () => {
    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim()

    // final check before submit; components also validate inline
    if (!trimmedUsername || !trimmedEmail || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    // Username: 6-30 chars
    if (trimmedUsername.length < 6 || trimmedUsername.length > 30) {
      Alert.alert('Invalid username', 'Username must be between 6 and 30 characters')
      return
    }

    // Email validation (simple, covers most common valid addresses)
    const emailRe = /^[\w.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/
    if (!emailRe.test(trimmedEmail)) {
      Alert.alert('Invalid email', 'Please enter a valid email address')
      return
    }

    // Password: minimum 8 characters
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters')
      return
    }

    try {
      const auth = getAuthApp
      const cred = await createUserWithEmailAndPassword(auth, trimmedEmail, password)
      // set display name
      try {
        await updateProfile(cred.user, { displayName: trimmedUsername })
      } catch (e) {
        console.warn('Failed setting displayName', e)
      }

      Alert.alert('Success', 'Registration complete!')
      router.replace('/profile')
    } catch (error) {
      console.error('Error saving user data:', error)
      const msg = error?.code ? error.code.replace('auth/', '').replace(/-/g, ' ') : 'Failed to save user data'
      Alert.alert('Error', msg)
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
      {usernameError ? <Text style={styles.errorText}>{usernameError}</Text> : null}

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

      <Button title="Submit" onPress={handleRegister} color={theme.accent} disabled={Boolean(usernameError || emailError || passwordError)} />
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
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
});
