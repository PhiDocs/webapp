import { createSupabaseAdminClient } from '@/supabase/server';

export type UserData = {
    uid: string;
    name: string;
    email: string;
    phone?: string | null;
    role: 'admin' | 'user';
    companyId?: string | null;
}

function isMissingPhoneColumn(error: any) {
    const message = `${error?.message || ''} ${error?.details || ''}`;
    return message.includes('users.phone') || message.includes("column 'phone'") || message.includes('column phone');
}

function withoutPhone<T extends Record<string, any>>(data: T) {
    const { phone, ...rest } = data;
    return rest;
}

export const UserRepository = {
    async create(userId: string, data: UserData): Promise<void> {
        const supabase = createSupabaseAdminClient();
        const payload = {
            ...data,
            uid: userId,
            createdAt: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('users')
          .upsert(payload, { onConflict: 'uid' });

        if (error && isMissingPhoneColumn(error)) {
            const { error: fallbackError } = await supabase
              .from('users')
              .upsert(withoutPhone(payload), { onConflict: 'uid' });

            if (fallbackError) throw fallbackError;
            return;
        }

        if (error) throw error;
    },

    async update(userId: string, data: { [key: string]: any }): Promise<void> {
        const supabase = createSupabaseAdminClient();
        const { error } = await supabase
          .from('users')
          .update(data)
          .eq('uid', userId);

        if (error && isMissingPhoneColumn(error)) {
            const { error: fallbackError } = await supabase
              .from('users')
              .update(withoutPhone(data))
              .eq('uid', userId);

            if (fallbackError) throw fallbackError;
            return;
        }

        if (error) throw error;
    },

    async get(userId: string): Promise<UserData | null> {
        const supabase = createSupabaseAdminClient();
        const { data, error } = await supabase
          .from('users')
          .select('uid,name,email,phone,role,companyId')
          .eq('uid', userId)
          .maybeSingle();

        if (error && isMissingPhoneColumn(error)) {
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('users')
              .select('uid,name,email,role,companyId')
              .eq('uid', userId)
              .maybeSingle();

            if (fallbackError) throw fallbackError;
            return fallbackData ? ({ ...fallbackData, phone: null } as UserData) : null;
        }

        if (error) throw error;
        return data as UserData | null;
    },

    /**
     * Quem se cadastrou e ainda nao pertence a nenhuma empresa.
     *
     * O cadastro cria o usuario com companyId nulo de proposito: ele fica
     * parado em /awaiting-company ate um admin liberar. Sem esta lista, a
     * unica forma de liberar alguem era editar o banco na mao.
     */
    async listSemEmpresa(): Promise<UserData[]> {
        const supabase = createSupabaseAdminClient();
        const { data, error } = await supabase
          .from('users')
          .select('uid,name,email,role,companyId')
          .is('companyId', null)
          .order('email');

        if (error) throw error;
        return (data ?? []).map((linha) => ({ ...linha, phone: null })) as UserData[];
    },

    async listByCompany(companyId: string): Promise<UserData[]> {
        const supabase = createSupabaseAdminClient();
        const { data, error } = await supabase
          .from('users')
          .select('uid,name,email,role,companyId')
          .eq('companyId', companyId)
          .order('email');

        if (error) throw error;
        return (data ?? []).map((linha) => ({ ...linha, phone: null })) as UserData[];
    },
};
