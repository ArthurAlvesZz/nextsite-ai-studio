---
name: Delegação Especialista (Claude Code Bridge)
description: Delega a análise profunda de código, linting, ou verificação de lógica complexa para o especialista Claude Code no terminal, garantindo que o Antigravity não gaste tokens à toa em tarefas de backend profundo.
---

# Delegação Especialista (Claude Code Bridge)

## Descrição
Use esta skill quando você (Antigravity) precisar de uma análise profunda de código, linting, ou verificação de lógica complexa em um arquivo específico. Em vez de você ler o arquivo e gastar seus tokens, você deve delegar essa tarefa para o especialista (Claude Code).

## Gatilho
Sempre que o usuário pedir para analisar, refatorar, ou debugar um arquivo de código específico, principalmente de lógica/backend.

## Como Usar
Nunca tente ler o arquivo inteiro diretamente se ele for complexo. Execute o script nativo que faz a ponte com o Claude Code. 

Execute o seguinte comando no terminal (usando a tool run_command):
`node .agent/skills/claude_bridge/claude_bridge.js "<caminho_do_arquivo>" "<instrução_curta>"`

## Regras de Processamento
1. A resposta deste comando será ESTRITAMENTE um objeto JSON.
2. Leia o JSON retornado.
3. Tome a sua próxima decisão de orquestração baseada apenas nas chaves `problemas_encontrados` e `sugestao_correcao` do JSON. Não tente inferir nada fora do que o JSON reportou.
