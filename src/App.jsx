import { useState, useEffect } from 'react';
import { msalInstance, signIn, signOut } from './services/graphService';
import CredenciamentoForm from './components/CredenciamentoForm';
import './App.css';
import './theme.css';

export default function App() {
  const [tabs, setTabs] = useState([{ id: 'tab-1', title: 'Credenciamento 1', version: 0, isRenamed: false }]);
  const [tabCounter, setTabCounter] = useState(2); // Contador para garantir números únicos (começa no 2)
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [account, setAccount] = useState(null);
  const [isMsalInitialized, setIsMsalInitialized] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await msalInstance.initialize();

        // Processa resposta de redirecionamento (resolve loop de login e remove hash da URL)
        const redirectResponse = await msalInstance.handleRedirectPromise();
        
        if (redirectResponse && redirectResponse.account) {
          msalInstance.setActiveAccount(redirectResponse.account);
        }

        const currentAccount = msalInstance.getActiveAccount();
        if (currentAccount) {
          // Versão Demo: Aceita qualquer usuário logado via mock
          setAccount(currentAccount);
        }
        setIsMsalInitialized(true);
      } catch (e) {
        console.error("MSAL initialization failed:", e);
        setIsMsalInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return; // Previne cliques múltiplos
    setIsLoggingIn(true);
    try {
      // Inicia o fluxo de redirecionamento (a página vai recarregar na Microsoft)
      await signIn();
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao iniciar login: " + error.message);
      setIsLoggingIn(false); 
    }
    // Não precisamos de finally setIsLoggingIn(false) aqui no sucesso,
    // pois a página será redirecionada.
  };

  const handleLogout = () => {
    signOut();
    setAccount(null);
  };

  const addTab = () => {
    const newId = `tab-${Date.now()}`;
    // Usa o contador atual para o título e incrementa o contador global
    const newTitle = `Credenciamento ${tabCounter}`;
    setTabs(prev => [...prev, { id: newId, title: newTitle, version: 0, isRenamed: false }]);
    setActiveTabId(newId);
    setTabCounter(prev => prev + 1);
  };

  const closeTab = (id, e) => {
    if (e) e.stopPropagation();
    if (tabs.length === 1) return;
    
    // Apenas remove a aba, sem renumerar as outras (mantém os nomes originais)
    const updatedTabs = tabs.filter(tab => tab.id !== id);
    
    setTabs(updatedTabs);
    
    if (activeTabId === id) {
      setActiveTabId(updatedTabs[updatedTabs.length - 1].id);
    }
  };

  const handleRenameTab = (id, newTitle) => {
    setTabs(prevTabs => {
      // Evita re-renderização se o título já for o mesmo (quebra loop infinito)
      const currentTab = prevTabs.find(t => t.id === id);
      if (currentTab && currentTab.title === newTitle && currentTab.isRenamed) return prevTabs;

      return prevTabs.map(tab => 
        tab.id === id ? { ...tab, title: newTitle, isRenamed: true } : tab
      );
    });
  };

  const handleResetTab = (id) => {
    // Reseta: Tira status de renomeado, incrementa versão (limpa form) e atribui novo número sequencial
    setTabs(prevTabs => {
      return prevTabs.map(tab => 
        tab.id === id ? { 
          ...tab, 
          title: `Credenciamento ${tabCounter}`, // Pega o próximo número disponível
          isRenamed: false, 
          version: tab.version + 1 
        } : tab
      );
    });
    setTabCounter(prev => prev + 1);
  };

  // Render a loading state while MSAL is being initialized
  if (!isMsalInitialized) {
    return <div className="loading-container">
      <h2>Inicializando Aplicação...</h2>
    </div>;
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
                    onClick={(e) => closeTab(tab.id, e)}
                    title="Fechar guia"
                >
                    &times;
                </button>
              </div>
            ))}
        </div>
        <button className="add-tab-btn" onClick={addTab} title="Nova Solicitação">+</button>
        <div className="auth-controls">
          {account ? (
            <>
              <span className="user-greeting">Olá, {account.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="auth-btn">
                Sair
              </button>
            </>
          ) : (
            <button onClick={handleLogin} className="auth-btn" disabled={isLoggingIn}>
              {isLoggingIn ? 'Entrando...' : 'Entrar'}
            </button>
          )}
        </div>
      </header>
      <main className="form-container-wrapper">
        {account ? (
          tabs.map(tab => (
            <div
              key={tab.id}
              className="tab-content"
              style={{ display: activeTabId === tab.id ? 'block' : 'none' }}
            >
              {/* O formulário permanece montado mesmo quando oculto, preservando os dados */}
              {/* A key combinando id e version força o reset completo do formulário quando version muda */}
              <CredenciamentoForm 
                key={`${tab.id}-${tab.version}`}
                onSuccess={() => handleResetTab(tab.id)} 
                onRename={(title) => handleRenameTab(tab.id, title)}
              />
            </div>
          ))
        ) : (
          <div className="login-prompt">
            <h2>Por favor, faça o login para iniciar o credenciamento.</h2>
            <button
              onClick={handleLogin}
              className="submit-btn"
              style={{ maxWidth: '400px', margin: '20px auto' }}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? 'Aguarde...' : 'Fazer Login'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
