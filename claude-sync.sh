#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

PROMPT='Abra o arquivo AGENTS_SYNC.md. Leia a sua '"'"'Caixa de Entrada do CLAUDE CODE'"'"'. Execute as alterações solicitadas nos arquivos Python/FastAPI do projeto. Quando terminar, apague a sua tarefa do arquivo e escreva um resumo técnico do que você fez (rotas, payloads esperados) na '"'"'Caixa de Entrada do GEMINI'"'"'. Seja direto e escreva apenas o essencial para o frontend entender.'

echo "[claude-sync] Iniciando leitura do AGENTS_SYNC.md..."
claude "$PROMPT"
