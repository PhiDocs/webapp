'use server';

import * as admin from 'firebase-admin';

// Evita a reinicialização do app em ambientes de desenvolvimento (hot-reloading)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // O valor de private_key precisa ser parseado corretamente
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.message);
    // Relança o erro para interromper a execução e deixar claro que a configuração falhou.
    // Isso é crucial para evitar o erro "default Firebase app does not exist".
    throw new Error(
      `Failed to initialize Firebase Admin SDK. Check your environment variables in .env file. Original error: ${error.message}`
    );
  }
}

export default admin;
