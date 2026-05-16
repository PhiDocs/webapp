'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signupSchema, type SignupValues } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { Logo } from '../icons/logo';
import { createSupabaseBrowserClient } from '@/supabase/browser';
import { syncSignupProfile } from '@/server/auth-actions';
import { PhoneInput } from '@/components/ui/phone-input';
import { cleanPhone } from '@/lib/utils/phone-validator';

const getSupabaseSignupErrorMessage = (message?: string): string => {
  if (!message) return ptBr.errors.unexpectedError;

  const normalized = message.toLowerCase();
  if (normalized.includes('user already registered')) {
    return 'Este e-mail já está cadastrado.';
  }
  if (normalized.includes('password should be at least')) {
    return ptBr.validations.passwordMinLength;
  }

  return message;
};

export function SignupForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
    },
  });

  const onSubmit = async (values: SignupValues) => {
    setIsLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const emailRedirectTo = `${window.location.origin}/login`;

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo,
          data: {
            name: values.name,
            phone: values.phone ? cleanPhone(values.phone) : undefined,
          },
        },
      });

      if (error || !data.user) {
        throw error ?? new Error('Falha ao criar conta.');
      }

      const shouldSyncProfile =
        data.user.email?.toLowerCase() === values.email.toLowerCase() && Boolean(data.user.id);

      if (shouldSyncProfile) {
        const syncResult = await syncSignupProfile({
          uid: data.user.id,
          name: values.name,
          phone: values.phone,
        });

        if (syncResult.error) {
          throw new Error(syncResult.error);
        }
      }

      toast({
        title: ptBr.toasts.success.signupSuccess,
        description: ptBr.toasts.success.signupSuccessDescription,
      });

      router.push('/login');
    } catch (error: any) {
      const friendlyMessage = getSupabaseSignupErrorMessage(error.message);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.authError,
        description: friendlyMessage,
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center m-32 gap-16 justify-center ">
      <div className="top-8 flex items-center gap-3">
        <Logo className="h-auto w-[260px]" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{ptBr.auth.signupTitle}</CardTitle>
          <CardDescription>{ptBr.auth.signupDescription}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ptBr.auth.name}</FormLabel>
                    <FormControl>
                      <Input placeholder={ptBr.auth.namePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ptBr.auth.email}</FormLabel>
                    <FormControl>
                      <Input placeholder={ptBr.auth.emailPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ptBr.auth.phone}</FormLabel>
                    <FormControl>
                      <PhoneInput placeholder={ptBr.auth.phonePlaceholder} value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ptBr.auth.password}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={ptBr.auth.passwordPlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{ptBr.auth.confirmPassword}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={ptBr.auth.confirmPasswordPlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {ptBr.actions.creatingAccount}
                  </>
                ) : (
                  ptBr.actions.createAccount
                )}
              </Button>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                {ptBr.actions.goToLogin}
              </Link>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
