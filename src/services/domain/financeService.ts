
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, writeBatch, Unsubscribe, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Payment, Cost } from '../../../types';
import { softDeleteDoc, restoreDoc, permanentlyDeleteDoc, filterActive } from './trashService';

// --- Payments ---
export const subscribeToPayments = (callback: (payments: Payment[]) => void): Unsubscribe => {
    const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment))));
    });
};



export const fetchPayments = async (): Promise<Payment[]> => {
    const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
};

export const fetchCosts = async (): Promise<Cost[]> => {
    const q = query(collection(db, 'costs'), orderBy('paymentDate', 'desc'));
    const snapshot = await getDocs(q);
    return filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cost)));
};

export const addPayment = async (payment: Omit<Payment, 'id'>) => {
    await addDoc(collection(db, 'payments'), payment);
};

export const updatePayment = async (payment: Payment) => {
    const { id, ...data } = payment;
    await updateDoc(doc(db, 'payments', id), data);
};

export const deletePayment = async (paymentId: string) => {
    await softDeleteDoc('payments', paymentId);
};

export const restorePayment = async (paymentId: string) => {
    await restoreDoc('payments', paymentId);
};

export const permanentlyDeletePayment = async (paymentId: string) => {
    await permanentlyDeleteDoc('payments', paymentId);
};

export const batchAddPayments = async (payments: Omit<Payment, 'id'>[]) => {
    const batch = writeBatch(db);
    const colRef = collection(db, 'payments');
    payments.forEach(p => batch.set(doc(colRef), p));
    await batch.commit();
};

// --- Costs ---
export const subscribeToCosts = (callback: (costs: Cost[]) => void): Unsubscribe => {
    const q = query(collection(db, 'costs'), orderBy('paymentDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(filterActive(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cost))));
    });
};

export const addCost = async (cost: Omit<Cost, 'id'>) => {
    await addDoc(collection(db, 'costs'), cost);
};

export const updateCost = async (cost: Cost) => {
    const { id, ...data } = cost;
    await updateDoc(doc(db, 'costs', id), data);
};

export const deleteCost = async (costId: string) => {
    await softDeleteDoc('costs', costId);
};

export const restoreCost = async (costId: string) => {
    await restoreDoc('costs', costId);
};

export const permanentlyDeleteCost = async (costId: string) => {
    await permanentlyDeleteDoc('costs', costId);
};

export const batchAddCosts = async (costs: Omit<Cost, 'id'>[]) => {
    const batch = writeBatch(db);
    const colRef = collection(db, 'costs');
    costs.forEach(c => batch.set(doc(colRef), c));
    await batch.commit();
};
