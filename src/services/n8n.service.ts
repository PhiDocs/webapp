import { ptBr } from "@/lib/data/strings";

const N8N_ERROR_MESSAGES = {
    RESPONSE_ERROR: ptBr.validations.n8nResponseError,
    NO_DETAILS: ptBr.validations.n8nNoDetails,
    NO_JSON_RESPONSE: ptBr.validations.n8nNoJsonResponse,
    CONNECTION_ERROR: ptBr.validations.n8nConnectionError,
};

class N8nApiService {
    async send(url: string, payload: any) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            let responseData;
            try {
                responseData = await response.json();
            } catch (e) {
                responseData = { message: response.statusText || N8N_ERROR_MESSAGES.NO_JSON_RESPONSE };
            }

            if (!response.ok) {
                const error: any = new Error(N8N_ERROR_MESSAGES.RESPONSE_ERROR);
                error.status = response.status;
                error.details = responseData.message || N8N_ERROR_MESSAGES.NO_DETAILS;
                throw error;
            }

            return {
                message: 'Data sent to n8n successfully.',
                dataReceivedByN8n: responseData,
            };

        } catch (error: any) {
            // Se o erro já foi tratado e formatado, apenas o relance
            if (error.status) {
                throw error;
            }
            
            // Caso contrário, é um erro de conexão/fetch
            const connectionError: any = new Error(N8N_ERROR_MESSAGES.CONNECTION_ERROR);
            connectionError.details = error.message;
            throw connectionError;
        }
    }
}

export const N8nService = new N8nApiService();
