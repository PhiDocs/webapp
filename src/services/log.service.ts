'use server';

// This is a server-only module
import fs from 'fs/promises';
import path from 'path';

class LogServiceController {
    private logFilePath = path.resolve(process.cwd(), 'log.txt');

    /**
     * Appends a message to the log.txt file.
     * Also logs to the console for real-time visibility during development.
     * @param message The message to log.
     */
    async writeToFile(message: string): Promise<void> {
        // Log to console for immediate feedback in dev environments
        console.log("LOGGING:", message);
        
        try {
            await fs.appendFile(this.logFilePath, message + '\n');
        } catch (err) {
            // If writing to file fails, log the failure to the console.
            // This is a critical failure, as it means our fallback logging is down.
            console.error('CRITICAL: Failed to write to log.txt file.', err);
            console.error('Original message was:', message);
        }
    }
}

export const LogService = new LogServiceController();
