import { generateCnpj } from '../utils/cnpjUtils';

// CNPJs FIXOS PARA TESTE
const TEST_CNPJS = {
  APROVADO:  '12345678000195', // 12.345.678/0001-95
  REPROVADO: '98765432000198', // 98.765.432/0001-98
  PENDENTE:  '11222333000181'  // 11.222.333/0001-81
};

export const mockCompanyData = {
  razao_social: "EMPRESA DEMO S.A.",
  nome_fantasia: "TECH DEMO SOLUTIONS",
  cep: "01001000",
  logradouro: "Praça da Sé",
  numero: "100",
  bairro: "Sé",
  municipio: "São Paulo",
  uf: "SP",
  email: "contato@demo.com",
  cnpj: generateCnpj(true)
};

export const checkComplianceMock = async (cnpj) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const cleanCnpj = cnpj.replace(/\D/g, '');
      
      // Validações específicas solicitadas
      if (cleanCnpj === TEST_CNPJS.REPROVADO) {
        resolve({ status: 'REPROVADO' });
      } else if (cleanCnpj === TEST_CNPJS.PENDENTE) {
        resolve({ status: 'PENDENTE' });
      } else if (cleanCnpj === TEST_CNPJS.APROVADO) {
        resolve({ status: 'APROVADO' });
      } 
      // Lógica de fallback para CNPJs aleatórios (terminados em 0 ou 1)
      else if (cleanCnpj.endsWith('0')) {
        resolve({ status: 'REPROVADO' });
      } else if (cleanCnpj.endsWith('1')) {
        resolve({ status: 'PENDENTE' });
      } else {
        resolve({ status: 'APROVADO' });
      }
    }, 800); // Delay artificial
  });
};

export const fetchCompanyDataMock = async (cnpj) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ...mockCompanyData,
        cnpj: cnpj // Reflete o CNPJ pesquisado
      });
    }, 600);
  });
};