import * as admin from 'firebase-admin';

// Avoid re-initializing the app in development (hot reloading)
if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('A variável de ambiente FIREBASE_PRIVATE_KEY não está definida. Verifique seu arquivo .env.');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error('Falha desconhecida ao inicializar o Firebase Admin SDK.');
    console.error('Falha na inicialização do Firebase Admin:', error.message);
    // Throw an error that can be caught elsewhere in the app if needed.
    throw new Error(
      `Falha ao inicializar o Firebase Admin SDK. Verifique suas variáveis de ambiente no arquivo .env. Erro original: ${error.message}`
    );
  }
}

export default admin;
