
import { collection, addDoc, updateDoc, doc, getDoc, setDoc, query, orderBy, writeBatch, deleteField, arrayRemove } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Student, StudentPrivateData } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

// DNI/IBAN live in students/{id}/private/sensitive, not on the public student doc — see
// firestore.rules for why (that doc is public-read for the Student Portal, this one isn't).
const privateDocRef = (studentId: string) => doc(db, 'students', studentId, 'private', 'sensitive');

// Lectura directa por id -- usado tras el login del Portal de Alumno, donde ya se conoce el
// studentId auténtico (lo emite la Cloud Function studentLogin junto con el token). Buscar de
// nuevo por teléfono en vez de por id sería un bug real: el teléfono no es único (hermanas, o el
// mismo teléfono de una madre en varias fichas), así que un "primer resultado" de esa búsqueda
// podría devolver la ficha de OTRA alumna con el mismo teléfono.
export const getStudentById = async (studentId: string): Promise<Student | null> => {
    const snap = await getDoc(doc(db, 'students', studentId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Student) : null;
};

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

import { getDocs } from 'firebase/firestore';

export const fetchStudents = async (): Promise<Student[]> => {
    const q = query(collection(db, 'students'), orderBy('name'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
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

// Usado al borrar una clase: hay que desinscribir a todos sus alumnos de golpe. Antes se hacía
// con un updateStudent completo por alumno (N escrituras de red independientes, sin atomicidad);
// esto solo toca el campo que realmente cambia, en un único writeBatch.
export const batchRemoveClassFromStudents = async (studentIds: string[], classId: string) => {
    if (studentIds.length === 0) return;
    const batch = writeBatch(db);
    studentIds.forEach(studentId => {
        batch.update(doc(db, 'students', studentId), {
            enrolledClassIds: arrayRemove(classId),
        });
    });
    await batch.commit();
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
