import { getFirestore } from 'firebase-admin/firestore';
import admin from '@/firebase/admin-config';

const firestoreDatabaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

export const adminDb = getFirestore(admin.app(), firestoreDatabaseId);
export const adminDbId = firestoreDatabaseId;
