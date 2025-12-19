'use server';

import admin from '@/firebase/admin-config';
import { LogService } from '@/services/log.service';

export const ErrorLogRepository = {
  /**
   * Salva um log de erro no Firestore e também em um arquivo de log local.
   * @param error - O objeto de erro.
   * @param functionName - O nome da função onde o erro ocorreu.
   * @param email - O email do usuário, se disponível.
   */
  async log(error: Error, functionName: string, email?: string): Promise<void> {
    const logData = {
        timestamp: new Date().toISOString(),
        functionName,
        userEmail: email || 'N/A',
        errorCode: (error as any).code || 'UNKNOWN_CODE',
        errorMessage: error.message || 'No error message available.',
        stackTrace: error.stack || 'No stack trace available.',
    };

    // Sempre logar no arquivo de texto como fallback confiável
    await LogService.writeToFile(`[${logData.timestamp}] ERROR in ${functionName}: ${logData.errorMessage}\nSTACK: ${logData.stackTrace}\n---`);

    try {
        const logCollection = admin.firestore().collection('errorLogs');
        await logCollection.add(logData);
    } catch (logError: any) {
        // Se a própria escrita do log no Firestore falhar, loga no console e no arquivo de texto.
        const criticalErrorMessage = `CRITICAL: Failed to log error to Firestore. Firestore Error: ${logError.message}`;
        console.error(criticalErrorMessage);
        console.error('Original Error:', error.message);
        
        await LogService.writeToFile(`[${new Date().toISOString()}] ${criticalErrorMessage}`);
        await LogService.writeToFile(`[${new Date().toISOString()}] Original Error was: ${error.message}\nSTACK: ${error.stack}\n---`);
    }
  }
}
