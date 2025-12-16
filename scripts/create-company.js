// Este script precisa ser executado em um ambiente que entenda `require` e ES Modules (import).
// A forma mais simples é garantir que o projeto foi compilado (`npm run build`) e
// que o Node.js consegue resolver os módulos corretamente.

const path = require('path');
// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Importa a função da server action.
// NOTA: O caminho depende da estrutura do output da compilação do Next.js.
// Este caminho é um palpite e pode precisar de ajuste.
const { registerCompany } = require('../src/server/admin-actions.ts');

async function main() {
  if (process.argv.length < 6) {
    console.error('Uso: node scripts/create-company.js "Nome da Empresa" "email@admin.com" "Nome do Admin" "senhaForte"');
    process.exit(1);
  }

  const [, , companyName, adminEmail, adminName, adminPassword] = process.argv;

  console.log(`Registrando nova empresa: "${companyName}" com o administrador "${adminName}" (${adminEmail})`);

  try {
    const result = await registerCompany({
      companyName,
      adminEmail,
      adminName,
      adminPassword,
    });

    if (result.success) {
      console.log('\n✅ Empresa e administrador criados com sucesso!');
      console.log('Detalhes:', result.data);
    } else {
      console.error('\n❌ Falha ao registrar empresa:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Ocorreu um erro inesperado ao executar o script:', error);
  }
}

// Devido à forma como o Next.js lida com as server actions, executar este script
// diretamente pode ser complexo. A maneira mais robusta de usar `registerCompany`
// seria através de uma interface de "super-admin" dentro da própria aplicação.
//
// Para rodar este script, você pode precisar de uma ferramenta como `tsx` para
// transpilar o TypeScript em tempo de execução:
// npm install -g tsx
// tsx scripts/create-company.js "Minha Empresa" "admin@minhaempresa.com" "Admin" "senhaSegura123"

main();
