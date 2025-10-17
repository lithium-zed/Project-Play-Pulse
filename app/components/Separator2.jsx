import React from 'react'
import {StyleSheet, View, Text} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

const Separator2 = ({ top = false, height = 56 }) => {
	// top: when true, render the separator as a SafeArea-aware overlay fixed to the top
	const safeEdges = top ? ["top"] : []
	const containerStyle = top ? [styles.separatorOverlay, { height }] : styles.separator

	return (
		<SafeAreaView edges={safeEdges} style={containerStyle}>
			<View style={[styles.view, top && { height }]}>
				<View style={[styles.child, styles.itemBorder]} />
				<Text style={styles.liveEvents}>Upcoming</Text>
				<View style={[styles.item, styles.itemBorder]} />
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
		separator: {
			// no flex so separator doesn't expand
			height: 56
		},
		separatorOverlay: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			zIndex: 50,
			backgroundColor: 'transparent'
		},
  	itemBorder: {
    		borderTopWidth: 1,
    		borderColor: "#dbe1f1",
    		borderStyle: "solid",
    		height: 1
  	},
		view: {
			width: "100%",
			flexDirection: "row",
			alignItems: "center",
			justifyContent: "center",
			height: 56
		},
  	child: {
    		width: 40
  	},
  	liveEvents: {
    		height: 28,
    		width: 114,
    		fontSize: 20,
    		lineHeight: 28,
    		fontWeight: "700",
    		fontFamily: "Inter-Bold",
    		color: "#dbe1f1",
    		textAlign: "left"
  	},
  	item: {
    		width: 185
  	}
});

export default Separator2
