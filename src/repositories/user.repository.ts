import admin from '@/firebase/admin-config';

type UserData = {
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    companyId?: string; // Tornar opcional
}

const userCollection = admin.firestore().collection('users');

export const UserRepository = {
    /**
     * Create a new user document in Firestore.
     * @param userId - The Firebase Auth user UID.
     * @param data - The user data.
     */
    async create(userId: string, data: UserData): Promise<void> {
        await userCollection.doc(userId).set({
            ...data,
            createdAt: new Date().toISOString(),
        });
    },

    /**
     * Update a user document in Firestore.
     * @param userId - The user UID.
     * @param data - Fields to update.
     */
    async update(userId: string, data: { [key: string]: any }): Promise<void> {
        await userCollection.doc(userId).update(data);
    },

    /**
     * Fetch a user by UID.
     * @param userId - The user UID.
     * @returns The user data or null if not found.
     */
    async get(userId: string): Promise<UserData | null> {
        const doc = await userCollection.doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data() as UserData;
    }
};
