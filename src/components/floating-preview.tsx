'use client';

import { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PrintPreview } from '@/components/print-preview';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';

interface FloatingPreviewProps {
    formData: SafetyFormValues;
    analysisData: SafetyAnalysisOutput | null;
    equipmentData: ProtectiveEquipmentOutput | null;
    company: Company | null;
    error?: string | null;
    onClose?: () => void;
    onMinimizedChange?: (isMinimized: boolean) => void;
}

export function FloatingPreview({
    formData,
    analysisData,
    equipmentData,
    company,
    error,
    onClose,
    onMinimizedChange,
}: FloatingPreviewProps) {
    const [isMinimized, setIsMinimized] = useState(false);

    const handleMinimizeToggle = () => {
        const newMinimized = !isMinimized;
        setIsMinimized(newMinimized);
        onMinimizedChange?.(newMinimized);
    };

    return (
        <div
            className={`fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white shadow-2xl border-l border-gray-200 transition-all duration-300 ease-in-out z-10 ${isMinimized ? 'w-16' : 'w-[500px]'
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                {!isMinimized && (
                    <h3 className="text-sm font-semibold text-gray-700">Pré-visualização</h3>
                )}
                <div className="flex items-center gap-1 ml-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={handleMinimizeToggle}
                        title={isMinimized ? 'Expandir' : 'Minimizar'}
                    >
                        {isMinimized ? (
                            <Maximize2 className="h-4 w-4" />
                        ) : (
                            <Minimize2 className="h-4 w-4" />
                        )}
                    </Button>
                    {onClose && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={onClose}
                            title="Fechar"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <div className="h-[calc(100vh-4rem-57px)] overflow-y-auto bg-gray-100 p-4">
                    <div className="transform scale-[0.6] origin-top-left w-[166.67%]">
                        <PrintPreview
                            formData={formData}
                            analysisData={analysisData}
                            equipmentData={equipmentData}
                            company={company}
                            error={error}
                        />
                    </div>
                </div>
            )}

            {/* Minimized state */}
            {isMinimized && (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem-57px)] text-gray-500">
                    <div className="transform -rotate-90 whitespace-nowrap text-xs font-medium">
                        Pré-visualização
                    </div>
                </div>
            )}
        </div>
    );
}
