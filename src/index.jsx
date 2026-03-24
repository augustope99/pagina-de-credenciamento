import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useCnpjConsulta } from '../../hooks/useCnpjConsulta';
import { generateEmailBody } from '../../utils/emailBodyTemplate';
import { sendEmail } from '../../services/graphService';
import './styles.css';

// Componente reutilizável de Assinatura
const SignaturePad = ({ label, onSave, onClear }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
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
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    if (!clientX || !clientY) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

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

  const clear = () => {
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
          <button type="button" className="btn-clear-sig" onClick={clear}>
             Apagar e Assinar Novamente
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper para converter arquivo para base64
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result.split(',')[1]); // remove o prefixo 'data:...'
  reader.onerror = error => reject(error);
});

export default function CredenciamentoForm({ onSuccess, onRename }) {
  const { register, handleSubmit, setValue, watch, getValues, formState: { errors } } = useForm();
  const { consultarCnpj, status: complianceStatus, companyData, isLoading: isLoadingCnpj } = useCnpjConsulta();
  const [visitorInfo, setVisitorInfo] = useState({ ip: '', city: '' });
  const cnpjValue = watch('cnpj');

  useEffect(() => {
    fetch('https://ipinfo.io/json')
      .then(res => res.json())
      .then(data => setVisitorInfo({ ip: data.ip, city: `${data.city}, ${data.region}` }))
      .catch(err => console.error("Erro IP", err));
  }, []);

  // Função auxiliar de formatação
  const formatCNPJ = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  };

  const formatCEP = (value) => {
    return value
      .replace(/\D/g, '')
      .replace(/^(\d{5})(\d{3})/, "$1-$2");
  };

  useEffect(() => {
    if (companyData) {
      setValue('razaoSocial', companyData.razao_social);
      setValue('nomeFantasia', companyData.nome_fantasia || companyData.razao_social);
      
      // Formata e preenche CEP
      if (companyData.cep) {
        setValue('cep', formatCEP(String(companyData.cep)));
      }
      
      setValue('logradouro', companyData.logradouro);
      setValue('numero', companyData.numero);
      setValue('bairro', companyData.bairro);
      setValue('cidade', companyData.municipio);
      setValue('uf', companyData.uf);
      setValue('email', companyData.email);

      // Preenche CNPJ principal e da conta automaticamente
      if (companyData.cnpj) {
        const formattedCnpj = formatCNPJ(companyData.cnpj);
        setValue('cnpj', formattedCnpj);
        setValue('cnpjConta', formattedCnpj); // Preenche automaticamente o CNPJ da conta
      }

      // Tenta preencher nome do banco se disponível (depende da API, geralmente não vem, mas deixamos pronto)
      setValue('razaoSocialConta', companyData.razao_social);

      // Atualiza o nome da aba com a Razão Social
      if (onRename && companyData.razao_social) {
        onRename(companyData.razao_social);
      }
    }
  }, [companyData, setValue, onRename]);

  const handleValidateCnpj = () => {
    if(cnpjValue) consultarCnpj(cnpjValue);
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setValue('logradouro', data.logradouro);
          setValue('bairro', data.bairro);
          setValue('cidade', data.localidade);
          setValue('uf', data.uf);
          setValue('cep', formatCEP(cep));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP", error);
      }
    }
  };

  const onSubmit = async (data) => {
    try {
      // 1. Preparar anexos
      const attachments = [];

      // Comprovante bancário
      if (data.compBancario && data.compBancario.length > 0) {
        const file = data.compBancario[0];
        const contentBytes = await toBase64(file);
        attachments.push({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: file.name,
          contentType: file.type,
          contentBytes: contentBytes
        });
      }

      // Assinatura Subadquirente
      if (data.signatureSub) {
        attachments.push({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: "assinatura_subadquirente.png",
          contentType: "image/png",
          contentBytes: data.signatureSub.split(',')[1]
        });
      }

      // Assinatura Estabelecimento
      if (data.signatureEstab) {
        attachments.push({
          "@odata.type": "#microsoft.graph.fileAttachment",
          name: "assinatura_estabelecimento.png",
          contentType: "image/png",
          contentBytes: data.signatureEstab.split(',')[1]
        });
      }

      // 2. Gerar corpo do e-mail
      const htmlBody = generateEmailBody(data, visitorInfo.ip, visitorInfo.city);
      
      // 3. Enviar e-mail
      await sendEmail({
        to: "demo@example.com", 
        subject: "Novo - Credenciamento",
        body: htmlBody,
        attachments: attachments
      });

      alert("Formulário enviado com sucesso!");
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro no envio do formulário:", error);
      alert("Erro ao enviar: " + error.message);
    }
  };

  return (
    <div className="form-content">
      <form onSubmit={handleSubmit(onSubmit)} className="animate-form">
        {/* Validação Inicial de CNPJ (Acesso) */}
        <div className="form-group full-width" style={{ marginBottom: '20px' }}>
          <label htmlFor="cnpjCheck">CNPJ para Validação (Acesso) *</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              id="cnpjCheck"
              placeholder="00.000.000/0000-00"
              maxLength={18}
              {...register('cnpjCheck', { required: true })}
              onBlur={e => consultarCnpj(e.target.value)}
            />
            <button type="button" className="btn-validate" onClick={handleValidateCnpj} disabled={isLoadingCnpj}>
              {isLoadingCnpj ? '...' : 'Validar'}
            </button>
          </div>
          {complianceStatus.message && (
            <div className={`status-msg ${complianceStatus.type}`}>{complianceStatus.message}</div>
          )}
        </div>

        {/* Conteúdo restrito após validação do CNPJ */}
        {(complianceStatus.type === 'success' || complianceStatus.type === 'warning') && (
          <div className="form-grid fade-in">
            {/* Grupo Especialista/Qtde Equipamento */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="especialista">Especialista / Executivo *</label>
                <input type="text" id="especialista" {...register('especialista', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="qtdePos">Qtde equipamento(s) *</label>
                <div className="quantity-control">
                  <button 
                    type="button" 
                    className="qty-btn" 
                    onClick={() => {
                      const val = Number(getValues('qtdePos') || 0);
                      setValue('qtdePos', val > 0 ? val - 1 : 0);
                    }}
                  >
                    -
                  </button>
                  <input type="number" id="qtdePos" min={0} placeholder="1" {...register('qtdePos', { required: true })} className="qty-input" />
                  <button 
                    type="button" 
                    className="qty-btn" 
                    onClick={() => {
                      const val = Number(getValues('qtdePos') || 0);
                      setValue('qtdePos', val + 1);
                    }}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="filial">Filial *</label>
              <input type="text" id="filial" {...register('filial', { required: true })} />
            </div>

            {/* Grupo Marca/Código Cliente */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="marca">Marca *</label>
                <select id="marca" {...register('marca', { required: true })}>
                  <option value="">Selecione</option>
                  <option value="PARCEIRO_A">Parceiro A</option>
                  <option value="PARCEIRO_B">Parceiro B</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="codigoCliente">Código do Cliente *</label>
                <input type="text" id="codigoCliente" {...register('codigoCliente', { required: true })} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cnpj">CNPJ *</label>
              <input type="text" id="cnpj" maxLength={18} placeholder="00.000.000/0000-00" {...register('cnpj', { required: true })} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="razaoSocial">Razão Social *</label>
              <input type="text" id="razaoSocial" {...register('razaoSocial', { required: true })} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="nomeFantasia">Nome Fantasia *</label>
              <input type="text" id="nomeFantasia" {...register('nomeFantasia', { required: true })} />
            </div>

            {/* Segmento (checkbox) */}
            <div className="form-group full-width">
              <label htmlFor="segmento">Segmento *</label>
              <div className="checkbox-group">
                <input type="checkbox" id="segmento_auto" value="Auto Peças" {...register('segmento')} />
                <label htmlFor="segmento_auto">Auto Peças</label>
                <input type="checkbox" id="segmento_moto" value="Motopeças" {...register('segmento')} />
                <label htmlFor="segmento_moto">Motopeças</label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="cep">CEP *</label>
              <input type="text" id="cep" maxLength={9} placeholder="00000-000" {...register('cep', { required: true })} onBlur={handleCepBlur} />
            </div>
            <div className="form-group">
              <label htmlFor="logradouro">Logradouro *</label>
              <input type="text" id="logradouro" {...register('logradouro', { required: true })} />
            </div>

            {/* Número/Complemento */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="numero">Número *</label>
                <input type="text" id="numero" {...register('numero', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="complemento">Complemento</label>
                <input type="text" id="complemento" {...register('complemento')} />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="bairro">Bairro *</label>
              <input type="text" id="bairro" {...register('bairro', { required: true })} />
            </div>
            <div className="form-group">
              <label htmlFor="cidade">Cidade *</label>
              <input type="text" id="cidade" {...register('cidade', { required: true })} />
            </div>
            <div className="form-group">
              <label htmlFor="uf">UF *</label>
              <select id="uf" {...register('uf', { required: true })}>
                <option value="">Selecione</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="email">E-mail Principal *</label>
              <input type="email" id="email" {...register('email', { required: true })} />
            </div>
            <div className="form-group">
              <label htmlFor="quemSugeriu">Quem Sugeriu? *</label>
              <input type="text" id="quemSugeriu" {...register('quemSugeriu', { required: true })} />
            </div>
            <div className="form-group">
              <label htmlFor="principalContato">Principal Contato *</label>
              <input type="text" id="principalContato" {...register('principalContato', { required: true })} />
            </div>
            <div className="form-group">
              <label htmlFor="whatsapp">WhatsApp *</label>
              <input type="tel" id="whatsapp" maxLength={15} placeholder="(00) 00000-0000" {...register('whatsapp', { required: true })} />
            </div>

            {/* Telefones */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="telefone1">Telefone 1 (DDD/Número)</label>
                <input type="tel" id="telefone1" maxLength={15} placeholder="(00) 0000-0000" {...register('telefone1')} />
              </div>
              <div className="form-group">
                <label htmlFor="telefone2">Telefone 2 (DDD/Número)</label>
                <input type="tel" id="telefone2" maxLength={15} placeholder="(00) 0000-0000" {...register('telefone2')} />
              </div>
            </div>

            {/* Responsável Legal e Sócios */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="cpfResponsavel">CPF (Responsável Legal) *</label>
                <input type="text" id="cpfResponsavel" maxLength={14} placeholder="000.000.000-00" {...register('cpfResponsavel', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="responsavelLegal">Responsável Legal *</label>
                <input type="text" id="responsavelLegal" {...register('responsavelLegal', { required: true })} />
              </div>
            </div>

            {/* Sócios 2, 3, 4 */}
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="socio2">Sócio 2</label>
                <input type="text" id="socio2" {...register('socio2')} />
              </div>
              <div className="form-group">
                <label htmlFor="cpfSocio2">CPF (Sócio 2)</label>
                <input type="text" id="cpfSocio2" maxLength={14} placeholder="000.000.000-00" {...register('cpfSocio2')} />
              </div>
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="socio3">Sócio 3</label>
                <input type="text" id="socio3" {...register('socio3')} />
              </div>
              <div className="form-group">
                <label htmlFor="cpfSocio3">CPF (Sócio 3)</label>
                <input type="text" id="cpfSocio3" maxLength={14} placeholder="000.000.000-00" {...register('cpfSocio3')} />
              </div>
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="socio4">Sócio 4</label>
                <input type="text" id="socio4" {...register('socio4')} />
              </div>
              <div className="form-group">
                <label htmlFor="cpfSocio4">CPF (Sócio 4)</label>
                <input type="text" id="cpfSocio4" maxLength={14} placeholder="000.000.000-00" {...register('cpfSocio4')} />
              </div>
            </div>

            {/* Dados Bancários */}
            <div className="form-group full-width section-header">
              <h3>Dados Bancários do Estabelecimento</h3>
            </div>
            <div className="form-group full-width">
              <label htmlFor="razaoSocialConta">Razão Social da Conta Corrente *</label>
              <input type="text" id="razaoSocialConta" {...register('razaoSocialConta', { required: true })} />
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="cnpjConta">CNPJ do Titular da Conta *</label>
                <input type="text" id="cnpjConta" maxLength={18} placeholder="00.000.000/0000-00" {...register('cnpjConta', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="chavePix">Chave PIX (desta conta) *</label>
                <input type="text" id="chavePix" {...register('chavePix', { required: true })} />
              </div>
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="nomeBanco">Nome do Banco *</label>
                <input type="text" id="nomeBanco" {...register('nomeBanco', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="codigoBanco">Código do banco *</label>
                <input type="text" id="codigoBanco" {...register('codigoBanco', { required: true })} />
              </div>
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label htmlFor="agencia">Agência *</label>
                <input type="text" id="agencia" {...register('agencia', { required: true })} />
              </div>
              <div className="form-group">
                <label htmlFor="contaDigito">Conta/Dígito *</label>
                <input type="text" id="contaDigito" placeholder="00000-0" {...register('contaDigito', { required: true })} />
              </div>
            </div>
            <div className="form-group full-width">
              <label htmlFor="tipoChavePix">Tipo da Chave PIX *</label>
              <select id="tipoChavePix" {...register('tipoChavePix', { required: true })}>
                <option value="">Selecione</option>
                <option value="Celular">Celular</option>
                <option value="CNPJ">CNPJ</option>
                <option value="E-mail">E-mail</option>
                <option value="Aleatória">Aleatória</option>
              </select>
            </div>

            {/* Condições Comerciais */}
            <div className="form-group full-width section-header">
              <h3>Condições Comerciais</h3>
            </div>
            <div className="partner-group">
              <div className="form-group">
                <label>Antecipação Automática *</label>
                <div className="radio-group">
                  <input type="radio" id="antecipacao_sim" value="Sim" {...register('antecipacaoAutomatica', { required: true })} />
                  <label htmlFor="antecipacao_sim">Sim</label>
                  <input type="radio" id="antecipacao_nao" value="Não" {...register('antecipacaoAutomatica', { required: true })} />
                  <label htmlFor="antecipacao_nao">Não</label>
                </div>
              </div>
              <div className="form-group info-box-static">
                <label>Taxa Antecipação (%)</label>
                <p style={{ color: 'var(--color-primary-red)', fontWeight: 'bold', fontSize: '1.1rem', margin: '10px 0' }}>1,80% a.m.</p>
              </div>
            </div>
            <div className="form-group">
              <div className="date-input-wrapper">
                <label htmlFor="dataRecebimento">Data de Envio de Docs *</label>
                <input type="date" id="dataRecebimento" {...register('dataRecebimento', { required: true })} />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="tipoCredenciamento">Tipo Credenciamento *</label>
              <select id="tipoCredenciamento" {...register('tipoCredenciamento', { required: true })}>
                <option value="">Selecione</option>
                <option value="In loco">In loco</option>
                <option value="Correios">Correios</option>
              </select>
            </div>

            <div className="form-group full-width">
              <div className="checkbox-group" style={{ marginTop: '10px' }}>
                <input 
                  type="checkbox" 
                  id="aceiteTermos" 
                  {...register('aceiteTermos', { required: "Você deve ler e aceitar os termos de adesão para prosseguir." })} 
                />
                <label htmlFor="aceiteTermos">Declaro que li e aceito os termos de adesão ao SISTEMA PERmite *</label>
              </div>
              {errors.aceiteTermos && <span className="status-msg error">{errors.aceiteTermos.message}</span>}
            </div>

            {/* Campos ocultos para informações do visitante */}
            <input type="hidden" {...register('visitorIp')} value={visitorInfo.ip} />
            <input type="hidden" {...register('visitorLocation')} value={visitorInfo.city} />
            <input type="hidden" {...register('accessTime')} value={new Date().toLocaleString()} />

            {/* Upload de comprovante bancário */}
            <div className="upload-section">
              <label htmlFor="compBancario" className="upload-label">Comprovante bancário</label>
              <input type="file" id="compBancario" {...register('compBancario')} accept="image/*,.pdf" />
              <div className="file-name"></div>
            </div>

            {/* Assinaturas Obrigatórias (Agora no final) */}
            <div className="form-group full-width section-header" style={{marginTop: '40px'}}>
              <h3>Assinaturas Digitais Obrigatórias</h3>
            </div>
            
            <div className="partner-group">
              <SignaturePad 
                label="Assinatura SUBADQUIRENTE *" 
                onSave={(val) => setValue('signatureSub', val, { shouldValidate: true })}
                onClear={() => setValue('signatureSub', '', { shouldValidate: true })}
              />
              <SignaturePad 
                label="Assinatura ESTABELECIMENTO *" 
                onSave={(val) => setValue('signatureEstab', val, { shouldValidate: true })}
                onClear={() => setValue('signatureEstab', '', { shouldValidate: true })}
              />
            </div>

            {/* Inputs ocultos para validação das assinaturas */}
            <div className="form-group">
               <input type="hidden" {...register('signatureSub', { required: "Assinatura do Subadquirente é obrigatória" })} />
               {errors.signatureSub && <span className="status-msg error">{errors.signatureSub.message}</span>}
               
               <input type="hidden" {...register('signatureEstab', { required: "Assinatura do Estabelecimento é obrigatória" })} />
               {errors.signatureEstab && <span className="status-msg error">{errors.signatureEstab.message}</span>}
            </div>

            <div className="button-container">
              <button type="submit" className="submit-btn">Enviar Documentos</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
