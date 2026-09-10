
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs, deleteField } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DanceEvent } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

export const fetchEvents = async (): Promise<DanceEvent[]> => {
    const q = query(collection(db, 'events'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DanceEvent)));
};

export const addEvent = async (event: Omit<DanceEvent, 'id'>) => {
    // capacity es opcional en el formulario (EventManagement.tsx la deja `undefined` si se borra
    // el campo) -- Firestore rechaza un `undefined` explícito, así que se omite del todo en vez
    // de escribirlo.
    const { capacity, ...rest } = event;
    const data = capacity !== undefined ? { ...rest, capacity } : rest;
    await addDoc(collection(db, 'events'), data);
};

export const updateEvent = async (event: DanceEvent) => {
    const { id, capacity, ...rest } = event;
    // Aquí sí puede hacer falta borrar el campo de verdad (deleteField), no solo omitirlo: si el
    // evento YA tenía capacity guardada y el admin la quita en el formulario, updateDoc con un
    // objeto que simplemente no incluya `capacity` dejaría el valor antiguo intacto en Firestore.
    const data: Record<string, unknown> = { ...rest };
    data.capacity = capacity !== undefined ? capacity : deleteField();
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
