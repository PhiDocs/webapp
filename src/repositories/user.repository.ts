import { adminDb } from '@/firebase/admin-config';

type UserData = {
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    companyId: string;
}

const userCollection = adminDb.collection('users');

export const UserRepository = {
    /**
     * Cria um novo documento de usuário no Firestore.
     * @param userId - O UID do usuário do Firebase Auth.
     * @param data - Os dados do usuário.
     */
    async create(userId: string, data: UserData): Promise<void> {
        await userCollection.doc(userId).set({
            ...data,
            createdAt: new Date().toISOString(),
        });
    },

    /**
     * Atualiza dados de um documento de usuário no Firestore.
     * @param userId - O UID do usuário.
     * @param data - Os campos a serem atualizados.
     */
    async update(userId: string, data: { [key: string]: any }): Promise<void> {
        await userCollection.doc(userId).update(data);
    },

    /**
     * Busca um usuário pelo UID.
     * @param userId - O UID do usuário.
     * @returns Os dados do usuário ou null se não for encontrado.
     */
    async get(userId: string): Promise<UserData | null> {
        const doc = await userCollection.doc(userId).get();
        if (!doc.exists) {
            return null;
        }
        return doc.data() as UserData;
    }
};
