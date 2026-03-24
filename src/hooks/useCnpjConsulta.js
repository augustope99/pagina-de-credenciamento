import { useState, useCallback } from 'react';
import { checkComplianceMock, fetchCompanyDataMock } from '../services/mockApi';

export function useCnpjConsulta() {
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [companyData, setCompanyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const consultarCnpj = useCallback(async (cnpjRaw) => {
    const cleanCnpj = cnpjRaw.replace(/\D/g, '');
    if (cleanCnpj.length !== 14) {
      setStatus({ type: 'error', message: 'CNPJ inválido ou incompleto.' });
      return;
    }
    setIsLoading(true);
    setStatus({ type: 'loading', message: '🔍 Verificando...' });
    setCompanyData(null);
    try {
      // Use Mock Service instead of real endpoints
      const compliance = await checkComplianceMock(cleanCnpj);
      
      if (compliance.status === 'APROVADO') {
        setStatus({ type: 'loading', message: '✅ Aprovado.' });
        
        const data = await fetchCompanyDataMock(cleanCnpj);
        setCompanyData(data);
        setStatus({ type: 'success', message: '✅ CNPJ Aprovado (Dados Mockados)' });

      } else if (compliance.status === 'REPROVADO') {
        setStatus({ type: 'error', message: '⛔ CNPJ Recusado no Compliance' });
      } else if (compliance.status === 'PENDENTE') {
        setStatus({ type: 'warning', message: '⏳ CNPJ em Análise - Aguardando Aprovação' });
      } else {
        setStatus({ type: 'error', message: '⚠️ CNPJ não encontrado na base de dados' });
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: '❌ Erro de conexão.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { consultarCnpj, status, companyData, isLoading };
}
