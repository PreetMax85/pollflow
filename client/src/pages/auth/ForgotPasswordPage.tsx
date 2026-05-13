import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useState } from "react";
import { BarChart3, Loader2, ArrowLeft, MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { authApi } from "@/api/auth";

const forgotSchema = z.object({
  email: z.email("Invalid email address format"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [mockLink, setMockLink] = useState<string | null>(null);

  const form = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ForgotFormValues) => {
    try {
      const res = await authApi.forgotPassword(values.email);
      if (res.data?.mockEmailContent) {
        setMockLink(res.data.mockEmailContent);
      }
      setSent(true);
      toast.success("Check your email for the reset link.");
    } catch {
      toast.error("Failed to send reset email. Please try again.");
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="landing-heading text-xl">Check your email</CardTitle>
            <CardDescription>
              If an account with that email exists, we've sent a password reset link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockLink && (
              <div className="rounded-md border bg-muted p-3 text-left text-xs text-muted-foreground break-all">
                <p className="mb-1 font-medium text-foreground">Mock email (dev mode):</p>
                <a href={mockLink} className="text-primary underline underline-offset-2">
                  {mockLink}
                </a>
              </div>
            )}
            <Button asChild variant="outline" className="w-full">
              <Link to="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="landing-heading text-2xl font-bold tracking-tight">PollFlow</h1>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="landing-heading text-xl">Forgot password?</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a reset link.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          autoFocus
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send reset link"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardContent className="pt-0">
            <Button asChild variant="link" className="w-full text-sm text-muted-foreground">
              <Link to="/auth/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
