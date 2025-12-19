// To run this script, use: tsx scripts/migrate-deleted-at.ts
import 'dotenv/config';
import admin from '../src/firebase/admin-config';

const db = admin.firestore();

/**
 * Migrates a top-level collection by adding `deletedAt: null` to documents
 * where the field is missing.
 * @param collectionName The name of the collection to migrate.
 */
async function migrateTopLevelCollection(collectionName: string) {
  console.log(`\nStarting migration for "${collectionName}" collection...`);
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`Collection "${collectionName}" is empty. No migration needed.`);
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.deletedAt === undefined) {
      batch.update(doc.ref, { deletedAt: null });
      updatedCount++;
      console.log(`  - Scheduling update for ${collectionName}/${doc.id}`);
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`✅ Successfully migrated ${updatedCount} documents in "${collectionName}".`);
  } else {
    console.log(`No documents needed migration in "${collectionName}".`);
  }
}

/**
 * Migrates subcollections within all companies.
 * @param subcollectionName The name of the subcollection to migrate (e.g., 'employees').
 */
async function migrateSubcollections(subcollectionName: string) {
  console.log(`\nStarting migration for all "${subcollectionName}" subcollections...`);
  const companiesRef = db.collection('companies');
  const companiesSnapshot = await companiesRef.get();

  if (companiesSnapshot.empty) {
    console.log("No companies found. Skipping subcollection migration.");
    return;
  }

  let totalUpdatedCount = 0;

  for (const companyDoc of companiesSnapshot.docs) {
    const subcollectionRef = companyDoc.ref.collection(subcollectionName);
    const snapshot = await subcollectionRef.get();

    if (snapshot.empty) {
      continue; // Skip if subcollection is empty
    }

    const batch = db.batch();
    let subUpdatedCount = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.deletedAt === undefined) {
        batch.update(doc.ref, { deletedAt: null });
        subUpdatedCount++;
        console.log(`  - Scheduling update for companies/${companyDoc.id}/${subcollectionName}/${doc.id}`);
      }
    });

    if (subUpdatedCount > 0) {
      await batch.commit();
      console.log(`  ✅ Migrated ${subUpdatedCount} documents in "${subcollectionName}" for company ${companyDoc.id}.`);
      totalUpdatedCount += subUpdatedCount;
    }
  }

  if (totalUpdatedCount > 0) {
    console.log(`✅ Successfully migrated a total of ${totalUpdatedCount} documents across all "${subcollectionName}" subcollections.`);
  } else {
    console.log(`No documents needed migration in any "${subcollectionName}" subcollections.`);
  }
}


async function main() {
  console.log("--- Starting Firestore Migration Script ---");
  console.log("This script will add 'deletedAt: null' to documents missing this field.");
  
  try {
    // Migrate top-level collections
    await migrateTopLevelCollection('works');
    
    // Migrate subcollections
    await migrateSubcollections('employees');
    await migrateSubcollections('jobRoles');
    await migrateSubcollections('subcontractors');
    
    console.log("\n--- Migration Complete ---");
  } catch (error) {
    console.error("\n❌ An error occurred during migration:", error);
    process.exit(1);
  }
}

main();
