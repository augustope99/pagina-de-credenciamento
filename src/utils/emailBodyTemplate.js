/**
 * Gera o corpo do e-mail HTML exatamente como o Power Automate espera.
 * @param {Object} data - Dados do formulário (React Hook Form)
 * @param {string} visitorIp - IP do visitante
 * @param {string} visitorLocation - Localização do visitante
 */
export const generateEmailBody = (data, visitorIp, visitorLocation) => {
    const segmentos = Array.isArray(data.segmento) ? data.segmento.join(', ') : data.segmento;
    return `
        <h2>Novo Credenciamento - PERmite</h2>
        <table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">
            <tr style="background-color: #8B0000; color: white;"><th colspan="2" style="padding: 10px;">Dados do Cliente</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Razão Social:</td><td style="padding: 8px;">${data.razaoSocial || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Nome Fantasia:</td><td style="padding: 8px;">${data.nomeFantasia || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">CNPJ:</td><td style="padding: 8px;">${data.cnpj || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Código do Cliente:</td><td style="padding: 8px;">${data.codigoCliente || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Especialista/Executivo:</td><td style="padding: 8px;">${data.especialista || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Filial:</td><td style="padding: 8px;">${data.filial || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Marca:</td><td style="padding: 8px;">${data.marca || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Qtde de POS:</td><td style="padding: 8px;">${data.qtdePos || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Segmento:</td><td style="padding: 8px;">${segmentos || ''}</td></tr>
            <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Contato</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Principal Contato:</td><td style="padding: 8px;">${data.principalContato || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">E-mail:</td><td style="padding: 8px;">${data.email || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">WhatsApp:</td><td style="padding: 8px;">${data.whatsapp || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Quem Sugeriu:</td><td style="padding: 8px;">${data.quemSugeriu || ''}</td></tr>
            <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Endereço</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">CEP:</td><td style="padding: 8px;">${data.cep || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Logradouro:</td><td style="padding: 8px;">${data.logradouro || ''}, ${data.numero || ''} ${data.complemento || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Bairro:</td><td style="padding: 8px;">${data.bairro || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Cidade/UF:</td><td style="padding: 8px;">${data.cidade || ''} / ${data.uf || ''}</td></tr>
            <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Dados Bancários</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Banco:</td><td style="padding: 8px;">${data.nomeBanco || ''} (Cód: ${data.codigoBanco || ''})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Agência:</td><td style="padding: 8px;">${data.agencia || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Conta:</td><td style="padding: 8px;">${data.contaDigito || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Chave PIX:</td><td style="padding: 8px;">${data.chavePix || ''} (${data.tipoChavePix || ''})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Titular Conta:</td><td style="padding: 8px;">${data.razaoSocialConta || ''} (CNPJ: ${data.cnpjConta || ''})</td></tr>
            <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Condições Comerciais</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Antecipação Automática:</td><td style="padding: 8px;">${data.antecipacaoAutomatica || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Parcela Vendas:</td><td style="padding: 8px;">${data.parcelaVendas || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Custo por conta Estab.:</td><td style="padding: 8px;">${data.porContaEstabelecimento || ''}</td></tr>
            <tr style="background-color: #f0f0f0;"><th colspan="2" style="padding: 10px;">Outros</th></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Data de Envio:</td><td style="padding: 8px;">${data.dataRecebimento || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Tipo Credenciamento:</td><td style="padding: 8px;">${data.tipoCredenciamento || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Responsável Legal:</td><td style="padding: 8px;">${data.responsavelLegal || ''} (CPF: ${data.cpfResponsavel || ''})</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">IP Visitante:</td><td style="padding: 8px;">${visitorIp || ''}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Localização:</td><td style="padding: 8px;">${visitorLocation || ''}</td></tr>
        </table>
    `;
};
