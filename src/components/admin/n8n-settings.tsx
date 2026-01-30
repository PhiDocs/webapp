'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Zap } from 'lucide-react';
import { notifyN8n } from '@/server/n8n-actions';
import { useToast } from '@/hooks/use-toast';
import type { Company } from '@/lib/types';
import { ptBr } from '@/lib/data/strings';

interface N8nSettingsProps {
    company: Company;
}

export function N8nSettings({ company }: N8nSettingsProps) {
    const [isTestingProd, setIsTestingProd] = useState(false);
    const [isTestingTest, setIsTestingTest] = useState(false);
    const { toast } = useToast();

    const handleTestN8n = async (isTest: boolean) => {
        const url = isTest ? company.n8nTestUrl : company.n8nProductionUrl;
        const targetName = isTest ? ptBr.toasts.success.n8nTest : ptBr.toasts.success.n8nProduction;

        if (!url) {
            toast({
                variant: 'destructive',
                title: 'URL não configurada',
                description: `A ${targetName} não está configurada nas configurações da empresa.`,
            });
            return;
        }

        isTest ? setIsTestingTest(true) : setIsTestingProd(true);

        const testPayload = {
            message: ptBr.n8n.testMessage,
            testId: `test-${Math.random().toString(36).substring(7)}`,
            timestamp: new Date().toISOString(),
            testType: isTest ? 'Test' : 'Production',
            companyName: company.name,
        };

        const result = await notifyN8n(testPayload, url);

        if (result.success) {
            toast({
                title: ptBr.toasts.success.n8nConnection,
                description: `Requisição enviada com sucesso para a ${targetName}.`,
            });
        } else {
            const errorStatus = 'status' in result.data ? result.data.status : undefined;
            const errorDetails = 'details' in result.data ? result.data.details : undefined;
            toast({
                variant: 'destructive',
                title: `${ptBr.toasts.errors.n8nConnectionFailed} (${errorStatus || ptBr.toasts.errors.n8nConnectionFailedNetwork})`,
                description: ptBr.toasts.errors.n8nConnectionFailedDescription.replace('{{details}}', errorDetails || ptBr.errors.n8nCheckUrl),
            });
        }

        isTest ? setIsTestingTest(false) : setIsTestingProd(false);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Integração n8n</CardTitle>
                <CardDescription>Teste as URLs de webhook do n8n para garantir que a integração está funcionando.</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                <div className='space-y-2'>
                    <Button
                        variant="outline"
                        className='w-full'
                        onClick={() => handleTestN8n(false)}
                        disabled={isTestingProd || !company.n8nProductionUrl}
                    >
                        {isTestingProd ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{ptBr.actions.testingConnection}</>
                        ) : (
                            <><Zap className="mr-2 h-4 w-4" />Testar URL de Produção</>
                        )}
                    </Button>
                </div>
                 <div className='space-y-2'>
                    <Button
                        variant="outline"
                        className='w-full'
                        onClick={() => handleTestN8n(true)}
                        disabled={isTestingTest || !company.n8nTestUrl}
                    >
                        {isTestingTest ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{ptBr.actions.testingConnection}</>
                        ) : (
                            <><Zap className="mr-2 h-4 w-4" />Testar URL de Teste</>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
