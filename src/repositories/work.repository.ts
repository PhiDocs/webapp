'use server';

import admin from '@/firebase/admin-config';
import type { Work, WorkFormValues } from '@/lib/types';

const workCollection = admin.firestore().collection('works');

export const WorkRepository = {
  /**
   * Busca todas as obras ativas de uma empresa específica.
   * @param companyId O ID da empresa.
   * @returns Uma lista de obras.
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
   * Cria uma nova obra no Firestore.
   * @param data - Dados da obra (ex: { name: string, address: string, companyId: string }).
   * @returns O ID da obra criada.
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
   * Atualiza os dados de uma obra existente.
   * @param workId - O ID da obra a ser atualizada.
   * @param data - Os campos a serem atualizados.
   */
  async update(workId: string, data: Partial<WorkFormValues>): Promise<void> {
    await workCollection.doc(workId).update(data);
  },

  /**
   * Deleta (soft delete) uma obra, marcando-a como deletada.
   * @param workId - O ID da obra a ser deletada.
   */
  async delete(workId: string): Promise<void> {
    await workCollection.doc(workId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
