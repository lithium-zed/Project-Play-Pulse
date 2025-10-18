// app/profile.js
import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Profile = () => {
  const router = useRouter();
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const userData = await AsyncStorage.getItem('user');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      setUser(null);
      Alert.alert('Logged out', 'You have successfully logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) return null; // or a spinner

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user ? user.username : 'Welcome, Guest'}</Text>

      {!user ? (
        <>
          <View style={styles.buttonContainer}>
            <Button
              title="Log In"
              onPress={() => router.push('/login')}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              title="Register"
              onPress={() => router.push('/register')}
            />
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Log Out" onPress={handleLogout} />
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
