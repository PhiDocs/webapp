import { adminDb } from '@/firebase/admin-firestore';
import type { Company } from '@/lib/types';

const companyCollection = adminDb.collection('companies');

export const CompanyRepository = {
  /**
   * Fetch a single company by ID.
   * @param id The company ID.
   * @returns The company or null if not found.
   */
  async getById(id: string): Promise<Company | null> {
    const doc = await companyCollection.doc(id).get();
    if (!doc.exists) {
        return null;
    }
    return { id: doc.id, ...doc.data() } as Company;
  },

  /**
   * Fetch all companies from Firestore.
   * @returns A list of companies.
   */
  async getAll(): Promise<Company[]> {
    const snapshot = await companyCollection.orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Company[];
  },

  /**
   * Create a new company in Firestore.
   * @param data - Company data (e.g. { name: string }).
   * @returns The created company ID.
   */
  async create(data: { name: string }): Promise<string> {
    const companyRef = await companyCollection.add({
      ...data,
      n8nProductionUrl: '',
      n8nTestUrl: '',
      createdAt: new Date().toISOString(),
    });
    return companyRef.id;
  },

  /**
   * Update an existing company.
   * @param companyId - The company ID to update.
   * @param data - Fields to update (e.g. { ownerUid: string }).
   */
  async update(companyId: string, data: { [key: string]: any }): Promise<void> {
    await companyCollection.doc(companyId).update(data);
  },

  /**
   * Delete a company.
   * @param companyId - The company ID to delete.
   */
  async delete(companyId: string): Promise<void> {
    // In a real app, this is where you'd delete all associated data
    // (users, works, documents, etc.) in a transaction.
    await companyCollection.doc(companyId).delete();
  },
};
