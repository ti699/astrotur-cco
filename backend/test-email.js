#!/usr/bin/env node

/**
 * Script de teste para validar configuração de email
 * Uso: npm run test:email
 */

require('dotenv').config();
const { enviarRelatorioPlan } = require('./config/email');

// Relatório de exemplo para teste
const relatorioDeTeste = {
  data: new Date().toLocaleDateString('pt-BR'),
  data_geracao: new Date(),
  usuario_id: 1,
  observacoes: 'Este é um email de teste da configuração de email do Sistema CCO',
  estatisticas: {
    total_ocorrencias: 5,
    concluidas: 3,
    em_andamento: 1,
    pendentes: 1,
    com_atraso: 1,
    com_troca_veiculo: 0
  },
  ocorrencias: [
    {
      numero_ocorrencia: '001',
      cliente_nome: 'Cliente Teste 1',
      tipo_quebra: 'Motor',
      status: 'concluido'
    },
    {
      numero_ocorrencia: '002',
      cliente_nome: 'Cliente Teste 2',
      tipo_quebra: 'Suspensão',
      status: 'em_andamento'
    },
    {
      numero_ocorrencia: '003',
      cliente_nome: 'Cliente Teste 3',
      tipo_quebra: 'Elétrica',
      status: 'pendente'
    }
  ]
};

async function testarEmail() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('🔍 TESTE DE CONFIGURAÇÃO DE EMAIL - Sistema CCO');
  console.log('═'.repeat(60));
  console.log('\n');
  
  console.log('📧 Credenciais Detectadas:');
  console.log(`   HOST: ${process.env.EMAIL_HOST || '❌ NÃO CONFIGURADO'}`);
  console.log(`   PORT: ${process.env.EMAIL_PORT || '❌ NÃO CONFIGURADO'}`);
  console.log(`   USER: ${process.env.EMAIL_USER || '❌ NÃO CONFIGURADO'}`);
  console.log(`   FROM: ${process.env.EMAIL_FROM || '❌ NÃO CONFIGURADO'}\n`);

  // Validação
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ ERRO: Credenciais de email não configuradas!\n');
    console.log('📋 SOLUÇÃO:');
    console.log('   1. Edite o arquivo: backend/.env');
    console.log('   2. Configure as seguintes variáveis:\n');
    console.log('      EMAIL_HOST=smtp.gmail.com');
    console.log('      EMAIL_PORT=587');
    console.log('      EMAIL_SECURE=false');
    console.log('      EMAIL_USER=seu-email@gmail.com');
    console.log('      EMAIL_PASSWORD=sua-app-password (16 caracteres com espaços)');
    console.log('      EMAIL_FROM=noreply@astroturviagens.com\n');
    console.log('   3. Verifique o arquivo: GMAIL_CONFIG_PASSO_A_PASSO.md\n');
    process.exit(1);
  }

  console.log('📤 Enviando email de teste...');
  console.log('   Aguarde 5-10 segundos...\n');

  const resultado = await enviarRelatorioPlan(relatorioDeTeste, 'Email de teste da configuração');

  if (resultado.sucesso) {
    console.log('\n');
    console.log('✅ '.padEnd(60, '═'));
    console.log('✅  EMAIL ENVIADO COM SUCESSO!');
    console.log('✅ '.padEnd(60, '═'));
    console.log('\n');
    console.log(`📧 Message ID: ${resultado.messageId}`);
    console.log('✅ Sua configuração de email está funcionando corretamente!\n');
    console.log('🎉 Você pode usar a função "Finalizar Plantão" normalmente!\n');
    console.log('═'.repeat(60));
    console.log('\n');
  } else {
    console.log('\n');
    console.log('❌ '.padEnd(60, '═'));
    console.log('❌  ERRO AO ENVIAR EMAIL');
    console.log('❌ '.padEnd(60, '═'));
    console.log('\n');
    console.log('📋 Erro Recebido:');
    console.log(`   ${resultado.erro}\n`);
    console.log('💡 SUGESTÕES DE SOLUÇÃO:\n');
    
    if (resultado.erro.includes('Invalid login')) {
      console.log('   ❌ Credenciais inválidas (EMAIL_USER ou EMAIL_PASSWORD)');
      console.log('   ✅ Solução:');
      console.log('      1. Gere uma nova "Senha de app" em:');
      console.log('         https://myaccount.google.com/apppasswords');
      console.log('      2. Certifique-se de que 2FA está ativado em sua conta');
      console.log('      3. Use os 16 caracteres com espaços (ex: abcd efgh ijkl mnop)\n');
    } else if (resultado.erro.includes('ENOTFOUND') || resultado.erro.includes('ECONNREFUSED')) {
      console.log('   ❌ Não conseguiu conectar ao servidor SMTP');
      console.log('   ✅ Solução:');
      console.log('      1. Verifique sua conexão com internet');
      console.log('      2. Verifique se EMAIL_HOST=smtp.gmail.com');
      console.log('      3. Verifique se EMAIL_PORT=587\n');
    } else if (resultado.erro.includes('2FA') || resultado.erro.includes('Two-factor')) {
      console.log('   ❌ Autenticação em 2 fatores não está ativada');
      console.log('   ✅ Solução:');
      console.log('      1. Ative 2FA em: https://myaccount.google.com/');
      console.log('      2. Confirme seu telefone');
      console.log('      3. Gere uma "Senha de app" após ativar 2FA\n');
    } else {
      console.log('   ❌ Erro desconhecido ao enviar email');
      console.log('   ✅ Sugestões gerais:');
      console.log('      1. Verifique o arquivo: GMAIL_CONFIG_PASSO_A_PASSO.md');
      console.log('      2. Confirme todas as variáveis de ambiente em .env');
      console.log('      3. Tente gerar uma nova "Senha de app"\n');
    }
    
    console.log('📚 Documentação:');
    console.log('   - GMAIL_CONFIG_PASSO_A_PASSO.md (guia completo)');
    console.log('   - EMAIL_SETUP.md (alternativas)\n');
    console.log('═'.repeat(60));
    console.log('\n');
  }

  process.exit(resultado.sucesso ? 0 : 1);
}

testarEmail().catch(err => {
  console.error('\n❌ Erro crítico:', err.message);
  process.exit(1);
});

