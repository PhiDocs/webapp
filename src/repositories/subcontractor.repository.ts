'use server';

import admin from '@/firebase/admin-config';
import type { Subcontractor } from '@/lib/types';

type SubcontractorData = Omit<Subcontractor, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    admin.firestore().collection('companies').doc(companyId).collection('subcontractors');

export const SubcontractorRepository = {
  /**
   * Busca todas as empresas terceirizadas ativas de uma empresa principal.
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
   * Cria uma nova empresa terceirizada.
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
   * Atualiza os dados de uma empresa terceirizada.
   */
  async update(subcontractorId: string, data: Partial<SubcontractorData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a subcontractor.");
    }
    await getCollection(data.companyId).doc(subcontractorId).update(data);
  },

  /**
   * Deleta (soft delete) uma empresa terceirizada, marcando-a como deletada.
   */
  async delete(subcontractorId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(subcontractorId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
