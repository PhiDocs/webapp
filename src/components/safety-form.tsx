'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ChangeEvent } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import { formSchema } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, BookOpen, Building2, FileText, HardHat, MapPin, ShieldCheck, Siren, Users, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SafetyFormProps {
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  isFormSubmitted: boolean;
  onNewReport: () => void;
}

export function SafetyForm({ onSubmit, isLoading, isFormSubmitted, onNewReport }: SafetyFormProps) {
  const { toast } = useToast();

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: 'APR',
      companyName: '',
      workLocation: '',
      teamMembers: '',
      activityDescription: '',
    },
    mode: 'onChange',
  });
  
  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a logo smaller than 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('companyLogo', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };


  if (isFormSubmitted) {
    return (
       <Card className="w-full">
        <CardHeader>
          <CardTitle>Analysis Complete</CardTitle>
          <CardDescription>
            Your safety document analysis is ready on the right.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onNewReport} className="w-full" variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Start New Report
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Document Details</CardTitle>
        <CardDescription>
          All fields are required unless stated otherwise.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>
                    <FileText className="inline-block mr-2" /> Document Type
                  </FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="APR">APR</TabsTrigger>
                        <TabsTrigger value="APT">APT</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel><Building2 className="inline-block mr-2" /> Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyLogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Logo (Optional)</FormLabel>
                    <FormControl>
                       <Input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} />
                    </FormControl>
                    <FormDescription>Max 2MB. PNG or JPG.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><MapPin className="inline-block mr-2" /> Work Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Main construction site, Block A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teamMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Users className="inline-block mr-2" /> Team Members (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="List the names of team members involved, separated by commas."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><BookOpen className="inline-block mr-2" /> Activity Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the work activity in detail. For example: 'Installation of air conditioning pipes on the 3rd floor facade using scaffolding'."
                      className="resize-y min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Generating...' : 'Generate Analysis'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
