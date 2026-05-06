import { createSupabaseAdminClient } from '@/supabase/server';

export type UserData = {
    uid: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    companyId?: string | null;
}

export const UserRepository = {
    async create(userId: string, data: UserData): Promise<void> {
        const { error } = await createSupabaseAdminClient()
          .from('users')
          .upsert({
            ...data,
            uid: userId,
            createdAt: new Date().toISOString(),
          }, { onConflict: 'uid' });

        if (error) throw error;
    },

    async update(userId: string, data: { [key: string]: any }): Promise<void> {
        const { error } = await createSupabaseAdminClient()
          .from('users')
          .update(data)
          .eq('uid', userId);

        if (error) throw error;
    },

    async get(userId: string): Promise<UserData | null> {
        const { data, error } = await createSupabaseAdminClient()
          .from('users')
          .select('uid,name,email,role,companyId')
          .eq('uid', userId)
          .maybeSingle();

        if (error) throw error;
        return data as UserData | null;
    }
};
