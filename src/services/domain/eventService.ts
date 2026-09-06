
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DanceEvent } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

export const fetchEvents = async (): Promise<DanceEvent[]> => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DanceEvent)));
};

export const addEvent = async (event: Omit<DanceEvent, 'id'>) => {
    await addDoc(collection(db, 'events'), event);
};

export const updateEvent = async (event: DanceEvent) => {
    const { id, ...data } = event;
    await updateDoc(doc(db, 'events', id), data);
};

export const deleteEvent = async (eventId: string) => {
    await softDeleteDoc('events', eventId);
};

export const restoreEvent = async (eventId: string) => {
    await restoreDoc('events', eventId);
};

export const permanentlyDeleteEvent = async (eventId: string) => {
    await permanentlyDeleteDoc('events', eventId);
};
