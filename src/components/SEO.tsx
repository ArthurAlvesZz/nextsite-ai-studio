import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  image?: string;
  url?: string;
}

export default function SEO({ title, description, image, url }: SEOProps) {
  const siteTitle = title.includes('Next Creatives') ? title : `${title} | Next Creatives`;
  const defaultDesc = 'Agência focada em produção de vídeos e conteúdo através de Inteligência Artificial para alavancar seu negócio.';
  const defaultImage = 'https://www.nextcreativestudio.com/og-banner.png';
  const defaultUrl = 'https://www.nextcreativestudio.com';

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={description || defaultDesc} />

      {/* Favicon — garante presença em 100% das rotas via Helmet */}
      <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
      <link rel="shortcut icon" href="/favicon.png" />

      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description || defaultDesc} />
      <meta property="og:image" content={image || defaultImage} />
      <meta property="og:url" content={url || defaultUrl} />
      <meta property="og:type" content="website" />
    </Helmet>
  );
}
