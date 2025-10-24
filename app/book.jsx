import React, { useEffect, useState } from 'react'
import {
    StyleSheet,
    Text,
    View,
    useColorScheme,
    TextInput,
    Pressable,
    Switch,
    Alert,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { Link, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors } from '../components/Colors'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { getAuthApp } from '../firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'

const CATEGORIES = ['Yu-Gi-Oh', 'Magic the Gathering', 'BeybladeX', 'DnD', 'PokemonTCG', 'Misc']

function generateInvitationCode(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
    return out
}

function daysInMonth(year, monthIndex) {
    return new Date(year, monthIndex + 1, 0).getDate()
}

function countWords(s = '') {
    return s.trim().length === 0 ? 0 : s.trim().split(/\s+/).filter(Boolean).length
}

function formatDateFromParts(monthIdx, day, year) {
    const mm = String(monthIdx + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${mm}/${dd}/${year}`
}

function formatTimeFromParts(hour12, minute, ampm) {
    const hh = String(hour12).padStart(2, '0')
    const mm = String(minute).padStart(2, '0')
    return `${hh}:${mm} ${ampm}`
}

const BookEvent = () => {
    const colorScheme = useColorScheme()
    const theme = Colors[colorScheme] ?? Colors.dark
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const now = new Date()

    const [user, setUser] = useState(null)
    const [name, setName] = useState('')
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    // Date parts
    const [month, setMonth] = useState(now.getMonth()) // 0-11
    const [day, setDay] = useState(now.getDate())
    const [year, setYear] = useState(now.getFullYear())
    const [showMonthList, setShowMonthList] = useState(false)
    const [showDayList, setShowDayList] = useState(false)
    const [showYearList, setShowYearList] = useState(false)

    // Time parts (12-hour)
    const [hour, setHour] = useState(((now.getHours() + 11) % 12) + 1) // 1-12
    const [minute, setMinute] = useState(String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0'))
    const [ampm, setAmpm] = useState(now.getHours() >= 12 ? 'PM' : 'AM')
    const [showHourList, setShowHourList] = useState(false)
    const [showMinuteList, setShowMinuteList] = useState(false)
    const [showAmpmList, setShowAmpmList] = useState(false)

    const [category, setCategory] = useState(CATEGORIES[0])
    const [showCategoryList, setShowCategoryList] = useState(false)
    const [participants, setParticipants] = useState('1')
    const [isPrivate, setIsPrivate] = useState(false)
    const [inviteCode, setInviteCode] = useState(null)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        const auth = getAuthApp
        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u)
                setName(u.displayName || u.email || '')
            } else {
                setUser(null)
                setName('')
            }
        })
        return () => unsub()
    }, [])

    useEffect(() => {
        if (isPrivate && !inviteCode) setInviteCode(generateInvitationCode())
        if (!isPrivate) setInviteCode(null)
    }, [isPrivate])

    const onDescriptionChange = (txt) => {
        const words = txt.trim().split(/\s+/).filter(Boolean)
        if (words.length <= 100) setDescription(txt)
        else setDescription(words.slice(0, 100).join(' '))
    }

    const onSubmit = async () => {
        if (!user) {
            Alert.alert('Not logged in', 'You must be logged in to create an event.')
            return
        }
        if (!title.trim()) {
            Alert.alert('Validation', 'Please enter an event title.')
            return
        }
        if (Number(participants) < 1 || Number(participants) > 10) {
            Alert.alert('Validation', 'Participants must be between 1 and 10.')
            return
        }

        setSubmitting(true)
        try {
            const newEvent = {
                id: Date.now().toString(),
                title: title.trim(),
                description: description.trim(),
                date: formatDateFromParts(month, day, year),
                time: formatTimeFromParts(hour, minute, ampm),
                category,
                participants: Number(participants),
                status: isPrivate ? 'private' : 'open',
                invitationCode: isPrivate ? inviteCode : null,
                hostName: name || user.displayName || user.email || 'Unknown',
                createdAt: new Date().toISOString(),
            }

            const stored = await AsyncStorage.getItem('events')
            const arr = stored ? JSON.parse(stored) : []
            arr.unshift(newEvent)
            await AsyncStorage.setItem('events', JSON.stringify(arr))

            Alert.alert('Saved', 'Event created successfully.')
            router.push('/')
        } catch (e) {
            console.warn('Failed saving event', e)
            Alert.alert('Error', 'Failed to save event. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
            <KeyboardAvoidingView
                style={[styles.container]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <Text style={[styles.title, { color: theme.text }]}>Book Event</Text>

                    {!user ? (
                        <View style={[styles.notice, { backgroundColor: theme.primary + '11' }]}>
                            <Text style={[styles.noticeText, { color: theme.text }]}>You must be logged in to create an event.</Text>
                            <Link href="/login" style={{ marginTop: 8 }}>
                                <Text style={{ color: theme.accent }}>Go to Login</Text>
                            </Link>
                        </View>
                    ) : (
                        <Text style={[styles.hostLine, { color: theme.text }]}>Host: {name || 'Unknown'}</Text>
                    )}

                    <View style={[styles.field, { borderColor: theme.primary }]}> 
                        <Text style={[styles.label, { color: theme.text }]}>Event name</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Event title"
                            placeholderTextColor={theme.text + '88'}
                            style={[styles.input, { color: theme.text }]}
                        />
                    </View>

                    <View style={[styles.field, { borderColor: theme.primary }]}> 
                        <Text style={[styles.label, { color: theme.text }]}>Description (max 100 words)</Text>
                        <TextInput
                            value={description}
                            onChangeText={onDescriptionChange}
                            placeholder="Describe the event"
                            placeholderTextColor={theme.text + '88'}
                            style={[styles.textarea, { color: theme.text }]}
                            multiline
                            numberOfLines={4}
                        />
                        <Text style={[styles.wordCount, { color: theme.text }]}>{countWords(description)} / 100 words</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.smallField, { borderColor: theme.primary }]}> 
                            <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Pressable onPress={() => setShowMonthList(!showMonthList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{String(month + 1).padStart(2, '0')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setShowDayList(!showDayList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{String(day).padStart(2, '0')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setShowYearList(!showYearList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{year}</Text>
                                </Pressable>
                            </View>
                            {showMonthList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <Pressable key={i} onPress={() => { setMonth(i); setShowMonthList(false) }} style={styles.dropdownItem}>
                                            <Text style={{ color: theme.text }}>{String(i + 1).padStart(2, '0')}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                            {showDayList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {Array.from({ length: daysInMonth(year, month) }).map((_, i) => (
                                        <Pressable key={i} onPress={() => { setDay(i + 1); setShowDayList(false) }} style={styles.dropdownItem}>
                                            <Text style={{ color: theme.text }}>{String(i + 1).padStart(2, '0')}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                            {showYearList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {Array.from({ length: 3 }).map((_, i) => {
                                        const y = now.getFullYear() + i
                                        return (
                                            <Pressable key={y} onPress={() => { setYear(y); setShowYearList(false) }} style={styles.dropdownItem}>
                                                <Text style={{ color: theme.text }}>{y}</Text>
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            )}
                        </View>

                        <View style={[styles.smallField, { borderColor: theme.primary }]}> 
                            <Text style={[styles.label, { color: theme.text }]}>Time</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Pressable onPress={() => setShowHourList(!showHourList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{String(hour).padStart(2, '0')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setShowMinuteList(!showMinuteList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{String(minute).padStart(2, '0')}</Text>
                                </Pressable>
                                <Pressable onPress={() => setShowAmpmList(!showAmpmList)} style={[styles.pickerInline, { padding: 8 }]}> 
                                    <Text style={{ color: theme.text }}>{ampm}</Text>
                                </Pressable>
                            </View>
                            {showHourList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <Pressable key={i} onPress={() => { setHour(i + 1); setShowHourList(false) }} style={styles.dropdownItem}>
                                            <Text style={{ color: theme.text }}>{String(i + 1).padStart(2, '0')}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                            {showMinuteList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {Array.from({ length: 12 }).map((_, i) => {
                                        const m = String(i * 5).padStart(2, '0')
                                        return (
                                            <Pressable key={m} onPress={() => { setMinute(m); setShowMinuteList(false) }} style={styles.dropdownItem}>
                                                <Text style={{ color: theme.text }}>{m}</Text>
                                            </Pressable>
                                        )
                                    })}
                                </View>
                            )}
                            {showAmpmList && (
                                <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                    {['AM', 'PM'].map(a => (
                                        <Pressable key={a} onPress={() => { setAmpm(a); setShowAmpmList(false) }} style={styles.dropdownItem}>
                                            <Text style={{ color: theme.text }}>{a}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    <View style={[styles.field, { borderColor: theme.primary }]}> 
                        <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                        <Pressable onPress={() => setShowCategoryList(!showCategoryList)} style={[styles.picker, { backgroundColor: theme.primary + '11' }]}> 
                            <Text style={{ color: theme.text }}>{category}</Text>
                        </Pressable>
                        {showCategoryList && (
                            <View style={[styles.dropdown, { backgroundColor: theme.background, borderColor: theme.primary }]}> 
                                {CATEGORIES.map((c) => (
                                    <Pressable key={c} onPress={() => { setCategory(c); setShowCategoryList(false) }} style={styles.dropdownItem}>
                                        <Text style={{ color: theme.text }}>{c}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        )}
                    </View>

                            <View style={[styles.field, { borderColor: theme.primary }]}> 
                                <Text style={[styles.label, { color: theme.text }]}>Participants (max 10)</Text>
                                <View style={styles.participantRow}>
                                    <Pressable
                                        onPress={() => {
                                            const cur = Number(participants) || 1
                                            const next = Math.max(1, cur - 1)
                                            setParticipants(String(next))
                                        }}
                                        style={({ pressed }) => [styles.partButton, { backgroundColor: pressed ? theme.primary + '22' : 'transparent' }]}
                                    >
                                        <Text style={[styles.partButtonText, { color: theme.text }]}>-</Text>
                                    </Pressable>

                                    <View style={styles.partValueWrap}>
                                        <Text style={[styles.partValue, { color: theme.text }]}>{String(participants)}</Text>
                                        <Text style={[styles.partMax, { color: theme.text + '66' }]}>/10</Text>
                                    </View>

                                    <Pressable
                                        onPress={() => {
                                            const cur = Number(participants) || 1
                                            const next = Math.min(10, cur + 1)
                                            setParticipants(String(next))
                                        }}
                                        style={({ pressed }) => [styles.partButton, { backgroundColor: pressed ? theme.primary + '22' : 'transparent' }]}
                                    >
                                        <Text style={[styles.partButtonText, { color: theme.text }]}>+</Text>
                                    </Pressable>
                                </View>
                            </View>

                    <View style={[styles.field, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}> 
                        <View>
                            <Text style={[styles.label, { color: theme.text }]}>Private event</Text>
                            <Text style={{ color: theme.text + '88', fontSize: 12 }}>Toggle to make event private and generate an invitation code.</Text>
                        </View>
                        <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: theme.accent }} />
                    </View>

                    {isPrivate && (
                        <View style={[styles.field, { borderColor: theme.primary }]}> 
                            <Text style={[styles.label, { color: theme.text }]}>Invitation code</Text>
                            <Text style={[styles.input, { color: theme.text }]}>{inviteCode}</Text>
                        </View>
                    )}

                    <Pressable
                        onPress={onSubmit}
                        disabled={!user || submitting}
                        style={({ pressed }) => [
                            styles.button,
                            { backgroundColor: user ? theme.accent : theme.primary + '66', opacity: pressed ? 0.8 : 1 },
                        ]}
                    >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>{submitting ? 'Saving...' : 'Create Event'}</Text>
                    </Pressable>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    )
}

export default BookEvent

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontWeight: 'bold', fontSize: 24, marginBottom: 12 },
    hostLine: { fontSize: 14, marginBottom: 12 },
    notice: { padding: 12, borderRadius: 8, marginBottom: 12 },
    noticeText: { fontSize: 14 },
    field: { marginBottom: 12, padding: 8, borderRadius: 8, borderWidth: 1 },
    smallField: { flex: 1, marginBottom: 12, padding: 8, borderRadius: 8, borderWidth: 1, marginRight: 8 },
    label: { fontSize: 12, marginBottom: 6 },
    input: { paddingVertical: 8, paddingHorizontal: 6, fontSize: 16 },
    textarea: { paddingVertical: 8, paddingHorizontal: 6, fontSize: 16, minHeight: 80, textAlignVertical: 'top' },
    wordCount: { fontSize: 12, marginTop: 6, textAlign: 'right' },
    row: { flexDirection: 'row' },
    picker: { padding: 10, borderRadius: 6 },
    pickerInline: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginHorizontal: 4, backgroundColor: 'transparent' },
    dropdown: { marginTop: 8, borderWidth: 1, borderRadius: 6, overflow: 'hidden' },
    dropdownItem: { padding: 10 },
    button: { marginTop: 8, padding: 14, borderRadius: 8, alignItems: 'center' },
    participantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    partButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    partButtonText: { fontSize: 18, fontWeight: '600' },
    partValueWrap: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 8 },
    partValue: { fontSize: 16, minWidth: 28, textAlign: 'center' },
    partMax: { fontSize: 12, marginLeft: 6 },
})