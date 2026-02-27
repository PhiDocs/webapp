import { adminDb } from '@/firebase/admin-firestore';
import type { Subcontractor } from '@/lib/types';

type SubcontractorData = Omit<Subcontractor, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    adminDb.collection('companies').doc(companyId).collection('subcontractors');

export const SubcontractorRepository = {
  /**
   * Fetch all active subcontractors for a company.
   */
  async getAllByCompany(companyId: string): Promise<Subcontractor[]> {
    const snapshot = await getCollection(companyId)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .get();
        
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Subcontractor[];
  },

  /**
   * Create a new subcontractor.
   */
  async create(data: SubcontractorData): Promise<string> {
    const subcontractorRef = await getCollection(data.companyId).add({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
    return subcontractorRef.id;
  },

  /**
   * Update an existing subcontractor.
   */
  async update(subcontractorId: string, data: Partial<SubcontractorData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a subcontractor.");
    }
    await getCollection(data.companyId).doc(subcontractorId).update(data);
  },

  /**
   * Soft delete a subcontractor by marking it as deleted.
   */
  async delete(subcontractorId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(subcontractorId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
