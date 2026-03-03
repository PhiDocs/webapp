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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { trackApiError, trackLoginSuccess } from '@/lib/telemetry/events';
import { reportClientError } from '@/lib/telemetry/crash-reporter';

// Moved here to avoid exporting from a 'use server' file
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
      // 1. Sign in on the client using the Firebase SDK
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // 2. Get the user's ID token
      const idToken = await user.getIdToken();

      // 3. Send the token to the server action to create the session cookie
      const result = await createSession(idToken);

      if (result.error) {
        throw new Error(result.error);
      }

      toast({
        title: ptBr.toasts.success.loginSuccess,
        description: ptBr.toasts.success.loginSuccessDescription,
      });
      trackLoginSuccess('email_password');

      // 4. Hard redirect to ensure the new session cookie is picked up by the proxy
      window.location.href = '/';


    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error?.message || 'Falha no login';
      trackApiError({ context: 'login_form_submit', message });
      reportClientError({
        source: 'manual',
        context: 'login_form_submit',
        message,
        stack: error?.stack,
        metadata: { code: error?.code ?? 'unknown' },
      });
      const friendlyMessage = getFirebaseAuthErrorMessage(error.code);
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
    <div className="flex w-full max-w-sm flex-col items-center justify-center gap-8">
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
