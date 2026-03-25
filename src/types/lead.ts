export interface LeadColhido {
  id?: string;
  url: string;
  dominio: string;
  nicho: string;
  temMetaPixel: boolean;
  temGoogleAds: boolean;
  whatsapp: string | null;
  instagram: string | null;
  gruposWhatsApp: string[];
  cnpj: string | null;
  razaoSocial: string | null;
  capitalSocial: number | null;
  logo: string | null;
  abordagemWhatsApp: string | null;
  createdAt: any; // Timestamp
  createdBy: string;
  updatedBy?: string;
}

export const NICHOS = [
  "E-commerce",
  "Clínicas Premium",
  "iGaming",
  "Dropshipping",
  "Imobiliárias",
  "Advocacia",
  "Estética",
  "Odontologia",
  "Infoprodutos",
  "SaaS",
  "Agências de Marketing",
  "Energia Solar",
  "Contabilidade",
  "Arquitetura",
  "Engenharia",
  "Consultoria",
  "Educação",
  "Academias",
  "Restaurantes Delivery",
  "Petshops",
  "Oficinas Mecânicas",
  "Turismo",
  "Eventos",
  "Seguros",
  "Logística",
  "Indústria",
  "Moda",
  "Beleza",
  "Saúde",
  "Tecnologia"
];
