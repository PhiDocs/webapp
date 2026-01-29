'use server';

import admin from '@/firebase/admin-config';
import type { JobRole } from '@/lib/types';

type JobRoleData = Omit<JobRole, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    admin.firestore().collection('companies').doc(companyId).collection('jobRoles');

export const JobRoleRepository = {
  /**
   * Busca todos os cargos ativos de uma empresa específica.
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
   * Cria um novo cargo em uma subcoleção da empresa.
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
   * Atualiza os dados de um cargo existente.
   */
  async update(jobRoleId: string, data: Partial<JobRoleData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a job role.");
    }
    await getCollection(data.companyId).doc(jobRoleId).update(data);
  },

  /**
   * Deleta (soft delete) um cargo, marcando-o como deletado.
   */
  async delete(jobRoleId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(jobRoleId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
