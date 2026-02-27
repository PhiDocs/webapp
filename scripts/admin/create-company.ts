// To run: npx tsx scripts/admin/create-company.ts "Nome da Empresa" "email@admin.com" "Nome do Admin" "senhaForte"
import 'dotenv/config';
import { z } from 'zod';
import admin from '../../src/firebase/admin-config';
import { adminDb as db } from '../../src/firebase/admin-firestore';

const registerCompanySchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório.'),
  adminEmail: z.string().email('O e-mail do administrador é inválido.'),
  adminName: z.string().min(1, 'O nome do administrador é obrigatório.'),
  adminPassword: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres.'),
});

async function main() {
  if (process.argv.length < 6) {
    console.error('Uso: npx tsx scripts/admin/create-company.ts "Nome da Empresa" "email@admin.com" "Nome do Admin" "senhaForte"');
    process.exit(1);
  }

  const [, , companyName, adminEmail, adminName, adminPassword] = process.argv;

  const validation = registerCompanySchema.safeParse({ companyName, adminEmail, adminName, adminPassword });
  if (!validation.success) {
    console.error('❌ Dados inválidos:', validation.error.flatten().fieldErrors);
    process.exit(1);
  }

  console.log(`\nRegistrando nova empresa: "${companyName}" com o administrador "${adminName}" (${adminEmail})\n`);

  try {
    // 1. Criar a empresa
    const companyRef = await db.collection('companies').add({
      name: companyName,
      createdAt: new Date().toISOString(),
    });
    const companyId = companyRef.id;
    console.log(`✅ Empresa criada: ${companyId}`);

    // 2. Criar o usuário no Firebase Auth
    const adminAuth = admin.auth();
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      emailVerified: true,
      password: adminPassword,
      displayName: adminName,
    });
    const userId = userRecord.uid;
    console.log(`✅ Usuário criado no Auth: ${userId}`);

    // 3. Definir custom claims (role + companyId)
    await adminAuth.setCustomUserClaims(userId, {
      role: 'admin',
      companyId,
    });
    console.log(`✅ Custom claims definidas: role=admin, companyId=${companyId}`);

    // 4. Salvar o usuário no Firestore
    const joinedAt = new Date().toISOString();
    await db.collection('users').doc(userId).set({
      uid: userId,
      email: adminEmail,
      name: adminName,
      role: 'admin',
      companyId,
      activeCompanyId: companyId,
      memberships: [{
        companyId,
        role: 'admin',
        status: 'active',
        joinedAt,
      }],
      createdAt: joinedAt,
    });
    console.log(`✅ Usuário salvo no Firestore`);

    console.log('\n🎉 Empresa e administrador criados com sucesso!');
    console.log(`   Empresa: ${companyName} (${companyId})`);
    console.log(`   Admin: ${adminName} (${adminEmail})`);
    console.log(`   UID: ${userId}`);
  } catch (error) {
    console.error('\n❌ Erro:', error);
    process.exit(1);
  }
}

main();
