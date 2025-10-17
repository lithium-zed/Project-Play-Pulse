import React from 'react'
import { StyleSheet, View, Text, useColorScheme } from 'react-native'
import { Colors } from '../../components/Colors'

const EventCardLive = ({ title = 'Event Name', date = 'MM/DD/YYYY', tag = 'Tag' }) => {
	const colorScheme = useColorScheme()
	const theme = Colors[colorScheme] ?? Colors.dark

	return (
		<View style={[styles.card, { backgroundColor: theme.primary }]}> 
			<View style={[styles.status, { backgroundColor: theme.status?.open ?? '#56F000' }]} />

			<View style={styles.content}>
				<Text style={[styles.title, { color: theme.text }]}>{title}</Text>
				<Text style={[styles.date, { color: theme.text }]}>{date}</Text>
			</View>

			<View style={styles.tag}>
				<Text style={styles.tagText}>{tag}</Text>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		width: '100%',
		height: 80,
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: 10,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		overflow: 'hidden'
	},
	status: {
		width: 10,
		height: 10,
		borderRadius: 6,
		marginRight: 12
	},
	content: {
		flex: 1,
		justifyContent: 'center'
	},
	title: {
		fontSize: 16,
		fontWeight: '700'
	},
	date: {
		fontSize: 12,
		marginTop: 4
	},
	tag: {
		backgroundColor: '#d9d9d9',
		borderRadius: 12,
		paddingHorizontal: 8,
		height: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	tagText: {
		fontSize: 12,
		color: '#1e1e1e'
	}
})

export default EventCardLive
