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
  where,
  serverTimestamp
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
  try {
    const maybeAuth = typeof getAuthApp === 'function' ? getAuthApp() : getAuthApp
    // if firebaseConfig exports app, try to get auth from it
    const user = maybeAuth?.currentUser || (maybeAuth && maybeAuth.auth && maybeAuth.auth().currentUser) || null
    const emailKey = user ? String(user.email).toLowerCase().replace(/[^a-z0-9]/g, '_') : null
    console.log('getCurrentUserEmail ->', emailKey)
    return emailKey
  } catch (e) {
    console.warn('getCurrentUserEmail error', e)
    return null
  }
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

// ✅ Fixed version of joinEvent
export const joinEvent = async (eventId) => {
  const userEmail = getCurrentUserEmail();
  console.log('Join event attempt:', { eventId, userEmail });

  if (!userEmail) {
    console.error('User not authenticated');
    throw new Error('User not authenticated');
  }

  try {
    await runTransaction(db, async (transaction) => {
      const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
      const userDocRef = doc(db, USERS_COLLECTION, userEmail);

      const [eventSnapshot, userSnapshot] = await Promise.all([
        transaction.get(eventDocRef),
        transaction.get(userDocRef)
      ]);

      if (!eventSnapshot.exists()) throw new Error('Event not found');

      const eventData = eventSnapshot.data() || {};
      // defensive defaults
      const participants = eventData.participants || { current: 0, max: Infinity };
      const current = Number(participants.current || 0);
      const max = Number(participants.max || Infinity);

      console.log('Event data:', eventData, 'participants:', participants);

      if (current >= max) throw new Error('Event is full');

      const userData = userSnapshot.exists() ? userSnapshot.data() : {};

      // writes after all reads
      transaction.update(eventDocRef, {
        participants: {
          ...participants,
          current: current + 1
        }
      });

      const updatedJoinedEvents = {
        ...(userData.joinedEvents || {}),
        [eventId]: true
      };

      transaction.set(
        userDocRef,
        { ...userData, joinedEvents: updatedJoinedEvents },
        { merge: true }
      );

      console.log('Transaction prepared successfully');
    });

    console.log('Join event successful');
  } catch (error) {
    console.error('Error joining event:', error);
    throw error;
  }
};

// ✅ Fixed version of leaveEvent
export const leaveEvent = async (eventId) => {
  const userEmail = getCurrentUserEmail();
  if (!userEmail) throw new Error('User not authenticated');

  try {
    await runTransaction(db, async (transaction) => {
      // All reads first
      const eventDocRef = doc(db, EVENTS_COLLECTION, eventId);
      const userDocRef = doc(db, USERS_COLLECTION, userEmail);

      const [eventSnapshot, userSnapshot] = await Promise.all([
        transaction.get(eventDocRef),
        transaction.get(userDocRef)
      ]);

      if (!eventSnapshot.exists()) throw new Error('Event not found');

      const eventData = eventSnapshot.data();
      const userData = userSnapshot.exists() ? userSnapshot.data() : {};

      // ✅ Writes after reads
      if (eventData.participants.current > 0) {
        transaction.update(eventDocRef, {
          participants: {
            ...eventData.participants,
            current: eventData.participants.current - 1
          }
        });
      }

      const updatedJoinedEvents = { ...(userData.joinedEvents || {}) };
      delete updatedJoinedEvents[eventId];

      transaction.set(
        userDocRef,
        { ...userData, joinedEvents: updatedJoinedEvents },
        { merge: true }
      );
    });

    console.log('Leave event successful');
  } catch (error) {
    console.error('Error leaving event:', error);
    throw error;
  }
};

// Replace joinEventTransaction (keep single joined-events model: users/{userId}.joinedEvents map)
export async function joinEventTransaction(eventId, userIdOrEmail) {
  const eventRef = doc(db, EVENTS_COLLECTION, eventId);
  const userDocRef = doc(db, USERS_COLLECTION, String(userIdOrEmail));

  try {
    await runTransaction(db, async (transaction) => {
      // 1) Read all required docs first
      const [eventSnap, userSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(userDocRef)
      ]);

      if (!eventSnap.exists()) throw new Error('Event not found');
      const eventData = eventSnap.data();
      const userData = userSnap.exists() ? userSnap.data() : {};

      // check capacity / already joined
      const current = Number(eventData.participants?.current || 0);
      const max = (eventData.participants?.max) || Infinity;
      if (current >= max) throw new Error('Event full');
      if ((userData.joinedEvents || {})[eventId]) throw new Error('Already joined');

      // 2) Then do writes (no reads after this)
      transaction.update(eventRef, {
        participants: {
          ...eventData.participants,
          current: current + 1
        }
      });

      const updatedJoined = { ...(userData.joinedEvents || {}), [eventId]: true };
      transaction.set(userDocRef, { ...userData, joinedEvents: updatedJoined }, { merge: true });
    });

    return { ok: true };
  } catch (err) {
    console.error('joinEventTransaction error', err);
    return { ok: false, error: err.message || err };
  }
}
