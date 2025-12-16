import admin from '@/firebase/admin-config';

const companyCollection = admin.firestore().collection('companies');

export const CompanyRepository = {
  /**
   * Cria uma nova empresa no Firestore.
   * @param data - Dados da empresa (ex: { name: string }).
   * @returns O ID da empresa criada.
   */
  async create(data: { name: string }): Promise<string> {
    const companyRef = await companyCollection.add({
      ...data,
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
};
