
import { collection, addDoc, getDocs, query, where, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ClassAbsence } from '../../../types';

// Creado desde el Portal de Alumno (la propia alumna avisando que no vendrá a una sesión). Ver
// firestore.rules: solo se puede crear con studentId == el uid autenticado de quien escribe.
export const createClassAbsence = async (absence: Omit<ClassAbsence, 'id' | 'createdAt'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'classAbsences'), {
        ...absence,
        createdAt: new Date().toISOString(),
    });
    return docRef.id;
};

export const fetchAbsencesByStudent = async (studentId: string): Promise<ClassAbsence[]> => {
    const q = query(collection(db, 'classAbsences'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassAbsence));
};

// Admin-only en la práctica (ver Dashboard.tsx): próximos avisos de ausencia a partir de hoy.
export const fetchUpcomingAbsences = async (fromDateIso: string): Promise<ClassAbsence[]> => {
    const q = query(collection(db, 'classAbsences'), where('date', '>=', fromDateIso), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassAbsence));
};

export const deleteClassAbsence = async (absenceId: string): Promise<void> => {
    await deleteDoc(doc(db, 'classAbsences', absenceId));
};
