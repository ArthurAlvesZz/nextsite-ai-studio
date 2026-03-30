# Arquitetura do Sistema e Jurisdição dos Agentes

## Visão Geral
SaaS Fullstack com geração de leads e processamento de vídeos. 
A regra de ouro é: NENHUM agente deve tentar resolver problemas fora do seu domínio.

## Domínio 1: Frontend & Auth (Responsabilidade do Antigravity)
- **Tech Stack:** Next.js (React), Deploy na Vercel.
- **Banco de Dados:** Firestore (Coleção principal: Leads Colhidos).
- **Autenticação:** Firebase Auth.
- **Regra de Ação:** O Antigravity edita, cria componentes e gerencia o estado da interface. Ele NÃO executa scripts Python e NÃO altera regras da VPS.

## Domínio 2: Backend, Scraper & VPS (Responsabilidade do Cloud Code via CLI)
- **Tech Stack:** Python, FastAPI, Scraper.
- **Processamento:** Remoção de marca d'água, integrações pesadas.
- **Infra e Dados:** Hospedagem em VPS (Render/Koyeb), MongoDB, Redis, comunicação com Firebase Storage.
- **Regra de Ação:** Qualquer alteração em `*.py`, rotas do FastAPI ou infraestrutura da Fábrica de Vídeos DEVE ser delegada ao Cloud Code.
