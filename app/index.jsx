import React, { useState, useCallback, useEffect } from 'react'
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  StyleSheet,
  Text,
  View,
  useColorScheme,
  Modal,
  Pressable,
  TouchableOpacity,
  RefreshControl,
  SectionList,
  TextInput
} from 'react-native'
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
  const SEED_EVENTS = [
    { id: '1', title: 'Live Concert', date: '10/24/2025', host: 'John Smith', tag: 'MUSIC', access: 'public', participants: { current: 0, max: 10 } },
    { id: '2', title: 'Live Concert', date: '10/24/2025', host: 'Sarah Wilson', tag: 'MUSIC', access: 'public', participants: { current: 0, max: 10 } },
    { id: '3', title: 'Art Expo', date: '10/25/2025', participants: { current: 5, max: 15 }, description: 'An immersive art exhibition featuring local artists.', host: 'Maria Garcia', tag: 'ART', access: 'public' },
    { id: '4', title: 'Tech Talk', date: '10/25/2025', host: 'Alex Chen', tag: 'TECH', access: 'private', participants: { current: 0, max: 10 }, inviteCode: 'TECH2025' },
    { id: '5', title: 'Book Club', date: '10/25/2025', participants: { current: 9, max: 10 }, description: 'Join us for an engaging discussion.', host: 'Emma Williams', tag: 'BOOK', access: 'private', inviteCode: 'BOOKCLUB' }
  ]

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joinedEvents, setJoinedEvents] = useState({})
  const [inviteCode, setInviteCode] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // helper: current user email
  const getCurrentUserEmail = async () => {
    try {
      const userData = await AsyncStorage.getItem('user')
      if (!userData) return null
      const parsed = JSON.parse(userData)
      return parsed?.email ?? null
    } catch (e) {
      console.warn('getCurrentUserEmail error', e)
      return null
    }
  }

  const parseDate = (mmddyyyy) => {
    const [m, d, y] = mmddyyyy.split('/').map(Number)
    return new Date(y, m - 1, d)
  }

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  // Load saved events and normalize shapes
  const loadSavedEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem('events')
      if (stored) {
        const parsed = JSON.parse(stored)
        const normalized = parsed.map((e) => {
          let participants = { current: 0, max: 10 }
          if (typeof e.participants === 'number') {
            participants = { current: 0, max: e.participants }
          } else if (e.participants && typeof e.participants === 'object') {
            participants = {
              current: typeof e.participants.current === 'number' ? e.participants.current : (e.participants?.count ?? 0),
              max: typeof e.participants.max === 'number' ? e.participants.max : (e.participants?.limit ?? 10)
            }
          }

          return {
            id: e.id ?? Date.now().toString(),
            title: e.title || 'Untitled',
            date: e.date || '',
            host: e.hostName || e.host || 'Unknown',
            tag: (e.category || e.tag || '').toUpperCase(),
            access: e.status === 'private' ? 'private' : (e.access || 'public'),
            participants,
            description: e.description || '',
            inviteCode: e.inviteCode || e.invitationCode || null
          }
        })
        setEvents(normalized)
      } else {
        setEvents(SEED_EVENTS)
      }
    } catch (error) {
      console.log('Error loading saved events:', error)
    }
  }

  const saveEvents = async (newEvents) => {
    try {
      await AsyncStorage.setItem('events', JSON.stringify(newEvents))
    } catch (error) {
      console.log('Error saving events:', error)
    }
  }

  // joinedEvents persisted per-user under `joinedEvents:<email>`
  const loadJoinedEvents = async () => {
    try {
      const email = await getCurrentUserEmail()
      if (!email) {
        setJoinedEvents({})
        return
      }
      const key = `joinedEvents:${email}`
      const stored = await AsyncStorage.getItem(key)
      setJoinedEvents(stored ? JSON.parse(stored) : {})
    } catch (error) {
      console.log('Error loading joined events:', error)
    }
  }

  const saveJoinedEvents = async (newJoinedEvents) => {
    try {
      const email = await getCurrentUserEmail()
      if (!email) {
        console.warn('saveJoinedEvents: no logged-in user — not saving')
        setJoinedEvents(newJoinedEvents)
        return
      }
      const key = `joinedEvents:${email}`
      await AsyncStorage.setItem(key, JSON.stringify(newJoinedEvents))
      setJoinedEvents(newJoinedEvents)
    } catch (error) {
      console.log('Error saving joined events:', error)
    }
  }

  // check login state (based on token key used by your login screen)
  const checkLogin = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken')
      setIsLoggedIn(!!userToken)
    } catch (e) {
      console.error('Error checking login:', e)
      setIsLoggedIn(false)
    }
  }

  // init: load events → check login → load joined for that user
  useEffect(() => {
    const init = async () => {
      await loadSavedEvents()
      await checkLogin()
      await loadJoinedEvents()
    }
    init()
  }, [])

  // reload joined when login changes (clears when logged out)
  useEffect(() => {
    loadJoinedEvents()
  }, [isLoggedIn])

  // also re-check login when modal toggles (keeps UI in sync)
  useEffect(() => {
    const check = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        setIsLoggedIn(!!userToken);
      } catch (e) {
        console.error('Error checking login:', e);
        setIsLoggedIn(false);
      }
    }
    check();
  }, [modalVisible])

   useEffect(() => {
    if (!isLoggedIn) {
      setJoinedEvents({});
    } else {
      // reload the current user's joined events when they log in
      loadJoinedEvents();
    }
  }, [isLoggedIn])

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

  const joinEvent = async () => {
    if (!selectedEvent) return
    if (!selectedEvent.participants) return

    if (!isLoggedIn) {
      Alert.alert('Login required', 'You must be logged in to join an event')
      return
    }

    if (selectedEvent.access === 'private') {
      if (!inviteCode.trim()) {
        Alert.alert('Invite code required', 'Please enter the invite code for this private event.')
        return
      }
      if (selectedEvent.inviteCode && inviteCode.trim().toUpperCase() !== selectedEvent.inviteCode.toUpperCase()) {
        Alert.alert('Invalid invite code', 'The invite code you entered is incorrect. Please try again.')
        return
      }
    }

    const updatedEvents = events.map(ev =>
      ev.id === selectedEvent.id
        ? {
          ...ev,
          participants: {
            current: Math.min(ev.participants.current + 1, ev.participants.max),
            max: ev.participants.max
          }
        }
        : ev
    )
    setEvents(updatedEvents)
    await saveEvents(updatedEvents)

    const newJoined = { ...joinedEvents, [selectedEvent.id]: true }
    await saveJoinedEvents(newJoined)

    const updatedEvent = updatedEvents.find(ev => ev.id === selectedEvent.id)
    setSelectedEvent(updatedEvent)
  }

  const leaveEvent = async () => {
    if (!selectedEvent?.participants) return

    if (!isLoggedIn) {
      Alert.alert('Login required', 'You must be logged in to leave an event')
      return
    }

    const updatedEvents = events.map(ev =>
      ev.id === selectedEvent.id
        ? {
          ...ev,
          participants: {
            current: Math.max(ev.participants.current - 1, 0),
            max: ev.participants.max
          }
        }
        : ev
    )

    setEvents(updatedEvents)
    await saveEvents(updatedEvents)

    const newJoinedEvents = { ...joinedEvents }
    delete newJoinedEvents[selectedEvent.id]
    await saveJoinedEvents(newJoinedEvents)

    const updatedEvent = updatedEvents.find(ev => ev.id === selectedEvent.id)
    setSelectedEvent(updatedEvent)
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
    <Pressable onPress={() => openEvent(item)}>
      <EventCardLive
        key={`${item.id}-${item.participants?.current}`}
        title={item.title}
        date={item.date}
        tag={item.tag}
        statusColor={getStatusColor(item)}
        host={item.host}
      />
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

        <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={closeEvent}>
          <Pressable style={modalStyles.backdrop} onPress={handleBackdropPress}>
            <View style={[modalStyles.modal, { minHeight: selectedEvent?.access === 'private' && !joinedEvents[selectedEvent?.id] ? 360 : 295 }]}>
              <View style={modalStyles.header}>
                <View style={[modalStyles.statusDot, { backgroundColor: selectedEvent ? getStatusColor(selectedEvent) : '#34C759' }]} />
                <Text style={modalStyles.title}>{selectedEvent?.title}</Text>
              </View>
              <Text style={modalStyles.meta}>{selectedEvent?.date} • {selectedEvent?.host}</Text>
              {selectedEvent?.description ? <Text style={modalStyles.desc}>{selectedEvent.description}</Text> : null}
              {selectedEvent?.participants ? <Text style={modalStyles.participants}>Participants {selectedEvent.participants.current}/{selectedEvent.participants.max}</Text> : null}
              {selectedEvent?.access === 'private' && !joinedEvents[selectedEvent?.id] ? (
                <TextInput
                  style={modalStyles.inviteInput}
                  placeholder={isLoggedIn ? "Enter invite code" : "Login required"}
                  placeholderTextColor="#CCCCCC"
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  editable={isLoggedIn}
                />
              ) : null}

              <View style={modalStyles.buttonsRow}>
                {isLoggedIn && joinedEvents[selectedEvent?.id] ? (
                  <TouchableOpacity
                    style={modalStyles.leaveBtn}
                    onPress={() => {
                      // user must be logged in to leave (redundant guard)
                      if (!isLoggedIn) {
                        Alert.alert('Login required', 'You must be logged in to leave an event')
                        return
                      }
                      leaveEvent()
                    }}
                  >
                    <Text style={modalStyles.leaveBtnText}>Leave</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[modalStyles.joinBtn, (!selectedEvent?.participants || selectedEvent.participants.current >= selectedEvent.participants.max || !isLoggedIn) && modalStyles.disabledButton]}
                    onPress={() => {
                      if (!isLoggedIn) {
                        Alert.alert('Login required', 'You must be logged in to join an event')
                        return
                      }
                      joinEvent()
                    }}
                    disabled={!selectedEvent?.participants || selectedEvent.participants.current >= selectedEvent.participants.max || !isLoggedIn}
                  >
                    <Text style={modalStyles.joinBtnText}>Join</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={modalStyles.closeBtn} onPress={closeEvent}>
                  <Text style={modalStyles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
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