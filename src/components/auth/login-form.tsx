'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';

// Função movida para cá para não ser exportada de um arquivo 'use server'
const getFirebaseAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/invalid-email':
      return 'O formato do e-mail é inválido.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Tente uma mais forte.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciais inválidas. Verifique seu e-mail e senha.';
    default:
      return ptBr.errors.unexpectedError;
  }
};

export function LoginForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

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
      // 1. Fazer login no lado do cliente com o SDK do Firebase
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Obter o token de ID do usuário
      const idToken = await user.getIdToken();

      // 3. Enviar o token para a server action para criar o cookie de sessão
      const result = await createSession(idToken);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: ptBr.toasts.success.loginSuccess,
        description: ptBr.toasts.success.loginSuccessDescription,
      });

      // 4. Forçar um recarregamento completo para acionar o middleware
      window.location.href = '/';

    } catch (error: any) {
      console.error('Login failed:', error);
      const friendlyMessage = getFirebaseAuthErrorMessage(error.code);
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.authError,
        description: friendlyMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <div className="flex flex-col items-center m-32 gap-16 justify-center ">
        <div className="top-8 flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
                {ptBr.header.title}
            </h1>
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
