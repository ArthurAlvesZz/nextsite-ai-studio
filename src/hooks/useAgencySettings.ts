import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export interface PortfolioCase {
  videoSrc: string;
  tituloDaCampanha: string;
  metricaPrincipal: string;
  descricao: string;
  cliente: string;
}

export interface WorkflowStep {
  title: string;
  description: string;
}

export interface AgencySettings {
  heroTitle: string;
  heroDescription: string;
  preloaderVideoUrl: string;
  portfolioCases: PortfolioCase[];
  transformationPanel1Image: string;
  transformationPanel3Video: string;
  workflowSteps: WorkflowStep[];
  whatsappMockupImage1: string;
  whatsappMockupImage2: string;
}

const DEFAULT_SETTINGS: AgencySettings = {
  heroTitle: "O fim do conteúdo estático. <br /> O início da sua autoridade.",
  heroDescription: "Transformamos espectadores em compradores através do audiovisual de elite. Cinematografia de precisão aliada a estratégias agressivas para tornar a sua marca impossível de ser ignorada.",
  preloaderVideoUrl: "https://res.cloudinary.com/dluewhspe/video/upload/v1774133524/Airbrush-video-enhancer-result-1774133456324_wmuvyn.mp4",
  portfolioCases: [
    {
      videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      tituloDaCampanha: "SaaS Elite",
      metricaPrincipal: "+40% ROI",
      descricao: "Vídeos cinematográficos aplicados em funis de alta performance para o mercado B2B.",
      cliente: "@saas_elite"
    },
    {
      videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      tituloDaCampanha: "Moda & E-commerce",
      metricaPrincipal: "2.5x ROAS",
      descricao: "Storytelling visual que transforma a percepção da marca e gera desejo imediato.",
      cliente: "@fashion_luxury"
    },
    {
      videoSrc: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      tituloDaCampanha: "Infoprodutos",
      metricaPrincipal: "12M Views",
      descricao: "Conteúdo viral estratégico para lançamentos de sete dígitos.",
      cliente: "@expert_digital"
    }
  ],
  transformationPanel1Image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&q=80&w=800",
  transformationPanel3Video: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  workflowSteps: [
    {
      title: "Briefing Estratégico",
      description: "Você define o objetivo e o tom da marca. Nós cuidamos do resto."
    },
    {
      title: "Geração de Ativos",
      description: "Nossos motores de IA criam visuais ultra-realistas que seriam impossíveis em um set tradicional."
    },
    {
      title: "Entrega de Impacto",
      description: "Vídeos prontos para dominar o tráfego e elevar o ROI da sua operação."
    }
  ],
  whatsappMockupImage1: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=400",
  whatsappMockupImage2: "https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&q=80&w=400"
};

export function useAgencySettings() {
  const [settings, setSettings] = useState<AgencySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If no user is logged in, use 'global' settings for the public landing page.
    // If a user is logged in, use their specific settings.
    const docId = auth.currentUser ? auth.currentUser.uid : 'global';
    const docRef = doc(db, 'settings', docId);
    
    // Initialize default settings if they don't exist
    const initSettings = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists() && auth.currentUser) {
          try {
            await setDoc(docRef, DEFAULT_SETTINGS);
          } catch (writeError) {
            console.warn("Could not initialize default settings:", writeError);
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, `settings/${docId}`);
      }
    };
    
    initSettings();

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AgencySettings);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `settings/${docId}`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const updateSettings = async (newSettings: Partial<AgencySettings>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    try {
      const docRef = doc(db, 'settings', auth.currentUser.uid);
      await setDoc(docRef, { ...settings, ...newSettings }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `settings/${auth.currentUser.uid}`);
      throw error;
    }
  };

  return { settings, updateSettings, loading };
}
