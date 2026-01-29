import admin from '@/firebase/admin-config';
import type { Company } from '@/lib/types';

const companyCollection = admin.firestore().collection('companies');

export const CompanyRepository = {
  /**
   * Busca uma única empresa pelo seu ID.
   * @param id O ID da empresa.
   * @returns A empresa ou null se não encontrada.
   */
  async getById(id: string): Promise<Company | null> {
    const doc = await companyCollection.doc(id).get();
    if (!doc.exists) {
        return null;
    }
    return { id: doc.id, ...doc.data() } as Company;
  },

  /**
   * Busca todas as empresas do Firestore.
   * @returns Uma lista de empresas.
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
   * Cria uma nova empresa no Firestore.
   * @param data - Dados da empresa (ex: { name: string }).
   * @returns O ID da empresa criada.
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
   * Atualiza os dados de uma empresa existente.
   * @param companyId - O ID da empresa a ser atualizada.
   * @param data - Os campos a serem atualizados (ex: { ownerUid: string }).
   */
  async update(companyId: string, data: { [key: string]: any }): Promise<void> {
    await companyCollection.doc(companyId).update(data);
  },

  /**
   * Deleta uma empresa.
   * @param companyId - O ID da empresa a ser deletada.
   */
  async delete(companyId: string): Promise<void> {
    // Em uma aplicação real, aqui seria o local para deletar todos os dados
    // associados (usuários, obras, documentos, etc.) em uma transação.
    await companyCollection.doc(companyId).delete();
  },
};
