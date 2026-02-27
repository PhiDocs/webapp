// To run this script, use: npm run remove-activity-description
// Or: tsx scripts/migrations/remove-activity-description.ts
import 'dotenv/config';
import admin from '../../src/firebase/admin-config';
import { adminDb as db } from '../../src/firebase/admin-firestore';

/**
 * Removes the `activityDescription` field from all documents in the 'works' collection.
 */
async function removeActivityDescriptionFromWorks() {
  console.log('\nStarting migration to remove "activityDescription" from works...');
  const worksRef = db.collection('works');
  const snapshot = await worksRef.get();
  
  if (snapshot.empty) {
    console.log('Collection "works" is empty. No migration needed.');
    return;
  }

  const batch = db.batch();
  let updatedCount = 0;

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.activityDescription !== undefined) {
      batch.update(doc.ref, {
        activityDescription: admin.firestore.FieldValue.delete()
      });
      updatedCount++;
      console.log(`  - Scheduling removal of activityDescription from works/${doc.id}`);
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`✅ Successfully removed activityDescription from ${updatedCount} documents in "works".`);
  } else {
    console.log('No documents had activityDescription field. Nothing to remove.');
  }
}

async function main() {
  console.log('--- Starting Firestore Migration Script ---');
  console.log('This script removes the "activityDescription" field from works collection.');
  
  try {
    await removeActivityDescriptionFromWorks();
    console.log('\n--- Migration Complete ---');
  } catch (error) {
    console.error('\n❌ An error occurred during migration:', error);
    process.exit(1);
  }
}

main();
