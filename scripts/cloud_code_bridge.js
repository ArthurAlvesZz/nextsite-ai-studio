const { execSync } = require('child_process');

const escopo = process.argv[2]; // ex: "backend/api/main.py"
const instrucao = process.argv[3]; // ex: "Adicione uma nova rota para processar vídeos"

if (!escopo || !instrucao) {
    console.error(JSON.stringify({ erro: "Escopo ou instrução faltando." }));
    process.exit(1);
}

const promptEspecialista = `
[ATUAÇÃO: BACKEND PYTHON/VPS]
Você está alterando os arquivos em: ${escopo}
Tarefa: ${instrucao}

REGRA DE ECONOMIA DE TOKENS (CRÍTICO):
1. Execute as alterações necessárias no código do escopo.
2. Não explique o que você fez. Não gere markdown. Não converse.
3. Sua saída no terminal DEVE SER ÚNICA E EXCLUSIVAMENTE um objeto JSON válido no seguinte formato:
{"status": "sucesso|erro", "arquivos_modificados": ["lista"], "endpoints_atualizados": [{"metodo": "POST", "rota": "/exemplo"}], "resumo_para_o_frontend": "O que o Next.js precisa saber?"}
`;

try {
    // Ajuste "cloudcode" para o comando CLI exato da sua ferramenta (como o claude code)
    const comando = `claude -p "${promptEspecialista.replace(/"/g, '\\"')}"`;
    const resultado = execSync(comando, { encoding: 'utf-8', stdio: 'pipe' });
    
    const jsonStart = resultado.indexOf('{');
    const jsonEnd = resultado.lastIndexOf('}') + 1;
    const jsonLimpo = resultado.slice(jsonStart, jsonEnd);
    
    console.log(jsonLimpo);

} catch (error) {
    console.log(JSON.stringify({ status: "erro", detalhes: error.message }));
}
