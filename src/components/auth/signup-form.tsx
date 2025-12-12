'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { signUp } from '@/server/auth-actions';

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignupValues) => {
    setIsLoading(true);
    const result = await signUp(values);

    if (result.error) {
      toast({
        variant: 'destructive',
        title: ptBr.toasts.errors.authError,
        description: result.error,
      });
    } else {
      toast({
        title: ptBr.toasts.success.signupSuccess,
        description: ptBr.toasts.success.signupSuccessDescription,
      });
      router.push('/login');
    }

    setIsLoading(false);
  };

  return (
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
                  {ptBr.actions.creatingAccount}
                </>
              ) : (
                ptBr.actions.createAccount
              )}
            </Button>
            <Button variant="link" asChild className="p-0 font-normal">
              <Link href="/login">{ptBr.actions.backToLogin}</Link>
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
