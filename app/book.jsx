
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
import { Colors } from '../components/Colors'
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context'
import { getAuthApp } from '../firebase/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import DateTimePicker from '@react-native-community/datetimepicker'
import { saveEvent } from '../firebase/databaseUtils'

const CATEGORIES = ['Yu-Gi-Oh', 'Magic the Gathering', 'BeybladeX', 'DnD', 'PokemonTCG', 'Misc']

function generateInvitationCode(len = 6) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
    let out = ''
    for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length))
    return out
}

function daysInMonth(year, month) {
    // month: 1-12
    return new Date(year, month, 0).getDate()
}

function countWords(s = '') {
    return s.trim().length === 0 ? 0 : s.trim().split(/\s+/).filter(Boolean).length
}

function formatDateFromDate(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${mm}/${dd}/${yyyy}`
}

function formatTimeFromDate(d) {
    const h = d.getHours()
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = h >= 12 ? 'PM' : 'AM'
    let hour12 = h % 12
    if (hour12 === 0) hour12 = 12
    return `${String(hour12).padStart(2, '0')}:${m} ${ampm}`
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

    // selected datetime (single Date object)
    const [date, setDate] = useState(now)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const [dateError, setDateError] = useState('')

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

        // validate date/time inputs
        if (!validateDateTime()) return

        setSubmitting(true)
        try {
            const newEvent = {
                title: title.trim(),
                description: description.trim(),
                date: formatDateFromDate(date),
                time: formatTimeFromDate(date),
                category,
                participants: { current: 0, max: Number(participants) },
                access: isPrivate ? 'private' : 'public',
                inviteCode: isPrivate ? inviteCode : null,
                host: name || user.displayName || user.email || 'Unknown',
                tag: category.toUpperCase(),
            }

            await saveEvent(newEvent)

            Alert.alert('Saved', 'Event created successfully.')
            router.push('/')
        } catch (e) {
            console.warn('Failed saving event', e)
            Alert.alert('Error', 'Failed to save event. Try again.')
        } finally {
            setSubmitting(false)
        }
    }

    function validateDateTime() {
        setDateError('')
        if (!date || !(date instanceof Date)) {
            setDateError('Please select a valid date and time')
            return false
        }
        if (date.getTime() < new Date().getTime()) {
            setDateError('Event must be in the future')
            return false
        }

        // enforce store opening hours for the selected day
        const { openMinutes, closeMinutes, label } = getStoreHoursForDate(date)
        const minutes = date.getHours() * 60 + date.getMinutes()
        if (minutes < openMinutes || minutes >= closeMinutes) {
            const openH = Math.floor(openMinutes / 60)
            const openM = String(openMinutes % 60).padStart(2, '0')
            const closeH = Math.floor((closeMinutes % 1440) / 60)
            const closeM = String(closeMinutes % 60).padStart(2, '0')
            const openStr = formatTimeFromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), openH, openM))
            const closeStr = closeMinutes === 1440 ? '12:00 AM' : formatTimeFromDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), closeH, closeM))
            setDateError(`Store hours on ${label}: ${openStr} – ${closeStr}`)
            return false
        }
        return true
    }

    // returns store open/close in minutes since midnight and a weekday label
    function getStoreHoursForDate(d) {
        // weekday: 0 = Sunday, 6 = Saturday
        const weekday = d.getDay()
        // schedule mapping in minutes since midnight
        // Sunday-Thursday: 12:00 (720) - 20:00 (1200)
        // Friday-Saturday: 12:00 (720) - 24:00 (1440)
        const schedule = {
            0: { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Sunday' },
            1: { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Monday' },
            2: { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Tuesday' },
            3: { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Wednesday' },
            4: { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Thursday' },
            5: { openMinutes: 12 * 60, closeMinutes: 24 * 60, label: 'Friday' },
            6: { openMinutes: 12 * 60, closeMinutes: 24 * 60, label: 'Saturday' },
        }
        return schedule[weekday] || { openMinutes: 12 * 60, closeMinutes: 20 * 60, label: 'Day' }
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
                            <Pressable onPress={() => setShowDatePicker(true)} style={[styles.picker, { backgroundColor: theme.primary + '11' }]}> 
                                <Text style={{ color: theme.text }}>{formatDateFromDate(date)}</Text>
                            </Pressable>
                            {dateError ? <Text style={styles.dateError}>{dateError}</Text> : null}
                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(e, selected) => {
                                        setShowDatePicker(Platform.OS === 'ios')
                                        if (selected) {
                                            const newDate = new Date(date)
                                            newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate())
                                            // clamp time to store hours for the selected day
                                            const { openMinutes, closeMinutes } = getStoreHoursForDate(newDate)
                                            const curMinutes = newDate.getHours() * 60 + newDate.getMinutes()
                                            if (curMinutes < openMinutes) {
                                                newDate.setHours(Math.floor(openMinutes / 60), openMinutes % 60)
                                            } else if (curMinutes >= closeMinutes) {
                                                const m = Math.max(openMinutes, closeMinutes - 1)
                                                newDate.setHours(Math.floor(m / 60), m % 60)
                                            }
                                            setDate(newDate)
                                        }
                                    }}
                                    minimumDate={new Date()}
                                />
                            )}
                        </View>

                        <View style={[styles.smallField, { borderColor: theme.primary }]}> 
                            <Text style={[styles.label, { color: theme.text }]}>Time</Text>
                            <Pressable onPress={() => {
                                const newDate = new Date(date)
                                const { openMinutes, closeMinutes } = getStoreHoursForDate(newDate)
                                const curMinutes = newDate.getHours() * 60 + newDate.getMinutes()
                                if (curMinutes < openMinutes) {
                                    newDate.setHours(Math.floor(openMinutes / 60), openMinutes % 60)
                                } else if (curMinutes >= closeMinutes) {
                                    const m = Math.max(openMinutes, closeMinutes - 1)
                                    newDate.setHours(Math.floor(m / 60), m % 60)
                                }
                                setDate(newDate)
                                setDateError('')
                                setShowTimePicker(true)
                            }} style={[styles.picker, { backgroundColor: theme.primary + '11' }]}> 
                                <Text style={{ color: theme.text }}>{formatTimeFromDate(date)}</Text>
                            </Pressable>
                            {showTimePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="time"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(e, selected) => {
                                        setShowTimePicker(Platform.OS === 'ios')
                                        if (selected) {
                                            const newDate = new Date(date)
                                            newDate.setHours(selected.getHours(), selected.getMinutes())
                                            // enforce store hours for this date
                                            const { openMinutes, closeMinutes } = getStoreHoursForDate(newDate)
                                            const selMinutes = newDate.getHours() * 60 + newDate.getMinutes()
                                            if (selMinutes < openMinutes) {
                                                newDate.setHours(Math.floor(openMinutes / 60), openMinutes % 60)
                                                setDateError('Selected time is before store opening; adjusted to opening time')
                                            } else if (selMinutes >= closeMinutes) {
                                                const m = Math.max(openMinutes, closeMinutes - 1)
                                                newDate.setHours(Math.floor(m / 60), m % 60)
                                                setDateError('Selected time is after store closing; adjusted to last available time')
                                            } else {
                                                setDateError('')
                                            }
                                            setDate(newDate)
                                        }
                                    }}
                                    minuteInterval={1}
                                />
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
        smallInput: { paddingVertical: 8, paddingHorizontal: 6, fontSize: 16, minWidth: 56, textAlign: 'center', borderWidth: 1, borderRadius: 6, marginHorizontal: 4 },
        ampmButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, minWidth: 56, alignItems: 'center', justifyContent: 'center' },
        dateError: { color: 'red', marginTop: 6, fontSize: 12 },
})
