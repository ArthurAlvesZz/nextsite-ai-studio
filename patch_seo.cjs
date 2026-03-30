const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const filesToPatch = {
    "EmployeeProfile.tsx": "Perfil do Funcionário",
    "AdminVideos.tsx": "Vídeos",
    "AdminTools.tsx": "Ferramentas",
    "AdminSoraRemover.tsx": "Sora Remover",
    "AdminSettings.tsx": "Configurações",
    "AdminSales.tsx": "Vendas",
    "AdminProfile.tsx": "Meu Perfil",
    "AdminNextZap.tsx": "NextZap",
    "AdminClients.tsx": "Clientes"
};

for (const [filename, title] of Object.entries(filesToPatch)) {
    const filePath = path.join(pagesDir, filename);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Skip if already has SEO
    if (content.includes('<SEO')) {
        console.log(`Skipping ${filename} (already has SEO)`);
        continue;
    }

    // 1. Add import
    // Insert after the first import React...
    content = content.replace(/(import React.*?;\r?\n)/, `$1import SEO from '../components/SEO';\n`);

    // 2. Add <SEO title="..." /> just before <AdminSidebar
    content = content.replace(/(<AdminSidebar)/, `<SEO title="${title}" />\n      $1`);

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${filename}`);
}
