
import { adminDb } from '@/firebase/admin-config';

export const ErrorLogRepository = {
  /**
   * Salva um log de erro no Firestore usando o Admin SDK.
   * @param error - O objeto de erro.
   * @param functionName - O nome da função onde o erro ocorreu.
   * @param email - O email do usuário, se disponível.
   */
  async log(error: any, functionName: string, email?: string): Promise<void> {
    try {
        const logCollection = adminDb.collection('errorLogs');
        await logCollection.add({
            timestamp: new Date().toISOString(),
            functionName,
            userEmail: email || 'N/A',
            errorCode: error.code || 'UNKNOWN_CODE',
            errorMessage: error.message || 'No error message available.',
            stackTrace: error.stack || 'No stack trace available.',
        });
    } catch (logError) {
        // Se a própria escrita do log falhar, loga no console para não perder a informação.
        console.error('CRITICAL: Failed to log error to Firestore.', logError);
        console.error('Original Error:', error);
    }
  }
}
