import admin from '@/firebase/admin-config';
import type { Employee } from '@/lib/types';

type EmployeeData = Omit<Employee, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    admin.firestore().collection('companies').doc(companyId).collection('employees');

export const EmployeeRepository = {
  /**
   * Busca todos os funcionários de uma empresa específica.
   * @param companyId O ID da empresa.
   * @returns Uma lista de funcionários.
   */
  async getAllByCompany(companyId: string): Promise<Employee[]> {
    const snapshot = await getCollection(companyId)
        .orderBy('createdAt', 'desc')
        .get();
        
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Employee[];
  },

  /**
   * Cria um novo funcionário em uma subcoleção da empresa.
   * @param data - Dados do funcionário, incluindo o companyId.
   * @returns O ID do funcionário criado.
   */
  async create(data: EmployeeData): Promise<string> {
    const employeeRef = await getCollection(data.companyId).add({
      ...data,
      createdAt: new Date().toISOString(),
    });
    return employeeRef.id;
  },

  /**
   * Atualiza os dados de um funcionário existente.
   * @param employeeId - O ID do funcionário a ser atualizado.
   * @param data - Os campos a serem atualizados, incluindo o companyId.
   */
  async update(employeeId: string, data: Partial<EmployeeData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating an employee.");
    }
    await getCollection(data.companyId).doc(employeeId).update(data);
  },

  /**
   * Deleta um funcionário.
   * @param employeeId - O ID do funcionário a ser deletado.
   * @param companyId - O ID da empresa à qual o funcionário pertence.
   */
  async delete(employeeId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(employeeId).delete();
  },
};
