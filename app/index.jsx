import React, { useState, useCallback, useEffect } from 'react'
import { getAuthApp } from '../firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import {
  subscribeToEvents,
  subscribeToJoinedEvents,
  joinEvent as joinEventFirebase,
  leaveEvent as leaveEventFirebase,
  updateEvent,
  deleteEvent,
  initializeSeedEvents
} from '../firebase/databaseUtils'
import {
  StyleSheet,
  Text,
  View,
  Alert,
  useColorScheme,
  Modal,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  TextInput
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from "../components/Colors"
import ThemedView from './components/ThemedView'
import Separator from './components/Separator'
import Separator2 from './components/Separator2'
import EventCardLive from './components/EventCardLive'

const Home = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark
  const insets = useSafeAreaInsets()

  const [events, setEvents] = useState([])

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joinedEvents, setJoinedEvents] = useState({})
  const [inviteCode, setInviteCode] = useState('')

  const [isLoggedIn, setIsLoggedIn] = useState(false)
  

  // parse "MM/DD/YYYY", "MM/DD/YYYY HH:MM", "MM/DD/YYYY HH:MM AM/PM" or ISO strings
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0)
    // if it's already an ISO-ish string that Date understands, use it
    const isoLike = dateStr.includes('T') || dateStr.includes('-')
    if (isoLike) {
      const d = new Date(dateStr)
      if (!isNaN(d)) return d
    }

    // split date and optional time
    // allow extra spaces, e.g. "10/25/2025 02:00 PM"
    const partsAll = dateStr.trim().split(/\s+/)
    const datePart = partsAll[0] || ''
    const timePart = partsAll.slice(1).join(' ') || ''
    const parts = (datePart || '').split('/').map(Number)
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      const [m, d, y] = parts
      let hours = 0
      let minutes = 0
      if (timePart) {
        // handle "HH:MM" or "HH:MMAM" / "HH:MM AM" with AM/PM
        const t = timePart.trim()
        const ampmMatch = t.match(/(am|pm)$/i)
        const hasAMPM = !!ampmMatch
        const timeOnly = hasAMPM ? t.replace(/(am|pm)$/i, '').trim() : t
        const [hStr, minStr] = timeOnly.split(':').map(s => s && s.replace(/[^0-9]/g, ''))
        hours = Number(hStr) || 0
        minutes = Number(minStr) || 0
        if (hasAMPM) {
          const ampm = ampmMatch[0].toLowerCase()
          if (ampm === 'pm' && hours < 12) hours += 12
          if (ampm === 'am' && hours === 12) hours = 0
        }
      } else {
        // No explicit time on date-only events: assume start at noon (12:00) to avoid marking same-day events as "Started"
        // Adjust this default as needed (e.g. 18 for 6pm)
        hours = 12
        minutes = 0
      }
      return new Date(y, m - 1, d, hours, minutes, 0, 0)
    }

    // fallback to Date parser
    const fallback = new Date(dateStr)
    if (!isNaN(fallback)) return fallback
    return new Date(0)
  }

  // helper: compare two Date objects for same calendar day
  const isSameDay = (a, b) => {
    if (!(a instanceof Date) || !(b instanceof Date)) return false
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate()
  }


  // Initialize Firebase listeners (seed events moved to auth callback)
  useEffect(() => {
    // Set up real-time listeners
    const unsubscribeEvents = subscribeToEvents((eventsData) => {
      setEvents(eventsData)
    })

    const unsubscribeJoined = subscribeToJoinedEvents((joinedData) => {
      setJoinedEvents(joinedData)
    })

    return () => {
      unsubscribeEvents()
      unsubscribeJoined()
    }
  }, [])

  // add auth subscription to keep isLoggedIn and storage in sync
  useEffect(() => {
    try {
      const auth = typeof getAuthApp === 'function' ? getAuthApp() : getAuthApp
      const unsub = onAuthStateChanged(auth, async (u) => {
        try {
          if (u) {
            setIsLoggedIn(true)
            // persist minimal user info for per-user keys
            await AsyncStorage.setItem('user', JSON.stringify({ email: u.email, displayName: u.displayName }))
            await AsyncStorage.setItem('userToken', 'loggedIn')
            // Initialize seed events after authentication
            await initializeSeedEvents()
          } else {
            setIsLoggedIn(false)
            setJoinedEvents({})
            // clear stored user/token on sign-out
            await AsyncStorage.removeItem('user')
            await AsyncStorage.removeItem('userToken')
          }
        } catch (err) {
          console.warn('onAuthStateChanged handler error', err)
        }
      })
      return () => unsub()
    } catch (e) {
      console.warn('onAuthStateChanged subscription failed', e)
    }
  }, []) // run once

  

  const openEvent = (event) => {
    setSelectedEvent(event)
    setInviteCode('')
    setModalVisible(true)
  }

  const closeEvent = () => {
    setModalVisible(false)
    setSelectedEvent(null)
  }

  const handleBackdropPress = () => closeEvent()

  // guard duplicate joins/leaves and log actions (helps debug)
  const joinEvent = async () => {
    // function-level guard
    if (!isLoggedIn) {
      Alert.alert('Login required', 'You must be logged in to join an event')
      return
    }
    if (!selectedEvent) return
    if (!selectedEvent.participants) return

    if (joinedEvents[selectedEvent.id]) {
      Alert.alert('Already joined', 'You have already joined this event')
      return
    }

    if (selectedEvent.access === 'private') {
      if (!inviteCode.trim()) {
        Alert.alert('Invite code required', 'Please enter the invite code for this private event.')
        return
      }
      if (selectedEvent.inviteCode && inviteCode.trim().toUpperCase() !== selectedEvent.inviteCode.toUpperCase()) {
        Alert.alert('Invalid invite code', 'The invite code you entered is incorrect. Please try again.')
        setInviteCode('') // Clear the text field on invalid code
        return
      }
    }

    try {
      await joinEventFirebase(selectedEvent.id)
      // Optimistically update local joinedEvents so UI updates while Firestore snapshot syncs
      setJoinedEvents(prev => ({ ...(prev || {}), [selectedEvent.id]: true }))
      Alert.alert('Joined', 'You have successfully joined the event!')
    } catch (error) {
      console.error('Error joining event:', error)
      Alert.alert('Error', 'Failed to join the event. Please try again.')
    }
  }

  const leaveEvent = async () => {
    // function-level guard
    if (!isLoggedIn) {
      Alert.alert('Login required', 'You must be logged in to leave an event')
      return
    }
    if (!selectedEvent?.participants) return

    if (!joinedEvents[selectedEvent.id]) {
      Alert.alert('Not joined', 'You are not currently joined to this event')
      return
    }

    try {
      await leaveEventFirebase(selectedEvent.id)
      // Optimistically remove from local joinedEvents so UI updates immediately
      setJoinedEvents(prev => {
        const copy = { ...(prev || {}) }
        delete copy[selectedEvent.id]
        return copy
      })
      Alert.alert('Left', 'You have successfully left the event!')
    } catch (error) {
      console.error('Error leaving event:', error)
      Alert.alert('Error', 'Failed to leave the event. Please try again.')
    }
  }

  const refreshEvents = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }, [modalVisible])

  const today = new Date()
  const getStatusColor = (ev) => {
    if (!ev) return '#34C759'
    if (ev.participants && ev.participants.current >= ev.participants.max) return '#FF3B30'
    if (ev.access === 'private') return '#FFCC00'
    return '#34C759'
  }

  const renderItem = ({ item }) => (
    <Pressable onPress={() => openEvent(item)} style={{ paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Event card takes most of the width */}
        <View style={{ flex: 1 }}>
          <EventCardLive
            key={`${item.id}-${item.participants?.current}`}
            title={item.title}
            date={item.date}
            tag={item.tag}
            statusColor={getStatusColor(item)}
            host={item.host}
          />
        </View>

        {/* countdown removed */}
      </View>
    </Pressable>
  )

  const live = events.filter(e => isSameDay(parseDate(e.date), today))
  const upcoming = events.filter(e => parseDate(e.date) > today)
  live.sort((a, b) => parseDate(a.date) - parseDate(b.date))
  upcoming.sort((a, b) => parseDate(a.date) - parseDate(b.date))
  const sections = [{ title: 'Live Events', data: live }, { title: 'Upcoming', data: upcoming }]

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <SectionList
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshEvents}
              tintColor="#FFFFFF"
              colors={["#FFFFFF"]}
              progressBackgroundColor="#235AE9"
            />
          }
          sections={sections}
          keyExtractor={(item, index) => item.id ?? (item.title + index)}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            title === 'Live Events' ? <Separator label={title} /> : <Separator2 label={title} />
          )}
          contentContainerStyle={[styles.cardsContainer, { paddingTop: 8 }]}
          showsVerticalScrollIndicator={true}
          stickySectionHeadersEnabled={true}
        />

        <Modal visible={modalVisible} animationType="fade" transparent={true} onRequestClose={closeEvent}>
          <Pressable style={modalStyles.backdrop} onPress={handleBackdropPress} pointerEvents="box-none">
            {(() => {
              // Get the current event data from the events array to ensure real-time updates
              const currentEvent = events.find(e => e.id === selectedEvent?.id) || selectedEvent;
              return (
                <View style={[modalStyles.modal, { minHeight: currentEvent?.access === 'private' && !joinedEvents[currentEvent?.id] ? 360 : 295 }]} pointerEvents="auto">
                  <View style={modalStyles.header}>
                    <View style={[modalStyles.statusDot, { backgroundColor: currentEvent ? getStatusColor(currentEvent) : '#34C759' }]} />
                    <Text style={modalStyles.title}>{currentEvent?.title}</Text>
                  </View>
                  <Text style={modalStyles.meta}>{currentEvent?.date} • {currentEvent?.time ?? currentEvent?.startTime ?? ''} • {currentEvent?.host}</Text>
                  {currentEvent?.description ? <Text style={modalStyles.desc}>{currentEvent.description}</Text> : null}
                  {currentEvent?.participants ? <Text style={modalStyles.participants}>Participants {currentEvent.participants.current}/{currentEvent.participants.max}</Text> : null}
                  {currentEvent?.access === 'private' && !joinedEvents[currentEvent?.id] ? (
                    <TextInput
                      style={modalStyles.inviteInput}
                      placeholder={
                        !isLoggedIn
                          ? "Login required"
                          : currentEvent?.participants && currentEvent.participants.current >= currentEvent.participants.max
                          ? "Event full"
                          : "Enter invite code"
                      }
                      placeholderTextColor="#CCCCCC"
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      editable={isLoggedIn && currentEvent?.participants && currentEvent.participants.current < currentEvent.participants.max}
                    />
                  ) : null}

                  <View style={modalStyles.buttonsRow}>
                    {(() => {
                      try {
                        const auth = typeof getAuthApp === 'function' ? getAuthApp() : getAuthApp
                        const cu = auth?.currentUser
                        const isHost = cu && (cu.email === currentEvent?.host || cu.displayName === currentEvent?.host)
                        if (isHost) {
                          // Host sees End Event and Close
                          return (
                            <>
                              <TouchableOpacity style={modalStyles.endBtn} onPress={() => {
                                // confirm before deleting event
                                Alert.alert(
                                  'End Event',
                                  'Are you sure you want to end and remove this event? This cannot be undone.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'End Event', style: 'destructive', onPress: async () => {
                                        try {
                                          await deleteEvent(currentEvent.id)
                                          Alert.alert('Ended', 'Event has been ended and removed.')
                                          closeEvent()
                                        } catch (err) {
                                          console.error('Failed to delete event', err)
                                          Alert.alert('Error', 'Failed to end event. Try again.')
                                        }
                                      }
                                    }
                                  ],
                                  { cancelable: true }
                                )
                              }}>
                                <Text style={modalStyles.endBtnText}>End Event</Text>
                              </TouchableOpacity>

                              <TouchableOpacity style={modalStyles.closeBtn} onPress={closeEvent}>
                                <Text style={modalStyles.closeBtnText}>Close</Text>
                              </TouchableOpacity>
                            </>
                          )
                        }
                      } catch (e) {
                        console.warn('Error checking host', e)
                      }

                      // Non-host users: show Join/Leave and Close
                      return (
                        <>
                          {isLoggedIn && joinedEvents[currentEvent?.id] ? (
                            <TouchableOpacity style={modalStyles.leaveBtn} onPress={leaveEvent}>
                              <Text style={modalStyles.leaveBtnText}>Leave</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[modalStyles.joinBtn, (!currentEvent?.participants || currentEvent.participants.current >= currentEvent.participants.max || !isLoggedIn) && modalStyles.disabledButton]}
                              onPress={joinEvent}
                              disabled={!currentEvent?.participants || currentEvent.participants.current >= currentEvent.participants.max || !isLoggedIn}
                            >
                              <Text style={modalStyles.joinBtnText}>Join</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity style={modalStyles.closeBtn} onPress={closeEvent}>
                            <Text style={modalStyles.closeBtnText}>Close</Text>
                          </TouchableOpacity>
                        </>
                      )
                    })()}
                  </View>
                </View>
              );
            })()}
           </Pressable>
         </Modal>
      </SafeAreaView>
    </ThemedView>
  )
}

export default Home

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 2,
    display: 'inline-flex'
  },
  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
    alignItems: 'stretch'
  },
  card: {
    backgroundColor: '#eee',
    padding: 20,
    borderRadius: 10,
    boxShadow: '4px 4px rgba(0,0,0,0.1)'
  },
  title: {
    fontWeight: 'bold',
    fontSize: 25
  }
})

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modal: {
    position: 'relative',
    width: 249,
    backgroundColor: '#235AE9',
    borderRadius: 10,
    padding: 20,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: '#E6F0FF',
    marginBottom: 16
  },
  desc: {
    fontSize: 14,
    color: '#F0F6FF',
    marginBottom: 20,
    lineHeight: 20
  },
  participants: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 24
  },
  buttonsRow: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  joinBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  joinBtnText: {
    color: '#235AE9',
    fontWeight: '600',
    fontSize: 16
  },
  closeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16
  },
  leaveBtn: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  leaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16
  },
  endBtn: {
    backgroundColor: '#FFCC00',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  endBtnText: {
    color: '#1e1e1e',
    fontWeight: '700',
    fontSize: 14
  },
  disabledButton: {
    opacity: 0.5
  },
  inviteInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#235AE9',
    marginBottom: 16
  }
})