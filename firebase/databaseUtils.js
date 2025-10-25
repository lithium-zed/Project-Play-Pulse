import { db, getAuthApp } from './firebaseConfig';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  getDocs,
  runTransaction,
  query,
  where
} from 'firebase/firestore';

const EVENTS_COLLECTION = 'events';
const USERS_COLLECTION = 'users';

// Initialize seed events if database is empty (removed default events)
export const initializeSeedEvents = async () => {
  try {
    const eventsQuery = query(collection(db, EVENTS_COLLECTION));
    const snapshot = await getDocs(eventsQuery);
    if (snapshot.empty) {
      console.log('Database initialized - no seed events added');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Save a new event to Firestore
export const saveEvent = async (eventData) => {
  try {
    // Sanitize title to create a valid Firestore document ID
    const sanitizedTitle = eventData.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const eventDocRef = doc(db, EVENTS_COLLECTION, sanitizedTitle);
    await setDoc(eventDocRef, {
      ...eventData,
      id: sanitizedTitle,
      createdAt: new Date().toISOString()
    });
    return sanitizedTitle;
  } catch (error) {
    console.error('Error saving event:', error);
    throw error;
  }
};

// Listen for real-time events updates
export const subscribeToEvents = (callback) => {
  const eventsCollection = collection(db, EVENTS_COLLECTION);
  const unsubscribe = onSnapshot(eventsCollection, (snapshot) => {
    const eventsArray = snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    }));
    callback(eventsArray);
  });
  return unsubscribe;
};

// Update an existing event (for joining/leaving)
export const updateEvent = async (eventId, updates) => {
  try {
    const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
    await updateDoc(eventDocRef, updates);
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

// Get current user email for readable keys
const getCurrentUserEmail = () => {
  const auth = getAuthApp;
  const user = auth.currentUser;
  return user ? user.email.replace(/[^a-zA-Z0-9]/g, '_') : null;
};

// Listen for real-time joined events updates for current user
export const subscribeToJoinedEvents = (callback) => {
  const userEmail = getCurrentUserEmail();
  if (!userEmail) {
    callback({});
    return () => {}; // Return empty unsubscribe function
  }

  const userDocRef = doc(db, USERS_COLLECTION, userEmail);
  const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
    const userData = docSnapshot.data();
    const joinedEvents = userData?.joinedEvents || {};
    callback(joinedEvents);
  });
  return unsubscribe;
};

// Join an event for current user
export const joinEvent = async (eventId) => {
  const userEmail = getCurrentUserEmail();
  console.log('Join event attempt:', { eventId, userEmail });

  if (!userEmail) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  try {
    await runTransaction(db, async (transaction) => {
      // Get current event data
      const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventSnapshot = await transaction.get(eventDocRef);
      if (!eventSnapshot.exists()) {
        console.error('Event not found:', eventId);
        throw new Error('Event not found');
      }

      const eventData = eventSnapshot.data();
      console.log('Event data:', eventData);

      if (eventData.participants.current >= eventData.participants.max) {
        console.error('Event is full');
        throw new Error('Event is full');
      }

      // Update participants count
      const updatedEvent = {
        ...eventData,
        participants: {
          ...eventData.participants,
          current: eventData.participants.current + 1
        }
      };
      transaction.update(eventDocRef, updatedEvent);

      // Add to joined events
      const userDocRef = doc(db, USERS_COLLECTION, userEmail);
      const userSnapshot = await transaction.get(userDocRef);
      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      const updatedJoinedEvents = { ...userData.joinedEvents, [eventId]: true };
      transaction.set(userDocRef, { ...userData, joinedEvents: updatedJoinedEvents }, { merge: true });

      console.log('Transaction prepared successfully');
    });
    console.log('Join event successful');
  } catch (error) {
    console.error('Error joining event:', error);
    throw error;
  }
};

// Leave an event for current user
export const leaveEvent = async (eventId) => {
  const userEmail = getCurrentUserEmail();
  if (!userEmail) throw new Error('User not authenticated');

  try {
    await runTransaction(db, async (transaction) => {
      // Get current event data
      const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
      const eventSnapshot = await transaction.get(eventDocRef);
      if (!eventSnapshot.exists()) throw new Error('Event not found');

      const eventData = eventSnapshot.data();
      if (eventData.participants.current > 0) {
        // Update participants count
        const updatedEvent = {
          ...eventData,
          participants: {
            ...eventData.participants,
            current: eventData.participants.current - 1
          }
        };
        transaction.update(eventDocRef, updatedEvent);
      }

      // Remove from joined events
      const userDocRef = doc(db, USERS_COLLECTION, userEmail);
      const userSnapshot = await transaction.get(userDocRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const updatedJoinedEvents = { ...userData.joinedEvents };
        delete updatedJoinedEvents[eventId];
        transaction.update(userDocRef, { joinedEvents: updatedJoinedEvents });
      }
    });
  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};
