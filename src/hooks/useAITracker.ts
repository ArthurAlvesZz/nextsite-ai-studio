import { useCallback } from 'react';

export function useAITracker() {
  const trackError = useCallback(async (error: Error, componentStack?: string) => {
    try {
      // Pega o UID do usuário caso esteja no localStorage ou em algum cookie, para ser resiliente a quebras no contexto do React.
      const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      let userId = null;
      if (rawUser) {
        try {
          userId = JSON.parse(rawUser)?.uid || null;
        } catch (e) {
          // Ignore parse errors if user data is malformed
        }
      }

      const payload = {
        url: window.location.href,
        componentStack: componentStack || null,
        message: error.message,
        stackTrace: error.stack || null,
        timestamp: new Date().toISOString(),
        userId: userId
      };

      // Tenta enviar o erro silenciosamente para o backend de logs
      await fetch('/api/system/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
    } catch (e) {
      // Falha silenciosa para não causar loop de erros
      console.error('Falha ao registrar log de erro na IA Tracker', e);
    }
  }, []);

  return { trackError };
}
