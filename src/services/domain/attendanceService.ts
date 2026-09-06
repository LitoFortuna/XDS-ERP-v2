
import { collection, addDoc, updateDoc, doc, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AttendanceRecord } from '../../../types';

export const fetchAttendance = async (): Promise<AttendanceRecord[]> => {
    const q = query(collection(db, 'attendance'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
};

export const addAttendance = async (record: Omit<AttendanceRecord, 'id'>) => {
    await addDoc(collection(db, 'attendance'), record);
};

export const updateAttendance = async (record: AttendanceRecord) => {
    const { id, ...data } = record;
    await updateDoc(doc(db, 'attendance', id), data);
};
