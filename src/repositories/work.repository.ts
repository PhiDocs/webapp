import { adminDb } from '@/firebase/admin-firestore';
import type { Work, WorkFormValues } from '@/lib/types';

const workCollection = adminDb.collection('works');

export const WorkRepository = {
  /**
   * Fetch all active works for a specific company.
   * @param companyId The company ID.
   * @returns A list of works.
   */
  async getAllByCompany(companyId: string): Promise<Work[]> {
    const snapshot = await workCollection
        .where('companyId', '==', companyId)
        .where('deletedAt', '==', null)
        .orderBy('createdAt', 'desc')
        .get();
        
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Work[];
  },

  /**
   * Create a new work in Firestore.
   * @param data - Work data (e.g. { name: string, address: string, companyId: string }).
   * @returns The created work ID.
   */
  async create(data: WorkFormValues): Promise<string> {
    const workRef = await workCollection.add({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
    return workRef.id;
  },

  /**
   * Update an existing work.
   * @param workId - The work ID to update.
   * @param data - Fields to update.
   */
  async update(workId: string, data: Partial<WorkFormValues>): Promise<void> {
    await workCollection.doc(workId).update(data);
  },

  /**
   * Soft delete a work by marking it as deleted.
   * @param workId - The work ID to delete.
   */
  async delete(workId: string): Promise<void> {
    await workCollection.doc(workId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
