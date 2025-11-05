import React, { useState, useEffect } from 'react';
import { generateReportWithGemini } from '../services/geminiService';
import { getEquipment } from '../services/apiService';
import { Equipment, User } from '../types';
import Icon from './common/Icon';

const AIAssistant: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<Equipment[] | null>(null);
    const [error, setError] = useState('');
    const [inventoryData, setInventoryData] = useState<Equipment[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);

    useEffect(() => {
        const loadInventory = async () => {
            setIsDataLoading(true);
            try {
// FIX: Pass the currentUser object to the getEquipment function as required.
                const data = await getEquipment(currentUser);
                setInventoryData(data);
            } catch (error) {
                console.error("Failed to load inventory for AI assistant", error);
                setError("Não foi possível carregar os dados do inventário para o assistente.");
            } finally {
                setIsDataLoading(false);
            }
        };
        loadInventory();
    }, [currentUser]);


    const handleGenerateReport = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError('');
        setReport(null);
        try {
            const result = await generateReportWithGemini(query, inventoryData);

            if (result.error) {
                setError(result.error);
            } else if (result.reportData) {
                setReport(result.reportData);
            } else {
                setError('A resposta da IA não continha dados de relatório válidos.');
            }
        } catch (e) {
            console.error(e);
            setError('Falha ao processar a resposta da IA.');
        } finally {
            setIsLoading(false);
        }
    };

    const exampleQueries = [
        "Liste todos os equipamentos do setor FINANCEIRO com garantia expirada.",
        "Mostre todos os notebooks da marca Dell.",
        "Quais equipamentos foram comprados em 2023?",
        "Encontre todos os servidores em manutenção.",
    ];

    return (
        <div className="bg-white dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-brand-dark dark:text-dark-text-primary mb-4">Assistente de IA para Relatórios</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                Use linguagem natural para gerar relatórios complexos do seu inventário. O assistente usará a IA do Gemini para filtrar e apresentar os dados.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: 'Liste todos os monitores do setor de TI'"
                    className="flex-grow p-3 border dark:border-dark-border rounded-lg focus:ring-2 focus:ring-brand-primary bg-white dark:bg-gray-800 text-gray-800 dark:text-dark-text-primary"
                    disabled={isLoading || isDataLoading}
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerateReport()}
                />
                <button
                    onClick={handleGenerateReport}
                    disabled={isLoading || isDataLoading}
                    className="bg-brand-primary text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                >
                    {isLoading || isDataLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {isDataLoading ? 'Carregando Dados...' : 'Gerando...'}
                        </>
                    ) : (
                       <>
                        <Icon name="Bot" size={18} />
                        Gerar Relatório
                       </>
                    )}
                </button>
            </div>
            
            <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">Ou tente um exemplo:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                    {exampleQueries.map((ex, i) => (
                        <button key={i} onClick={() => setQuery(ex)} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-dark-text-secondary px-3 py-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" disabled={isLoading || isDataLoading}>
                            {ex}
                        </button>
                    ))}
                </div>
            </div>

            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p>{error}</p></div>}

            {report && (
                <div className="mt-6">
                    <h3 className="text-xl font-semibold mb-4 text-brand-dark dark:text-dark-text-primary">Resultados do Relatório ({report.length} itens)</h3>
                    {report.length > 0 ? (
                        <>
                            {/* Mobile View */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden">
                                {report.map(item => (
                                    <div key={item.id} className="bg-gray-50 dark:bg-dark-bg p-4 rounded-lg shadow border dark:border-dark-border space-y-2">
                                        {Object.entries(item).map(([key, value]) => (
                                            <p key={key} className="text-sm text-gray-600 dark:text-dark-text-secondary">
                                                <strong className="text-gray-800 dark:text-dark-text-primary capitalize">{key}:</strong> {String(value)}
                                            </p>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            {/* Desktop View */}
                            <div className="overflow-x-auto border dark:border-dark-border rounded-lg hidden lg:block">
                                 <table className="w-full text-sm text-left text-gray-700 dark:text-dark-text-secondary">
                                    <thead className="text-xs text-gray-800 dark:text-dark-text-primary uppercase bg-gray-100 dark:bg-gray-900/50">
                                        <tr>
                                            {Object.keys(report[0]).map(key => <th key={key} scope="col" className="px-6 py-3 capitalize">{key.replace(/([A-Z])/g, ' $1')}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.map((item) => (
                                            <tr key={item.id} className="bg-white dark:bg-dark-card border-b dark:border-dark-border hover:bg-gray-50 dark:hover:bg-gray-700">
                                                {Object.values(item).map((value, i) => <td key={i} className="px-6 py-4">{String(value)}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                       <div className="text-center py-10 border dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg">
                            <Icon name="SearchX" size={48} className="mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-600 dark:text-dark-text-secondary">Nenhum resultado encontrado para sua consulta.</p>
                       </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AIAssistant;