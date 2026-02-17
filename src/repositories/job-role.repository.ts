import admin from '@/firebase/admin-config';
import type { JobRole } from '@/lib/types';

type JobRoleData = Omit<JobRole, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    admin.firestore().collection('companies').doc(companyId).collection('jobRoles');

export const JobRoleRepository = {
  /**
   * Fetch all active job roles for a specific company.
   */
  async getAllByCompany(companyId: string): Promise<JobRole[]> {
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
    })) as JobRole[];
  },

  /**
   * Create a new job role in a company subcollection.
   */
  async create(data: JobRoleData): Promise<string> {
    const jobRoleRef = await getCollection(data.companyId).add({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
    return jobRoleRef.id;
  },

  /**
   * Update an existing job role.
   */
  async update(jobRoleId: string, data: Partial<JobRoleData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a job role.");
    }
    await getCollection(data.companyId).doc(jobRoleId).update(data);
  },

  /**
   * Soft delete a job role by marking it as deleted.
   */
  async delete(jobRoleId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(jobRoleId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
