
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, writeBatch, runTransaction, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { MerchandiseItem, MerchandiseSale } from '../../../types';

// --- Items ---
export const fetchMerchandiseItems = async (): Promise<MerchandiseItem[]> => {
    const q = query(collection(db, 'merchandiseItems'), orderBy('name'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchandiseItem));
};

export const addMerchandiseItem = async (item: Omit<MerchandiseItem, 'id'>) => {
    await addDoc(collection(db, 'merchandiseItems'), item);
};

export const updateMerchandiseItem = async (item: MerchandiseItem) => {
    const { id, ...data } = item;
    await updateDoc(doc(db, 'merchandiseItems', id), data);
};

export const deleteMerchandiseItem = async (itemId: string) => {
    await deleteDoc(doc(db, 'merchandiseItems', itemId));
};

export const batchAddMerchandiseItems = async (items: Omit<MerchandiseItem, 'id'>[]) => {
    const batch = writeBatch(db);
    const colRef = collection(db, 'merchandiseItems');
    items.forEach(i => batch.set(doc(colRef), i));
    await batch.commit();
};

// --- Sales ---
export const fetchMerchandiseSales = async (): Promise<MerchandiseSale[]> => {
    const q = query(collection(db, 'merchandiseSales'), orderBy('saleDate', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MerchandiseSale));
};

/**
 * Registra una venta y descuenta el stock de forma atómica.
 */
export const executeMerchandiseSale = async (sale: Omit<MerchandiseSale, 'id'>) => {
    await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'merchandiseItems', sale.itemId);
        const itemDoc = await transaction.get(itemRef);

        if (!itemDoc.exists()) {
            throw new Error("El artículo no existe.");
        }

        const currentStock = itemDoc.data().stock || 0;
        if (currentStock < sale.quantity) {
            throw new Error("No hay suficiente stock.");
        }

        // 1. Crear el registro de venta
        const saleRef = doc(collection(db, 'merchandiseSales'));
        transaction.set(saleRef, sale);

        // 2. Actualizar el stock del item
        transaction.update(itemRef, { stock: currentStock - sale.quantity });
    });
};

/**
 * Elimina una venta y repone el stock de forma atómica.
 */
export const cancelMerchandiseSale = async (sale: MerchandiseSale) => {
    await runTransaction(db, async (transaction) => {
        const itemRef = doc(db, 'merchandiseItems', sale.itemId);
        const itemDoc = await transaction.get(itemRef);

        // 1. Eliminar el registro de venta
        const saleRef = doc(db, 'merchandiseSales', sale.id);
        transaction.delete(saleRef);

        // 2. Reponer el stock si el item aún existe
        if (itemDoc.exists()) {
            const currentStock = itemDoc.data().stock || 0;
            transaction.update(itemRef, { stock: currentStock + sale.quantity });
        }
    });
};

export const addMerchandiseSale = async (sale: Omit<MerchandiseSale, 'id'>) => {
    await addDoc(collection(db, 'merchandiseSales'), sale);
};

export const deleteMerchandiseSale = async (saleId: string) => {
    await deleteDoc(doc(db, 'merchandiseSales', saleId));
};
