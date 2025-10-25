import { database, getAuthApp } from './firebaseConfig';
import { ref, push, set, onValue, off, get } from 'firebase/database';

const EVENTS_REF = 'events';
const JOINED_EVENTS_REF = 'joinedEvents';

// Initialize seed events if database is empty (removed default events)
export const initializeSeedEvents = async () => {
  try {
    const eventsRef = ref(database, EVENTS_REF);
    const snapshot = await get(eventsRef);
    if (!snapshot.exists()) {
      console.log('Database initialized - no seed events added');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Save a new event to Firebase
export const saveEvent = async (eventData) => {
  try {
    // Sanitize title to create a valid Firebase key
    const sanitizedTitle = eventData.title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const eventsRef = ref(database, EVENTS_REF);
    const newEventRef = ref(database, `${EVENTS_REF}/${sanitizedTitle}`);
    await set(newEventRef, {
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
  const eventsRef = ref(database, EVENTS_REF);
  const unsubscribe = onValue(eventsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const eventsArray = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      }));
      callback(eventsArray);
    } else {
      callback([]);
    }
  });
  return unsubscribe;
};

// Update an existing event (for joining/leaving)
export const updateEvent = async (eventId, updates) => {
  try {
    const eventRef = ref(database, `${EVENTS_REF}/${eventId}`);
    await set(eventRef, updates);
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

  const joinedRef = ref(database, `${JOINED_EVENTS_REF}/${userEmail}`);
  const unsubscribe = onValue(joinedRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert to readable format with event titles
      const readableJoined = {};
      Object.keys(data).forEach(eventId => {
        readableJoined[eventId] = data[eventId];
      });
      callback(readableJoined);
    } else {
      callback({});
    }
  });
  return unsubscribe;
};

// Join an event for current user
export const joinEvent = async (eventId) => {
  const userEmail = getCurrentUserEmail();
  if (!userEmail) throw new Error('User not authenticated');

  try {
    // Get current event data
    const eventRef = ref(database, `${EVENTS_REF}/${eventId}`);
    const eventSnapshot = await get(eventRef);
    if (!eventSnapshot.exists()) throw new Error('Event not found');

    const eventData = eventSnapshot.val();
    if (eventData.participants.current >= eventData.participants.max) {
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
    await set(eventRef, updatedEvent);

    // Add to joined events
    const joinedRef = ref(database, `${JOINED_EVENTS_REF}/${userEmail}/${eventId}`);
    await set(joinedRef, true);
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
    // Get current event data
    const eventRef = ref(database, `${EVENTS_REF}/${eventId}`);
    const eventSnapshot = await get(eventRef);
    if (!eventSnapshot.exists()) throw new Error('Event not found');

    const eventData = eventSnapshot.val();
    if (eventData.participants.current > 0) {
      // Update participants count
      const updatedEvent = {
        ...eventData,
        participants: {
          ...eventData.participants,
          current: eventData.participants.current - 1
        }
      };
      await set(eventRef, updatedEvent);
    }

    // Remove from joined events
    const joinedRef = ref(database, `${JOINED_EVENTS_REF}/${userEmail}/${eventId}`);
    await set(joinedRef, null); // Remove the key
  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};
