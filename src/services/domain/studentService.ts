
import { collection, addDoc, updateDoc, doc, getDoc, setDoc, onSnapshot, query, orderBy, writeBatch, Unsubscribe, deleteField } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Student, StudentPrivateData } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

// DNI/IBAN live in students/{id}/private/sensitive, not on the public student doc — see
// firestore.rules for why (that doc is public-read for the Student Portal, this one isn't).
const privateDocRef = (studentId: string) => doc(db, 'students', studentId, 'private', 'sensitive');

export const getStudentPrivateData = async (studentId: string): Promise<StudentPrivateData | null> => {
    const snap = await getDoc(privateDocRef(studentId));
    return snap.exists() ? (snap.data() as StudentPrivateData) : null;
};

export const setStudentPrivateData = async (studentId: string, data: StudentPrivateData) => {
    await setDoc(privateDocRef(studentId), data, { merge: true });
};

// Admin-only bulk read across every student's private doc (e.g. for CSV export / conciliación
// bancaria). Fetches one-by-one via getDoc() instead of a collectionGroup('private') query —
// simple point reads against the exact same students/{id}/private/sensitive rule, so there's no
// separate "list vs get" rule behavior to reason about.
export const fetchAllStudentPrivateData = async (studentIds: string[]): Promise<Record<string, StudentPrivateData>> => {
    const result: Record<string, StudentPrivateData> = {};
    await Promise.all(studentIds.map(async (studentId) => {
        const snap = await getDoc(privateDocRef(studentId));
        if (snap.exists()) result[studentId] = snap.data() as StudentPrivateData;
    }));
    return result;
};

export const batchSetStudentPrivateData = async (entries: { studentId: string; data: StudentPrivateData }[]) => {
    const batch = writeBatch(db);
    entries.forEach(({ studentId, data }) => {
        // Firestore rechaza escribir un campo explícitamente `undefined` (p.ej. una fila de CSV
        // sin columna de IBAN) y aborta el batch entero -- se quita cualquier campo sin valor
        // antes de escribir, en vez de pasar { dni, iban } tal cual.
        const cleanData: StudentPrivateData = {};
        if (data.dni) cleanData.dni = data.dni;
        if (data.iban) cleanData.iban = data.iban;
        if (Object.keys(cleanData).length > 0) {
            batch.set(privateDocRef(studentId), cleanData, { merge: true });
        }
    });
    await batch.commit();
};

export const subscribeToStudents = (callback: (students: Student[]) => void): Unsubscribe => {
    const q = query(collection(db, 'students'), orderBy('name'));
    return onSnapshot(q, (snapshot) => {
        callback(filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student))));
    });
};

import { getDocs, where } from 'firebase/firestore';

export const fetchStudents = async (): Promise<Student[]> => {
    const q = query(collection(db, 'students'), orderBy('name'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
};

export const findStudentByPhone = async (phone: string): Promise<Student | null> => {
    // Clean phone number (remove spaces, dashes)
    const cleanPhone = phone.replace(/\D/g, '');
    // We might need to store clean phones in DB to be robust, 
    // but for now let's assume exact match or try minimal cleaning locally if DB has raw strings.
    // Firestore simple query:
    const q = query(collection(db, 'students'), where('phone', '==', phone));
    const snapshot = await getDocs(q);

    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Student;
};

// Firestore rechaza escribir `undefined` explícitamente (a diferencia de simplemente omitir la
// clave) -- campos numéricos opcionales como augustMaintenanceFee llegan como `undefined` desde
// StudentForm cuando el admin los deja vacíos, así que hay que quitarlos antes de escribir.
export const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    const { augustMaintenanceFee, ...rest } = student;
    const payload = augustMaintenanceFee !== undefined ? { ...rest, augustMaintenanceFee } : rest;
    const docRef = await addDoc(collection(db, 'students'), payload);
    return docRef.id;
};

export const batchAddStudents = async (students: Omit<Student, 'id'>[]): Promise<string[]> => {
    const batch = writeBatch(db);
    const colRef = collection(db, 'students');
    const ids = students.map(s => {
        const ref = doc(colRef);
        batch.set(ref, s);
        return ref.id;
    });
    await batch.commit();
    return ids;
};

export const updateStudent = async (student: Student) => {
    const { id, augustMaintenanceFee, ...rest } = student;
    // undefined significa "el admin lo ha dejado vacío" -- hay que borrar el campo de verdad
    // (deleteField), no solo omitirlo, o un valor anterior se quedaría fantasma en Firestore.
    const data: Record<string, unknown> = { ...rest };
    data.augustMaintenanceFee = augustMaintenanceFee !== undefined ? augustMaintenanceFee : deleteField();
    await updateDoc(doc(db, 'students', id), data);
};

export const deleteStudent = async (studentId: string) => {
    await softDeleteDoc('students', studentId);
};

export const restoreStudent = async (studentId: string) => {
    await restoreDoc('students', studentId);
};

export const permanentlyDeleteStudent = async (studentId: string) => {
    await permanentlyDeleteDoc('students', studentId);
};
