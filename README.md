# Enterprise Onboarding System (Demo)

## 📋 Sobre o Projeto

Esta é uma versão demonstrativa (portfólio) de um sistema de credenciamento corporativo desenvolvido para fintechs. O objetivo da aplicação é facilitar o onboarding de novos estabelecimentos comerciais, realizando validações automáticas de CNPJ, coleta de assinaturas digitais e upload de documentos.

**Nota:** Todas as informações sensíveis, marcas e lógicas de negócio proprietárias foram removidas ou substituídas por mocks e dados genéricos.

## 🚀 Funcionalidades Demonstradas

*   **Gestão de Abas (Tabs):** Permite múltiplos credenciamentos simultâneos sem perda de estado.
*   **Validação de Compliance:** Simulação de verificação de CNPJ em tempo real.
*   **Assinatura Digital:** Componente de Canvas para captura de assinatura manuscrita.
*   **Autenticação Mockada:** Simulação do fluxo MSAL (Microsoft Authentication Library).
*   **Formulários Complexos:** Uso de `react-hook-form` com validações condicionais.
*   **API Mock:** Camada de serviço simulada para rodar o projeto sem backend.

## 🛠 Tecnologias

*   React (Vite)
*   React Hook Form
*   Canvas API (Signature Pad)
*   Azure MSAL (Mocked for Demo)
*   CSS Modules / Custom CSS

## ⚙️ Como rodar localmente

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/enterprise-onboarding-demo.git
```

2. Rode o projeto via CMD na pasta raiz:
```bash
npm run dev
```
3. Caso não rode por falta de dependencias use: npm install na pasta raiz e siga o passo 2 novamente.

   
## 🧪 Dados para Teste

Como o backend é mockado, você pode utilizar qualquer e-mail para login.

*   **Login:** Clique em "Entrar" (não requer senha real).
*   **CNPJ:** Utilize os dados abaixo para testar os diferentes fluxos de validação:
    *   ✅ **Aprovado:** `12.345.678/0001-95` (Libera o formulário completo)
    *   ⛔ **Reprovado:** `98.765.432/0001-98` (Bloqueia o cadastro)
    *   ⏳ **Em Análise:** `11.222.333/0001-81` (Mensagem de aguarde)
