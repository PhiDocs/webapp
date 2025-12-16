// Carrega as variáveis de ambiente do arquivo .env
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Importa a configuração do Firebase Admin
const admin = require('firebase-admin');

// Evita a reinicialização do app
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Falha na inicialização do Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function setAdminRole(email) {
  if (!email) {
    console.error('Uso: node scripts/set-admin.js "email.do.usuario@example.com"');
    return;
  }

  try {
    console.log(`Buscando usuário com o e-mail: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);

    console.log(`Definindo o custom claim { role: 'admin' } para o usuário ${user.uid}...`);
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    
    console.log(`\n✅ Sucesso! O usuário "${user.displayName}" (${user.email}) agora é um administrador.`);
    console.log("Lembre-se: o usuário precisa fazer logout e login novamente para que a alteração tenha efeito.");

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ Erro: Nenhum usuário encontrado com o e-mail "${email}".`);
    } else {
      console.error('\n❌ Falha ao definir o papel de admin:', error.message);
    }
  }
}

const userEmail = process.argv[2];
setAdminRole(userEmail);
