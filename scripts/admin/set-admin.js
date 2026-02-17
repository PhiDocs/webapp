// Load environment variables from the .env file
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

// Import Firebase Admin config
const admin = require('firebase-admin');

// Avoid re-initializing the app
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
    console.error('Failed to initialize Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function setAdminRole(email, companyId) {
  if (!email) {
    console.error('Uso: node scripts/admin/set-admin.js "email.do.usuario@example.com" "[ID_DA_EMPRESA_OPCIONAL]"');
    return;
  }

  try {
    console.log(`Looking up user by email: ${email}...`);
    const user = await admin.auth().getUserByEmail(email);

    // Keep existing claims to avoid overwriting other data
    const existingClaims = (await admin.auth().getUser(user.uid)).customClaims || {};

    const newClaims = {
      ...existingClaims,
      role: 'admin',
    };

    if (companyId) {
      newClaims.companyId = companyId;
      console.log(`Setting claims { role: 'admin', companyId: '${companyId}' } for user ${user.uid}...`);
    } else {
      console.log(`Setting claim { role: 'admin' } for user ${user.uid}...`);
    }
    
    await admin.auth().setCustomUserClaims(user.uid, newClaims);
    
    console.log(`\n✅ Sucesso! O usuário "${user.displayName}" (${user.email}) agora é um administrador.`);
    if (companyId) {
        console.log(`Ele foi associado à empresa com ID: ${companyId}`);
    }
    console.log('Reminder: the user must log out and log in again for the change to take effect.');

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`\n❌ Error: No user found with email "${email}".`);
    } else {
      console.error('\n❌ Failed to set admin role:', error.message);
    }
  }
}

const userEmail = process.argv[2];
const companyId = process.argv[3]; // The third argument is companyId (optional)
setAdminRole(userEmail, companyId);
