import admin from '@/firebase/admin-config';
import type { SavedDocument } from '@/lib/types';
import { DOCUMENT_TYPES } from '@/lib/constants';

const collection = admin.firestore().collection('documents');
const companiesCollection = admin.firestore().collection('companies');

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

  async getBySignatureDocumentId(signatureDocumentId: string): Promise<SavedDocument | null> {
    const snapshot = await collection
      .where('signatureDocumentId', '==', signatureDocumentId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SavedDocument;
  },

  async reserveNextAprSequence(companyId: string): Promise<number> {
    const companyRef = companiesCollection.doc(companyId);
    const next = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(companyRef);
      const current = Number(snap.data()?.aprSequence || 0);
      const reserved = current + 1;
      tx.set(companyRef, { aprSequence: reserved }, { merge: true });
      return reserved;
    });
    return next;
  },

  async getLatestRevisionByGroupId(revisionGroupId: string): Promise<SavedDocument | null> {
    const snapshot = await collection
      .where('revisionGroupId', '==', revisionGroupId)
      .get();
    if (snapshot.empty) return null;
    const documents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SavedDocument[];
    documents.sort((a, b) => (b.revisionNumber || 1) - (a.revisionNumber || 1));
    return documents[0] || null;
  },

  async getLatestAprByCompany(companyId: string): Promise<SavedDocument | null> {
    const snapshot = await collection
      .where('companyId', '==', companyId)
      .where('documentType', '==', DOCUMENT_TYPES.APR)
      .orderBy('documentSequence', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SavedDocument;
  },

  async getLatestByCompanyAndDocumentName(companyId: string, documentName: string): Promise<SavedDocument | null> {
    const snapshot = await collection
      .where('companyId', '==', companyId)
      .where('documentName', '==', documentName)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as SavedDocument;
  },

  async update(id: string, data: Partial<SavedDocument>): Promise<void> {
    await collection.doc(id).update(data);
  },

  async delete(id: string): Promise<void> {
    await collection.doc(id).delete();
  },
};
