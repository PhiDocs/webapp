import admin from '@/firebase/admin-config';
import type { Work } from '@/lib/types';

const workCollection = admin.firestore().collection('works');

export const WorkRepository = {
  /**
   * Busca todas as obras do Firestore.
   * @returns Uma lista de obras.
   */
  async getAll(): Promise<Work[]> {
    const snapshot = await workCollection.orderBy('createdAt', 'desc').get();
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
  async create(data: { name: string, address: string, companyId: string }): Promise<string> {
    const workRef = await workCollection.add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    return workRef.id;
  },

  /**
   * Atualiza os dados de uma obra existente.
   * @param workId - O ID da obra a ser atualizada.
   * @param data - Os campos a serem atualizados.
   */
  async update(workId: string, data: { [key: string]: any }): Promise<void> {
    await workCollection.doc(workId).update(data);
  },

  /**
   * Deleta uma obra.
   * @param workId - O ID da obra a ser deletada.
   */
  async delete(workId: string): Promise<void> {
    await workCollection.doc(workId).delete();
  },
};
