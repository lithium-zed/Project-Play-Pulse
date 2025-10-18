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
  SectionList 
} from 'react-native'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from "../components/Colors"
import ThemedView from './components/ThemedView'
import Separator from './components/Separator'
import Separator2 from './components/Separator2'
import EventCardLive from './components/EventCardLive'

const Home = () => {
  // Hooks
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark
  const insets = useSafeAreaInsets()

  // State
  const [events, setEvents] = useState([
    { 
      id: '1', 
      title: 'Live Concert', 
      date: '10/17/2025', 
      host: 'John Smith',
      tag: 'MUSIC',
      access: 'public',
      participants: { current: 0, max: 10 }
    },
    { 
      id: '2', 
      title: 'Live Concert', 
      date: '10/17/2025', 
      host: 'Sarah Wilson',
      tag: 'MUSIC',
      access: 'public',
      participants: { current: 0, max: 10 }
    },
    { 
      id: '3', 
      title: 'Art Expo', 
      date: '10/18/2025',
      participants: { current: 5, max: 15 }, 
      description: 'An immersive art exhibition featuring local artists.',
      host: 'Maria Garcia',
      tag: 'ART',
      access: 'public'
  
    },
    { 
      id: '4', 
      title: 'Tech Talk', 
      date: '10/16/2025', 
      host: 'Alex Chen',
      tag: 'TECH',
      access: 'private',
      participants: { current: 0, max: 10 }
    },
    { 
      id: '5', 
      title: 'Book Club', 
      date: '10/20/2025',
      participants: { current: 9, max: 10 }, // Changed from 3 to 9
      description: 'Join us for an engaging discussion.',
      host: 'Emma Williams',
      tag: 'BOOK',
      access: 'private'
     
    }
  ])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [joinedEvents, setJoinedEvents] = useState({})

  

  // Date helpers
  const today = new Date()
  
  const parseDate = (mmddyyyy) => {
    const [m, d, y] = mmddyyyy.split('/').map(Number)
    return new Date(y, m - 1, d)
  }

  const isSameDay = (a, b) => 
    a.getFullYear() === b.getFullYear() && 
    a.getMonth() === b.getMonth() && 
    a.getDate() === b.getDate()

  // Load joined events from AsyncStorage
  useEffect(() => {
    loadJoinedEvents()
  }, [])

  const loadJoinedEvents = async () => {
    try {
      const stored = await AsyncStorage.getItem('joinedEvents')
      if (stored) {
        setJoinedEvents(JSON.parse(stored))
      }
    } catch (error) {
      console.log('Error loading joined events:', error)
    }
  }

  const saveJoinedEvents = async (newJoinedEvents) => {
    try {
      await AsyncStorage.setItem('joinedEvents', JSON.stringify(newJoinedEvents))
      setJoinedEvents(newJoinedEvents)
    } catch (error) {
      console.log('Error saving joined events:', error)
    }
  }
const [isLoggedIn,setIsLoggedIn] = useState(false);
useEffect(() => {
  const checkLogin = async () => {
    try {
      // match the key used in your login screen (userToken)
      const userToken = await AsyncStorage.getItem('userToken');
      setIsLoggedIn(!!userToken);
    } catch (e) {
      console.error('Error checking login:', e);
      setIsLoggedIn(false);
    }
  }
  checkLogin();
}, [modalVisible])
  // Event handlers
  const openEvent = (event) => {
    setSelectedEvent(event)
    setModalVisible(true)
  }

  const closeEvent = () => {
    setModalVisible(false)
    setSelectedEvent(null)
  }

  const handleBackdropPress = (event) => {
    if (event.target === event.currentTarget) {
      closeEvent()
    }
  }

  const joinEvent = async () => {
    if (!selectedEvent?.participants) return
    
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

    // Save joined status
    await saveJoinedEvents({ ...joinedEvents, [selectedEvent.id]: true })

    const updatedEvent = updatedEvents.find(ev => ev.id === selectedEvent.id)
    setSelectedEvent(updatedEvent)
  }

  const leaveEvent = async () => {
    if (!selectedEvent?.participants) return
    
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

    // Remove joined status
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

  // Status color helper
  const getStatusColor = (ev) => {
    if (!ev) return '#34C759' // default green
    
    const eventDate = parseDate(ev.date)
    const now = new Date()
    
    // First check if event is full - this should take priority
    if (ev.participants && ev.participants.current >= ev.participants.max) {
      return '#FF3B30' // red for full events
    }
    
    // Then check if event is finished (past date)
    if (eventDate < now) {
      return '#8E8E93' // grey for finished events
    }
    
    // Then check if event is private
    if (ev.access === 'private') {
      return '#FFCC00' // yellow for private events
    }
    
    // Default: open to all
    return '#34C759' // green for open events
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

  // Data preparation
  const live = events.filter(e => isSameDay(parseDate(e.date), today))
  const upcoming = events.filter(e => parseDate(e.date) > today)
  
  live.sort((a, b) => parseDate(a.date) - parseDate(b.date))
  upcoming.sort((a, b) => parseDate(a.date) - parseDate(b.date))
  
  const sections = [
    { title: 'Live Events', data: live },
    { title: 'Upcoming', data: upcoming }
  ]

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
          // add a small internal top padding so headers aren't glued to the safe area
          contentContainerStyle={[styles.cardsContainer, { paddingTop: 8 }]}
          showsVerticalScrollIndicator={true}
          stickySectionHeadersEnabled={true}
        />

        {/* Event details modal */}
        <Modal 
          visible={modalVisible} 
          animationType="slide" 
          transparent={true} 
          onRequestClose={closeEvent}
        >
          <Pressable style={modalStyles.backdrop} onPress={handleBackdropPress}>
            <Pressable>
              <View style={modalStyles.modal}>
                <View style={modalStyles.header}>
                  <View 
                    style={[
                      modalStyles.statusDot, 
                      { backgroundColor: selectedEvent ? getStatusColor(selectedEvent) : '#34C759' }
                    ]} 
                  />
                  <Text style={modalStyles.title}>{selectedEvent?.title}</Text>
                </View>
                <Text style={modalStyles.meta}>{selectedEvent?.date} • {selectedEvent?.host}</Text>
                {selectedEvent?.description ? (
                  <Text style={modalStyles.desc}>{selectedEvent.description}</Text>
                ) : null}
                {selectedEvent?.participants ? (
                  <Text style={modalStyles.participants}>
                    Participants {selectedEvent.participants.current}/{selectedEvent.participants.max}
                  </Text>
                ) : null}
                
               <View style={modalStyles.buttonsRow}>
  {joinedEvents[selectedEvent?.id] ? (
    <TouchableOpacity 
      style={modalStyles.leaveBtn} 
      onPress={() => {
        if (!isLoggedIn) {
          Alert.alert('Login required', 'You must be logged in to leave an event');
          return;
        }
        leaveEvent();
      }}
    >
      <Text style={modalStyles.leaveBtnText}>Leave</Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity 
      style={[
        modalStyles.joinBtn,
        (!selectedEvent?.participants || 
         selectedEvent.participants.current >= selectedEvent.participants.max || 
         !isLoggedIn) && 
        modalStyles.disabledButton
      ]} 
      onPress={() => {
        if (!isLoggedIn) {
          Alert.alert('Login required', 'You must be logged in to join an event');
          return;
        }
        joinEvent();
      }}
      disabled={!selectedEvent?.participants || 
               selectedEvent.participants.current >= selectedEvent.participants.max || 
               !isLoggedIn}
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
    card : {
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
    height: 295,
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
  }
})