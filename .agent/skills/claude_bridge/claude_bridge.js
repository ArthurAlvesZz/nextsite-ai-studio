const { execSync } = require('child_process');

const arquivoParaAnalisar = process.argv[2];
const instrucaoEspecialista = process.argv[3] || "Analise o código e aponte erros.";

if (!arquivoParaAnalisar) {
    console.error(JSON.stringify({ erro: "Nenhum arquivo fornecido para análise." }));
    process.exit(1);
}

// O segredo da economia de tokens está neste prompt rígido para o Claude Code
const promptClaude = `
Tarefa: ${instrucaoEspecialista}
Arquivo: ${arquivoParaAnalisar}
Regra Crítica: Retorne ESTRITAMENTE um objeto JSON válido. NENHUMA palavra fora do JSON. Nenhuma formatação markdown (\`\`\`json).
Formato esperado: {"status": "sucesso|erro", "problemas_encontrados": ["lista"], "sugestao_correcao": "código curto"}
`;

try {
    // Executa o Claude Code no terminal via CLI
    // O parâmetro --print garante que ele jogue o output no stdout
    const comando = `claude -p "${promptClaude.replace(/"/g, '\\"')}"`;
    const resultado = execSync(comando, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Tenta fazer o parse para garantir que o Claude não quebrou a regra
    const jsonLimpo = JSON.parse(resultado.trim());
    
    // Devolve apenas o JSON limpo para o Antigravity ler
    console.log(JSON.stringify(jsonLimpo));

} catch (error) {
    // Se o Claude falhar ou não retornar JSON, devolvemos um erro curto
    console.log(JSON.stringify({
        status: "falha_execucao",
        mensagem: "O especialista falhou ou não retornou um JSON válido."
    }));
}
