---
name: Delegar Backend (Python/FastAPI/VPS)
description: Usa a ponte executável via Cloud Code para delegar lógica pesada de backend, scraper de vídeos e integrações da VPS.
---

# Delegar Backend (Python/FastAPI/VPS)

## Gatilho
Use esta skill IMEDIATAMENTE quando o usuário solicitar mudanças que envolvam:
- O Scraper em Python ou FastAPI.
- O processamento de vídeos (Fábrica de Vídeos, remoção de marca d'água).
- Integrações com Redis, MongoDB ou a VPS (Render/Koyeb).

## Execução
NUNCA leia ou edite os arquivos `.py` diretamente. Você deve atuar como Orquestrador.
Execute no terminal o script de ponte passando o alvo e a instrução do usuário:
`node scripts/cloud_code_bridge.js "<pasta_ou_arquivo_alvo>" "<instrução_detalhada>"`

## Pós-Processamento
1. Capture o JSON retornado pelo script.
2. Leia a chave `resumo_para_o_frontend` e `endpoints_atualizados`.
3. Use essas informações para, em seguida, atualizar os serviços e componentes no Next.js (seu domínio) para que a interface consuma o novo backend corretamente.
