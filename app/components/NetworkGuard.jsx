import React, { useEffect, useState, useRef } from 'react'
import { View, Modal, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native'

// NetworkGuard: ensures the app has internet connectivity. If offline, shows a blocking modal
// and periodically retries. It will try to use @react-native-community/netinfo if available,
// otherwise falls back to an HTTP probe against a lightweight endpoint.

const PROBE_URL = 'https://clients3.google.com/generate_204'

async function probeFetch(timeout = 5000) {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(PROBE_URL, { method: 'GET', signal: controller.signal })
    clearTimeout(id)
    return res && (res.status === 204 || res.status === 200)
  } catch (e) {
    return false
  }
}

const NetworkGuard = ({ children }) => {
  const [online, setOnline] = useState(true)
  const [checking, setChecking] = useState(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    let mounted = true

    const tryUseNetInfo = async () => {
      try {
        const NetInfo = require('@react-native-community/netinfo')
        // if NetInfo exists, use its listener
        const unsubscribe = NetInfo.addEventListener(state => {
          if (!mounted) return
          const isConnected = !!state.isConnected && !!state.isInternetReachable !== false ? state.isInternetReachable ?? state.isConnected : state.isConnected
          setOnline(Boolean(isConnected))
        })
        // also fetch initial value
        const init = await NetInfo.fetch()
        if (mounted) {
          const isConnected = !!init.isConnected && !!init.isInternetReachable !== false ? init.isInternetReachable ?? init.isConnected : init.isConnected
          setOnline(Boolean(isConnected))
        }
        return () => unsubscribe()
      } catch (e) {
        // NetInfo not available; fall back to probe
        const check = async () => {
          setChecking(true)
          const ok = await probeFetch()
          setChecking(false)
          if (mounted) setOnline(Boolean(ok))
        }
        // initial check
        check()
        // poll every 5 seconds
        intervalRef.current = setInterval(check, 5000)
        return () => clearInterval(intervalRef.current)
      }
    }

    tryUseNetInfo()

    return () => {
      mounted = false
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const retry = async () => {
    setChecking(true)
    // try netinfo first
    try {
      const NetInfo = require('@react-native-community/netinfo')
      const state = await NetInfo.fetch()
      const isConnected = !!state.isConnected && !!state.isInternetReachable !== false ? state.isInternetReachable ?? state.isConnected : state.isConnected
      setOnline(Boolean(isConnected))
    } catch (e) {
      const ok = await probeFetch()
      setOnline(Boolean(ok))
    }
    setChecking(false)
  }

  return (
    <View style={{ flex: 1 }}>
      {children}

      <Modal visible={!online} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View style={styles.box}>
            <Text style={styles.title}>No internet connection</Text>
            <Text style={styles.message}>This app requires an internet connection to function. Please reconnect and retry.</Text>
            {checking ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
            <View style={styles.row}>
              <TouchableOpacity style={styles.button} onPress={retry}>
                <Text style={styles.buttonText}>Retry</Text>
              </TouchableOpacity>
              {Platform.OS !== 'web' ? (
                <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => { /* allow quitting or backgrounding */ }}>
                  <Text style={[styles.buttonText, styles.secondaryText]}>Continue offline</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  box: { width: 300, padding: 18, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { textAlign: 'center', color: '#333' },
  row: { flexDirection: 'row', marginTop: 16 },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#235AE9', marginHorizontal: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' },
  secondaryText: { color: '#333' }
})

export default NetworkGuard
