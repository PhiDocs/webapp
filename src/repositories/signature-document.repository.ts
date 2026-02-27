import { adminDb } from '@/firebase/admin-firestore';
import type { SignatureDocument } from '@/lib/types';

const signatureCollection = adminDb.collection('signatureDocuments');

export type SignatureDocumentCreate = Omit<SignatureDocument, 'id'>;

export const SignatureDocumentRepository = {
  async create(data: SignatureDocumentCreate): Promise<string> {
    const ref = await signatureCollection.add(data);
    return ref.id;
  },

  async getByCompany(companyId: string): Promise<SignatureDocument[]> {
    const snapshot = await signatureCollection
      .where('companyId', '==', companyId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SignatureDocument[];
  },

  async getById(id: string): Promise<SignatureDocument | null> {
    const doc = await signatureCollection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as SignatureDocument;
  },

  async getBySignerEmail(email: string): Promise<SignatureDocument[]> {
    const snapshot = await signatureCollection
      .where('signerEmails', 'array-contains', email.toLowerCase())
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as SignatureDocument[];
  },

  async update(id: string, data: Partial<SignatureDocument>): Promise<void> {
    await signatureCollection.doc(id).update(data);
  },
};
