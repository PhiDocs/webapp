// To run this script, use: npx tsx scripts/migrations/migrate-signer-emails.ts
import 'dotenv/config';
import admin from '../../src/firebase/admin-config';

const db = admin.firestore();

/**
 * Migra a coleção signatureDocuments para adicionar o campo signerEmails
 * (array plano de e-mails para consulta com array-contains no Firestore).
 * Também garante que os campos phone e signingUrl existam nos signers.
 */
async function migrateSignatureDocuments() {
  console.log('\n--- Migração: signatureDocuments → signerEmails ---\n');

  const collectionRef = db.collection('signatureDocuments');
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log('Coleção signatureDocuments está vazia. Nenhuma migração necessária.');
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updatePayload: Record<string, any> = {};

    // Adicionar signerEmails se não existir
    if (!data.signerEmails) {
      const signers = data.signers || [];
      const emails = signers
        .map((s: any) => s.email?.toLowerCase())
        .filter(Boolean);
      updatePayload.signerEmails = emails;
    }

    // Garantir que cada signer tenha phone e signingUrl (mesmo que undefined)
    if (data.signers && Array.isArray(data.signers)) {
      let signersUpdated = false;
      const updatedSigners = data.signers.map((s: any) => {
        const updated = { ...s };
        if (updated.phone === undefined) {
          updated.phone = '';
          signersUpdated = true;
        }
        if (updated.signingUrl === undefined) {
          updated.signingUrl = '';
          signersUpdated = true;
        }
        return updated;
      });

      if (signersUpdated) {
        updatePayload.signers = updatedSigners;
      }
    }

    if (Object.keys(updatePayload).length > 0) {
      batch.update(doc.ref, updatePayload);
      updatedCount++;
      console.log(`  - Atualizando signatureDocuments/${doc.id} (campos: ${Object.keys(updatePayload).join(', ')})`);
    }
  }

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\n✅ ${updatedCount} documento(s) atualizado(s) com sucesso.`);
  } else {
    console.log('Nenhum documento necessitou de migração.');
  }
}

async function main() {
  console.log('=== Script de Migração: signerEmails ===');

  try {
    await migrateSignatureDocuments();
    console.log('\n=== Migração concluída ===');
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

main();
