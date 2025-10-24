import React, { useState } from 'react'
import { View, Text, Button, ScrollView, StyleSheet, TextInput, Alert, useColorScheme, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../components/Colors'

export default function DebugStorage() {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  const [dump, setDump] = useState('')
  const [keyName, setKeyName] = useState('')
  const [loading, setLoading] = useState(false)

  const showAll = async () => {
    setLoading(true)
    try {
      const keys = await AsyncStorage.getAllKeys()
      const entries = await AsyncStorage.multiGet(keys)
      const obj = {}
      for (const [k, v] of entries) {
        try { obj[k] = JSON.parse(v) } catch { obj[k] = v }
      }
      setDump(JSON.stringify(obj, null, 2))
    } catch (e) {
      setDump('Error: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  const readKey = async (k) => {
    setLoading(true)
    try {
      const raw = await AsyncStorage.getItem(k)
      if (raw == null) setDump(`${k} not found`)
      else {
        try { setDump(JSON.stringify({ [k]: JSON.parse(raw) }, null, 2)) }
        catch { setDump(JSON.stringify({ [k]: raw }, null, 2)) }
      }
    } catch (e) {
      setDump('Error: ' + String(e))
    } finally {
      setLoading(false)
    }
  }

  const removeKey = (k) => {
    if (!k) return Alert.alert('Enter key', 'Please enter a key name to remove')
    Alert.alert('Confirm', `Remove AsyncStorage key "${k}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await AsyncStorage.removeItem(k)
          Alert.alert('Removed', `${k} removed`)
          showAll()
        } catch (e) {
          Alert.alert('Error', String(e))
        }
      } }
    ])
  }

  const clearAll = () => {
    Alert.alert('Confirm', 'Clear ALL AsyncStorage? This will remove login tokens and all saved data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: async () => {
        try {
          await AsyncStorage.clear()
          setDump('{}')
          Alert.alert('Cleared', 'All AsyncStorage keys removed')
        } catch (e) {
          Alert.alert('Error', String(e))
        }
      } }
    ])
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Debug AsyncStorage</Text>

      <View style={styles.row}>
        <Button title="Refresh dump" onPress={showAll} disabled={loading} />
        <View style={{ width: 12 }} />
        <Button title="Clear all" color="#d33" onPress={clearAll} />
      </View>

      <View style={styles.keyRow}>
        <TextInput
          placeholder="key name (e.g. events or date)"
          placeholderTextColor={theme.text + '88'}
          value={keyName}
          onChangeText={setKeyName}
          style={[styles.input, { color: theme.text, borderColor: theme.primary }]}
        />
        <View style={{ width: 8 }} />
        <Button title="Read" onPress={() => readKey(keyName)} />
        <View style={{ width: 8 }} />
        <Button title="Remove" color="#d33" onPress={() => removeKey(keyName)} />
      </View>

      <ScrollView style={styles.dump} contentContainerStyle={{ padding: 12 }}>
        <Text style={[styles.dumpText, { color: theme.text }]}>{loading ? 'Loading…' : (dump || 'No dump yet. Press Refresh dump.')}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 12 },
  keyRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  input: { flex: 1, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  dump: { flex: 1, borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  dumpText: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }
})