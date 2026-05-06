import { LogService } from '@/services/log.service';
import { createSupabaseAdminClient } from '@/supabase/server';

export const ErrorLogRepository = {
  /**
     * Save an error log to Supabase and to a local log file.
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
        const { error } = await createSupabaseAdminClient()
          .from('errorLogs')
          .insert(logData);
        if (error) throw error;
    } catch (logError: any) {
        const criticalErrorMessage = `CRITICAL: Failed to log error to Supabase. Supabase Error: ${logError.message}`;
        console.error(criticalErrorMessage);
        console.error('Original Error:', error.message);
        
        await LogService.writeToFile(`[${new Date().toISOString()}] ${criticalErrorMessage}`);
        await LogService.writeToFile(`[${new Date().toISOString()}] Original Error was: ${error.message}\nSTACK: ${error.stack}\n---`);
    }
  }
}
