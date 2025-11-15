import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Student, Instructor, DanceClass, Payment, Cost } from '../../types';

// --- Students ---

export const subscribeToStudents = (callback: (students: Student[]) => void): Unsubscribe => {
  const q = query(collection(db, 'students'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const students: Student[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Student));
    callback(students);
  });
};

export const addStudent = async (student: Omit<Student, 'id'>) => {
  await addDoc(collection(db, 'students'), student);
};

export const updateStudent = async (student: Student) => {
  const { id, ...studentData } = student;
  const studentDoc = doc(db, 'students', id);
  await updateDoc(studentDoc, studentData);
};

// --- Instructors ---

export const subscribeToInstructors = (callback: (instructors: Instructor[]) => void): Unsubscribe => {
  const q = query(collection(db, 'instructors'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const instructors: Instructor[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Instructor));
    callback(instructors);
  });
};

export const addInstructor = async (instructor: Omit<Instructor, 'id'>) => {
  await addDoc(collection(db, 'instructors'), instructor);
};

export const updateInstructor = async (instructor: Instructor) => {
  const { id, ...instructorData } = instructor;
  const instructorDoc = doc(db, 'instructors', id);
  await updateDoc(instructorDoc, instructorData);
};

export const deleteInstructor = async (instructorId: string) => {
  const instructorDoc = doc(db, 'instructors', instructorId);
  await deleteDoc(instructorDoc);
};

// --- Classes ---

export const subscribeToClasses = (callback: (classes: DanceClass[]) => void): Unsubscribe => {
  const q = query(collection(db, 'classes'), orderBy('name'));
  return onSnapshot(q, (snapshot) => {
    const classes: DanceClass[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as DanceClass));
    callback(classes);
  });
};

export const addClass = async (danceClass: Omit<DanceClass, 'id'>) => {
  await addDoc(collection(db, 'classes'), danceClass);
};

export const updateClass = async (danceClass: DanceClass) => {
  const { id, ...classData } = danceClass;
  const classDoc = doc(db, 'classes', id);
  await updateDoc(classDoc, classData);
};

export const deleteClass = async (classId: string) => {
  const classDoc = doc(db, 'classes', classId);
  await deleteDoc(classDoc);
};

// --- Payments ---

export const subscribeToPayments = (callback: (payments: Payment[]) => void): Unsubscribe => {
  const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const payments: Payment[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Payment));
    callback(payments);
  });
};

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
  await addDoc(collection(db, 'payments'), payment);
};

// --- Costs ---

export const subscribeToCosts = (callback: (costs: Cost[]) => void): Unsubscribe => {
  const q = query(collection(db, 'costs'), orderBy('paymentDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const costs: Cost[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Cost));
    callback(costs);
  });
};

export const addCost = async (cost: Omit<Cost, 'id'>) => {
  await addDoc(collection(db, 'costs'), cost);
};

export const updateCost = async (cost: Cost) => {
  const { id, ...costData } = cost;
  const costDoc = doc(db, 'costs', id);
  await updateDoc(costDoc, costData);
};

export const deleteCost = async (costId: string) => {
  const costDoc = doc(db, 'costs', costId);
  await deleteDoc(costDoc);
};