import admin from '@/firebase/admin-config';
import type { Employee } from '@/lib/types';

type EmployeeData = Omit<Employee, 'id' | 'createdAt'>;

const getCollection = (companyId: string) => 
    admin.firestore().collection('companies').doc(companyId).collection('employees');

export const EmployeeRepository = {
  /**
   * Fetch all active employees for a specific company.
   * @param companyId The company ID.
   * @returns A list of employees.
   */
  async getAllByCompany(companyId: string): Promise<Employee[]> {
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
    })) as Employee[];
  },

  /**
   * Create a new employee in a company subcollection.
   * @param data - Employee data, including companyId.
   * @returns The created employee ID.
   */
  async create(data: EmployeeData): Promise<string> {
    const employeeRef = await getCollection(data.companyId).add({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    });
    return employeeRef.id;
  },

  /**
   * Update an existing employee.
   * @param employeeId - The employee ID to update.
   * @param data - Fields to update, including companyId.
   */
  async update(employeeId: string, data: Partial<EmployeeData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating an employee.");
    }
    await getCollection(data.companyId).doc(employeeId).update(data);
  },

  /**
   * Soft delete an employee by marking it as deleted.
   * @param employeeId - The employee ID to delete.
   * @param companyId - The company ID the employee belongs to.
   */
  async delete(employeeId: string, companyId: string): Promise<void> {
    await getCollection(companyId).doc(employeeId).update({
        deletedAt: new Date().toISOString()
    });
  },
};
