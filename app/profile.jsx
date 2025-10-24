// app/profile.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import { Colors } from '../components/Colors'
import { useRouter } from 'expo-router';
import { getAuthApp } from '../firebase/firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const Profile = () => {
  const router = useRouter();
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  useEffect(() => {
    const auth = getAuthApp
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser({ username: u.displayName || '', email: u.email })
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, []);

  const handleLogout = async () => {
    try {
      const auth = getAuthApp
      await signOut(auth)
      setUser(null)
      Alert.alert('Logged out', 'You have successfully logged out')
    } catch (error) {
      console.error('Logout error:', error)
    }
  };

  if (loading) return null; // or a spinner

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}> 
      <Text style={[styles.title, { color: theme.text }]}>{user ? user.username : 'Welcome, Guest'}</Text>

      {!user ? (
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Log In"
              onPress={() => router.push('/login')}
              color={theme.accent}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Register"
              onPress={() => router.push('/register')}
              color={theme.accent}
            />
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Log Out" onPress={handleLogout} color={theme.accent} />
        </View>
      )}
    </View>
  );
};

export default Profile;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center', 
    alignItems: 'center',     
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 40,
  },
  buttonContainer: {
    width: '60%',
    marginBottom: 20,
  },
});
