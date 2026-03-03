import { useCallback } from 'react';
import type { AuditLog, EntidadeTipo } from '@/types';

// Simulação de armazenamento local para logs de auditoria
// Em produção, isso será substituído por chamadas ao Supabase
let auditLogs: AuditLog[] = [];

export function useAuditLog() {
  const registrarLog = useCallback((
    entidadeTipo: EntidadeTipo,
    entidadeId: string,
    acao: string,
    statusAnterior?: string,
    statusNovo?: string,
    detalhes?: Record<string, unknown>
  ) => {
    // Obter informações do usuário atual (mock)
    const usuarioAtual = {
      id: 'user_001',
      nome: 'VALDOMIRO', // Em produção, virá do contexto de autenticação
    };

    const novoLog: AuditLog = {
      id: `log_${Date.now()}`,
      entidadeTipo,
      entidadeId,
      acao,
      statusAnterior,
      statusNovo,
      usuarioId: usuarioAtual.id,
      usuarioNome: usuarioAtual.nome,
      dataHora: new Date(),
      detalhes,
    };

    auditLogs.push(novoLog);
    
    console.log('[AUDIT LOG]', novoLog);
    
    return novoLog;
  }, []);

  const buscarLogs = useCallback((
    entidadeTipo?: EntidadeTipo,
    entidadeId?: string
  ): AuditLog[] => {
    return auditLogs.filter(log => {
      if (entidadeTipo && log.entidadeTipo !== entidadeTipo) return false;
      if (entidadeId && log.entidadeId !== entidadeId) return false;
      return true;
    }).sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, []);

  const limparLogs = useCallback(() => {
    auditLogs = [];
  }, []);

  return {
    registrarLog,
    buscarLogs,
    limparLogs,
  };
}

// Hook para exibir timeline de auditoria
export function useAuditTimeline(entidadeTipo: EntidadeTipo, entidadeId: string) {
  const { buscarLogs } = useAuditLog();
  
  const logs = buscarLogs(entidadeTipo, entidadeId);
  
  return { logs };
}
