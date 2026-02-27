import { adminDb } from '@/firebase/admin-firestore';
import { LogService } from '@/services/log.service';

export const ErrorLogRepository = {
  /**
   * Save an error log to Firestore and to a local log file.
   * @param error - The error object.
   * @param functionName - The function name where the error occurred.
   * @param email - The user email, if available.
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

    // Always log to the text file as a reliable fallback
    await LogService.writeToFile(`[${logData.timestamp}] ERROR in ${functionName}: ${logData.errorMessage}\nSTACK: ${logData.stackTrace}\n---`);

    try {
        const logCollection = adminDb.collection('errorLogs');
        await logCollection.add(logData);
    } catch (logError: any) {
        // If logging to Firestore fails, log to console and the text file.
        const criticalErrorMessage = `CRITICAL: Failed to log error to Firestore. Firestore Error: ${logError.message}`;
        console.error(criticalErrorMessage);
        console.error('Original Error:', error.message);
        
        await LogService.writeToFile(`[${new Date().toISOString()}] ${criticalErrorMessage}`);
        await LogService.writeToFile(`[${new Date().toISOString()}] Original Error was: ${error.message}\nSTACK: ${error.stack}\n---`);
    }
  }
}
