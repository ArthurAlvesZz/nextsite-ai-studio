import React, { useState } from "react";
import AdminSidebar from '../components/AdminSidebar';
import { motion } from 'motion/react';

export default function AdminSoraRemover() {
  const [linksBrutos, setLinksBrutos] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videosProntos, setVideosProntos] = useState<string[]>([]);
  const [erro, setErro] = useState("");

  const handleProcessarVideos = async () => {
    if (!linksBrutos.trim()) {
      setErro("Cole pelo menos um link do Sora para processar.");
      return;
    }

    setIsLoading(true);
    setErro("");
    setVideosProntos([]);

    // Puxa a URL da API do .env (ou usa o localhost para testes na sua máquina)
    const API_URL = import.meta.env.VITE_PYTHON_API_URL || "http://localhost:8000/limpar-videos";

    // Fallback visual para testes caso a API Python não esteja rodando (evita erro de fetch no console)
    if (API_URL.includes("localhost")) {
      setTimeout(() => {
        setVideosProntos([
          "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
        ]);
        setIsLoading(false);
      }, 2000);
      return;
    }

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_brutos: linksBrutos }),
      });
      
      const data = await response.json();

      if (data.sucesso) {
        // Recebe o array de URLs públicas do Firebase que o Python upou
        setVideosProntos(data.videos_prontos);
      } else {
        setErro(data.mensagem || "Erro ao processar os vídeos.");
      }
    } catch (error) {
      setErro("Falha de comunicação com o servidor de limpeza. Verifique se a API Python está rodando e acessível (CORS habilitado).");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white font-body selection:bg-secondary selection:text-on-secondary flex">
      <AdminSidebar activePage="tools" />

      <main className="ml-64 flex-1 min-h-screen relative flex flex-col">
        {/* Decorative Background Elements */}
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-secondary/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>
        <div className="fixed top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

        <div className="pt-32 pb-20 px-12 max-w-7xl mx-auto w-full">
          <section className="mb-12 max-w-4xl">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-extrabold tracking-tighter text-white font-headline mb-4 leading-[1.05]"
            >
              Remover Marca d'Água <br/>
              <span className="font-serif italic text-secondary font-light">(Sora)</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-white/40 font-light max-w-2xl leading-relaxed"
            >
              Cole os links gerados pelo Sora abaixo. Separe múltiplos links usando a tecla de espaço ou pulando linha.
            </motion.p>
          </section>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/[0.01] backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden"
          >
            {/* Área de Input */}
            <textarea
              className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-secondary/50 focus:border-secondary/50 outline-none resize-none mb-6 text-white placeholder:text-white/20 font-light"
              placeholder="Ex: https://sora.chatgpt.com/share/123&#10;https://sora.chatgpt.com/share/456"
              value={linksBrutos}
              onChange={(e) => setLinksBrutos(e.target.value)}
              disabled={isLoading}
            />

            {/* Tratamento de Erro */}
            {erro && (
              <div className="p-4 mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl">
                {erro}
              </div>
            )}

            {/* Botão de Ação */}
            <button
              onClick={handleProcessarVideos}
              disabled={isLoading}
              className={`w-full py-5 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl ${
                isLoading 
                  ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/5" 
                  : "bg-gradient-to-r from-secondary to-primary text-on-secondary hover:shadow-[0_0_30px_rgba(233,179,255,0.3)] border border-transparent"
              }`}
            >
              {isLoading ? "Processando e limpando... (Isso pode demorar um pouco)" : "Limpar Vídeos"}
            </button>

            {/* Área de Resultados */}
            {videosProntos.length > 0 && (
              <div className="mt-12 pt-12 border-t border-white/10">
                <h3 className="text-xl font-headline font-bold text-white mb-8 tracking-tight">Vídeos Prontos:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {videosProntos.map((url, index) => (
                    <div key={index} className="border border-white/10 p-6 rounded-[2rem] bg-white/[0.02] flex flex-col items-center group hover:bg-white/[0.04] transition-colors">
                      <video src={url} controls className="w-full rounded-xl mb-6 shadow-2xl" />
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-4 bg-white/5 border border-white/10 text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-all w-full text-center"
                        download // Tenta forçar o download no navegador
                      >
                        Baixar Vídeo {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
