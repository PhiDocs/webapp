// This script must run in an environment that supports `require` and ES Modules (import).
// The simplest way is to ensure the project is built (`npm run build`) and
// that Node.js can resolve the modules correctly.

const path = require('path');
// Load environment variables from the .env file
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Import the server action function.
// NOTE: The path depends on the Next.js build output structure.
// This path is a guess and may need adjustments.
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

// Due to how Next.js handles server actions, running this script directly can be tricky.
// The most robust way to use `registerCompany` is via a "super-admin" interface in the app.
//
// To run this script, you may need a tool like `tsx` to transpile TypeScript at runtime:
// npm install -g tsx
// tsx scripts/create-company.js "My Company" "admin@mycompany.com" "Admin" "securePassword123"

main();
