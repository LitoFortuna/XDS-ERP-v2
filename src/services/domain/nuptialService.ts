
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, getDocs, Unsubscribe } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { NuptialDance } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

export const subscribeToNuptialDances = (callback: (dances: NuptialDance[]) => void): Unsubscribe => {
    const q = query(collection(db, 'nuptialDances'), orderBy('weddingDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NuptialDance))));
    });
};

export const fetchNuptialDances = async (): Promise<NuptialDance[]> => {
    const q = query(collection(db, 'nuptialDances'), orderBy('weddingDate', 'desc'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NuptialDance)));
};

export const addNuptialDance = async (dance: Omit<NuptialDance, 'id'>) => {
    await addDoc(collection(db, 'nuptialDances'), dance);
};

export const updateNuptialDance = async (dance: NuptialDance) => {
    const { id, ...data } = dance;
    await updateDoc(doc(db, 'nuptialDances', id), data);
};

export const deleteNuptialDance = async (danceId: string) => {
    await softDeleteDoc('nuptialDances', danceId);
};

export const restoreNuptialDance = async (danceId: string) => {
    await restoreDoc('nuptialDances', danceId);
};

export const permanentlyDeleteNuptialDance = async (danceId: string) => {
    await permanentlyDeleteDoc('nuptialDances', danceId);
};
