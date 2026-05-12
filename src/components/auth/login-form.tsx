'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginSchema, type LoginValues } from '@/lib/types';
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
import { createSession } from '@/server/auth-actions';
import { Logo } from '../icons/logo';
import { createSupabaseBrowserClient } from '@/supabase/browser';

const getSupabaseAuthErrorMessage = (message?: string): string => {
  if (!message) return ptBr.errors.unexpectedError;
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Credenciais inválidas. Verifique seu e-mail e senha.';
  }
  return message;
};

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error || !data.session) {
        throw error ?? new Error('Sessão Supabase não retornada.');
      }

      const result = await createSession({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: ptBr.toasts.success.loginSuccess,
        description: ptBr.toasts.success.loginSuccessDescription,
      });

      window.location.href = '/reports';


    } catch (error: any) {
      console.error('Login failed:', error);
      const friendlyMessage = getSupabaseAuthErrorMessage(error.message);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.authError,
        description: friendlyMessage,
      });
      setIsLoading(false);
    }
    // setIsLoading(false) is removed here to keep the login screen blocked until redirect.
  };

  return (
    <>
    <div className="flex flex-col items-center m-32 gap-16 justify-center ">
        <div className="top-8 flex items-center gap-3">
            <Logo className="h-auto w-[260px]" />
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{ptBr.auth.loginTitle}</CardTitle>
            <CardDescription>{ptBr.auth.loginDescription}</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ptBr.auth.email}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={ptBr.auth.emailPlaceholder}
                          {...field}
                        />
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
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {ptBr.actions.loggingIn}
                    </>
                  ) : (
                    ptBr.actions.login
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
}
