import { StyleSheet, Text, View, useColorScheme} from 'react-native'
import React from 'react'
import {Link} from 'expo-router'
import { Colors } from "../components/Colors"
import ThemedView from './components/ThemedView'
import ThemedText from './components/ThemedText'
import Separator from './components/Separator'
import Separator2 from './components/Separator2'
import EventCardLive from './components/EventCardLive'
import { SectionList } from 'react-native'


const Home = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.dark

  // Sample event data (title, date as MM/DD/YYYY, tag)
  const events = [
    { title: 'Live Concert', date: '10/17/2025', tag: 'Music' },
    { title: 'Live Concert', date: '10/17/2025', tag: 'Music' },
    { title: 'Art Expo', date: '10/18/2025', tag: 'Art' },
    { title: 'Tech Talk', date: '10/16/2025', tag: 'Tech' },
    { title: 'Book Club', date: '10/20/2025', tag: 'Books' }
  ]

  const today = new Date()

  const parseDate = (mmddyyyy) => {
    const [m, d, y] = mmddyyyy.split('/').map(Number)
    return new Date(y, m - 1, d)
  }

  const isSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const live = events.filter(e => isSameDay(parseDate(e.date), today))
  const upcoming = events.filter(e => parseDate(e.date) > today)

  // sort events by date ascending
  const sortByDate = (a, b) => parseDate(a.date) - parseDate(b.date)
  live.sort(sortByDate)
  upcoming.sort(sortByDate)

  const sections = [
    { title: 'Live Events', data: live },
    { title: 'Upcoming', data: upcoming }
  ]

  return (
    <ThemedView style = {[styles.container, { paddingTop: 0 }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.title + index}
        renderItem={({ item }) => <EventCardLive title={item.title} date={item.date} tag={item.tag} />}
        renderSectionHeader={({ section: { title } }) => (
          title === 'Live Events' ? <Separator label={title} /> : <Separator2 label={title} />
        )}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={true}
        stickySectionHeadersEnabled={true}
      />

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