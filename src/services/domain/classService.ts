
import { collection, addDoc, updateDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DanceClass } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';
import { getDocs } from 'firebase/firestore';

export const fetchClasses = async (): Promise<DanceClass[]> => {
    const q = query(collection(db, 'classes'), orderBy('name'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DanceClass)));
};

export const addClass = async (danceClass: Omit<DanceClass, 'id'>) => {
    await addDoc(collection(db, 'classes'), danceClass);
};

export const batchAddClasses = async (classes: Omit<DanceClass, 'id'>[]) => {
    const batch = writeBatch(db);
    const colRef = collection(db, 'classes');
    classes.forEach(c => batch.set(doc(colRef), c));
    await batch.commit();
};

export const updateClass = async (danceClass: DanceClass) => {
    const { id, ...data } = danceClass;
    await updateDoc(doc(db, 'classes', id), data);
};

export const deleteClass = async (classId: string) => {
    await softDeleteDoc('classes', classId);
};

export const restoreClass = async (classId: string) => {
    await restoreDoc('classes', classId);
};

export const permanentlyDeleteClass = async (classId: string) => {
    await permanentlyDeleteDoc('classes', classId);
};
