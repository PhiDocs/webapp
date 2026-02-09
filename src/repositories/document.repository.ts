import admin from '@/firebase/admin-config';
import type { SavedDocument } from '@/lib/types';

const collection = admin.firestore().collection('documents');

export type SavedDocumentCreate = Omit<SavedDocument, 'id'>;

export const DocumentRepository = {
  async create(data: SavedDocumentCreate): Promise<string> {
    const ref = await collection.add(data);
    return ref.id;
  },

  async getByCompany(companyId: string): Promise<SavedDocument[]> {
    const snapshot = await collection
      .where('companyId', '==', companyId)
      .orderBy('updatedAt', 'desc')
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SavedDocument[];
  },

  async getById(id: string): Promise<SavedDocument | null> {
    const doc = await collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SavedDocument;
  },

  async update(id: string, data: Partial<SavedDocument>): Promise<void> {
    await collection.doc(id).update(data);
  },

  async delete(id: string): Promise<void> {
    await collection.doc(id).delete();
  },
};
