
import { doc, updateDoc, deleteDoc, deleteField, collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

// "Papelera": en vez de borrar de verdad, se marca deletedAt y se filtra de las listas normales.
// La Papelera (src/components/Papelera.tsx) es la única pantalla que lee estos documentos sin
// filtrar. Un job programado (Cloud Function purgeTrash) borra de verdad lo que lleve más de 30
// días marcado. Ver firestore.rules: no hace falta ningún cambio de reglas porque la escritura ya
// era admin-only y la lectura pública de estas colecciones no cambia de alcance.

export const softDeleteDoc = async (collectionName: string, id: string): Promise<void> => {
    await updateDoc(doc(db, collectionName, id), { deletedAt: new Date().toISOString() });
};

export const restoreDoc = async (collectionName: string, id: string): Promise<void> => {
    await updateDoc(doc(db, collectionName, id), { deletedAt: deleteField() });
};

export const permanentlyDeleteDoc = async (collectionName: string, id: string): Promise<void> => {
    await deleteDoc(doc(db, collectionName, id));
};

export const filterActive = <T extends { deletedAt?: string }>(items: T[]): T[] =>
    items.filter(item => !item.deletedAt);

// Solo para la Papelera: trae TODOS los documentos de una colección, borrados incluidos.
export const fetchAllRaw = async <T extends { id: string }>(collectionName: string): Promise<T[]> => {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
};
