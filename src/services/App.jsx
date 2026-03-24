import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as graphService from './services/graphService';

// --- Componente de Assinatura (Canvas) ---
const SignaturePad = ({ label, onSave, onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      if (onSave && canvasRef.current) {
        onSave(canvasRef.current.toDataURL());
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onClear) onClear();
  };

  return (
    <div className="signature-wrapper">
      <label className="signature-label">{label}</label>
      <div className="signature-container">
        <canvas
          ref={canvasRef}
          width={500}
          height={160}
          className="signature-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="signature-footer">
          <button type="button" className="btn-clear-sig" onClick={clearCanvas}>
            Apagar e Assinar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Hook para buscar CNPJ ---
const useCnpj = () => {
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [companyData, setCompanyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const consultarCnpj = useCallback(async (cnpjInput) => {
    const cnpj = cnpjInput.replace(/\D/g, '');
    if (cnpj.length !== 14) {
      setStatus({ type: 'error', message: 'CNPJ inválido ou incompleto.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: 'loading', message: '🔍 Verificando...' });
    setCompanyData(null);

    try {
      // Verifica Compliance
      const complianceResponse = await fetch('https://credenciamentopermite.per.com.br/api/cnpjs');
      if (!complianceResponse.ok) throw new Error('Erro ao conectar servidor de compliance');
      
      const complianceList = await complianceResponse.json();
      // Formata CNPJ para buscar na lista se necessário
      const formattedCnpj = cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
      const complianceStatus = complianceList[formattedCnpj] || complianceList[cnpj];

      if (complianceStatus === 'APROVADO') {
        setStatus({ type: 'loading', message: '✅ Aprovado. Buscando dados...' });
        
        // Busca dados na BrasilAPI
        const dadosResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (dadosResponse.ok) {
          const dados = await dadosResponse.json();
          setCompanyData(dados);
          setStatus({ type: 'success', message: '✅ CNPJ Aprovado e Dados Carregados' });
        } else {
          setStatus({ type: 'warning', message: '⚠️ Aprovado, mas dados não encontrados automaticamente. (Digite manualmente)' });
        }
      } else if (complianceStatus === 'REPROVADO') {
        setStatus({ type: 'error', message: '⛔ CNPJ Recusado no Compliance' });
      } else if (complianceStatus === 'PENDENTE') {
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
};

// --- Template de Email ---
const generateEmailBody = (data, ip, location) => {
  const segmentos = Array.isArray(data.segmento) ? data.segmento.join(', ') : data.segmento;
  return `
    <h2>Novo Credenciamento - PERmite</h2>
    <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
        <tr style="background-color: #8B0000; color: white;"><th colspan="2" style="padding: 10px;">Dados do Cliente</th></tr>
        <tr><td style="padding: 8px;">Razão Social:</td><td style="padding: 8px;">${data.razaoSocial || ''}</td></tr>
        <tr><td style="padding: 8px;">CNPJ:</td><td style="padding: 8px;">${data.cnpj || ''}</td></tr>
        <tr><td style="padding: 8px;">Segmento:</td><td style="padding: 8px;">${segmentos || ''}</td></tr>
        <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Outros</th></tr>
        <tr><td style="padding: 8px;">IP Visitante:</td><td style="padding: 8px;">${ip || ''}</td></tr>
        <tr><td style="padding: 8px;">Localização:</td><td style="padding: 8px;">${location || ''}</td></tr>
    </table>
  `;
};

// --- Helper para converter File em Base64 ---
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]);
  reader.onerror = error => reject(error);
});

// --- Componente do Formulário ---
function CredenciamentoForm({ onTabUpdate, onFormReset }) {
  const { register, handleSubmit, setValue, getValues, watch, reset, formState: { errors } } = useForm();
  const { consultarCnpj, status, companyData, isLoading } = useCnpj();
  const [visitorInfo, setVisitorInfo] = useState({ ip: '', city: '' });
  const cnpjValue = watch('cnpjCheck');

  // Carrega IP do visitante
  useEffect(() => {
    fetch('https://ipinfo.io/json')
      .then(r => r.json())
      .then(data => setVisitorInfo({ ip: data.ip, city: `${data.city}, ${data.region}` }))
      .catch(e => console.error("Erro IP", e));
  }, []);

  // Atualiza campos e Título da Aba quando dados da empresa chegam
  useEffect(() => {
    if (companyData) {
      // Preencher campos
      setValue('razaoSocial', companyData.razao_social);
      setValue('nomeFantasia', companyData.nome_fantasia || companyData.razao_social);
      // ... outros campos (simplificado para o exemplo) ...
      
      // Atualizar título da Aba com a Razão Social
      if (companyData.razao_social && onTabUpdate) {
        onTabUpdate(companyData.razao_social);
      }
    }
  }, [companyData, setValue, onTabUpdate]);

  const handleValidateCnpj = () => {
    if (cnpjValue) consultarCnpj(cnpjValue);
  };

  const onSubmit = async (data) => {
    try {
      // Preparar anexos
      const attachments = [];
      if (data.compBancario && data.compBancario.length > 0) {
        const file = data.compBancario[0];
        const contentBytes = await fileToBase64(file);
        attachments.push({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.name,
          contentType: file.type,
          contentBytes: contentBytes
        });
      }
      
      // Enviar Email
      await graphService.sendEmail({
        to: "docpermite@per.com.br",
        subject: "Novo - Credenciamento",
        body: generateEmailBody(data, visitorInfo.ip, visitorInfo.city),
        attachments: attachments
      });

      alert('Formulário enviado com sucesso!');
      
      // Resetar o formulário
      reset();
      // Resetar a aba para o estado original
      if (onFormReset) onFormReset();
      
    } catch (error) {
      console.error("Erro no envio:", error);
      alert("Erro ao enviar: " + error.message);
    }
  };

  return (
    <div className="form-content">
      <form onSubmit={handleSubmit(onSubmit)} className="animate-form">
        {/* Validação de CNPJ */}
        <div className="form-group full-width" style={{ marginBottom: '20px' }}>
          <label htmlFor="cnpjCheck"> Digite o CNPJ *</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input 
              type="text" 
              id="cnpjCheck" 
              placeholder="00.000.000/0000-00" 
              maxLength={18}
              {...register("cnpjCheck", { required: true })}
              onBlur={(e) => consultarCnpj(e.target.value)}
            />
            <button type="button" className="btn-validate" onClick={handleValidateCnpj} disabled={isLoading}>
              {isLoading ? '...' : 'Validar'}
            </button>
          </div>
          {status.message && (
            <div className={`status-msg ${status.type}`}>{status.message}</div>
          )}
        </div>

        {/* Resto do Formulário (só aparece se aprovado) */}
        {(status.type === 'success' || status.type === 'warning') && (
          <div className="form-grid fade-in">
            {/* ... Campos do formulário simplificados ... */}
            <div className="form-group full-width">
              <label>Razão Social *</label>
              <input type="text" {...register("razaoSocial", { required: true })} />
            </div>
            
            {/* Exemplo de outros campos necessários */}
            <div className="form-group">
               <label>Nome Fantasia</label>
               <input type="text" {...register("nomeFantasia")} />
            </div>

            {/* ... (Inserir aqui todos os outros campos do formulário original) ... */}
            
            <div className="button-container">
              <button type="submit" className="submit-btn">Enviar Documentos</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

// --- Componente Principal (Gerenciador de Abas) ---
function App() {
  // Contador para garantir nomes únicos "Credenciamento 1, 2..."
  const tabCounter = useRef(1);
  
  // Estado das abas: id, title (atual), originalTitle (para reset)
  const [tabs, setTabs] = useState([
    { id: 'tab-1', title: 'Credenciamento 1', originalTitle: 'Credenciamento 1' }
  ]);
  
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Inicialização do MSAL
  useEffect(() => {
    const initAuth = async () => {
      try {
        await graphService.msalInstance.initialize();
        
        // Trata redirecionamento (se houver)
        const response = await graphService.msalInstance.handleRedirectPromise();
        if (response && response.account) {
          graphService.msalInstance.setActiveAccount(response.account);
        }

        const activeAccount = graphService.msalInstance.getActiveAccount();
        if (activeAccount) {
          // Versão Demo: Aceita qualquer domínio de e-mail
          setUser(activeAccount);
        }
      } catch (error) {
        console.error("Auth init failed", error);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await graphService.signIn();
    } catch (error) {
      console.error(error);
      alert("Erro ao iniciar login");
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    graphService.signOut();
    setUser(null);
  };

  // Adicionar nova aba com contador incremental
  const addTab = () => {
    const newCount = tabCounter.current + 1;
    tabCounter.current = newCount;
    const newTitle = `Credenciamento ${newCount}`;
    const newId = `tab-${Date.now()}`;
    
    setTabs([...tabs, { id: newId, title: newTitle, originalTitle: newTitle }]);
    setActiveTabId(newId);
  };

  const closeTab = (e, id) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Não fecha a última
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  // Atualiza o título da aba atual (ex: para Razão Social)
  const updateTabTitle = (id, newTitle) => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === id ? { ...tab, title: newTitle } : tab
    ));
  };

  // Reseta o formulário e o título da aba
  const resetTab = (id) => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === id ? { ...tab, title: tab.originalTitle } : tab
    ));
  };

  if (isInitializing) {
    return <div className="loading-container"><h2>Inicializando Aplicação...</h2></div>;
  }

  return (
    <div className="app-container">
      <header className="tabs-header">
        <div className="tabs-scroll">
          {tabs.map(tab => (
            <div 
              key={tab.id} 
              className={`tab-item ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span>{tab.title}</span>
              <button 
                className="close-tab-btn" 
                onClick={(e) => closeTab(e, tab.id)}
                title="Fechar guia"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="add-tab-btn" onClick={addTab} title="Nova Solicitação">+</button>
        
        <div className="auth-controls">
          {user ? (
            <>
              <span className="user-greeting">Olá, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="auth-btn">Sair</button>
            </>
          ) : (
            <button onClick={handleLogin} className="auth-btn" disabled={isLoggingIn}>
              {isLoggingIn ? 'Entrando...' : 'Entrar'}
            </button>
          )}
        </div>
      </header>

      <main className="form-container-wrapper">
        {user ? (
          tabs.map(tab => (
            <div key={tab.id} className="tab-content" style={{ display: activeTabId === tab.id ? 'block' : 'none' }}>
              <CredenciamentoForm 
                onTabUpdate={(title) => updateTabTitle(tab.id, title)}
                onFormReset={() => resetTab(tab.id)}
              />
            </div>
          ))
        ) : (
          <div className="login-prompt">
            <h2>Por favor, faça o login para iniciar o credenciamento.</h2>
            <button onClick={handleLogin} className="submit-btn" style={{ maxWidth: '400px', margin: '20px auto' }}>
              Fazer Login
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;