import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import type { ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getApiErrorMessage } from "@/lib/utils";

import { pollsApi } from "@/api/polls";
import type { Poll, ApiResponse } from "@/types";

// Schema

const MAX_OPTIONS = 6;

const optionSchema = z.object({
  text: z.string().min(1, "Option cannot be empty").max(300),
});

const questionSchema = z.object({
  text: z.string().min(3, "Question must be at least 3 characters").max(500),
  isRequired: z.boolean(),
  options: z
    .array(optionSchema)
    .min(2, "At least 2 options required")
    .max(MAX_OPTIONS, "A question can have at most 6 options"),
});

const editPollSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().max(1000).optional(),
  expiresAt: z
    .string()
    .min(1, "Expiry date is required")
    .refine((val) => new Date(val) > new Date(), "Expiry date must be in the future"),
  requiresAuth: z.boolean(),
  isAnonymous: z.boolean(),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
});

type EditPollFormValues = z.infer<typeof editPollSchema>;

// Page

export default function EditPollPage() {
  const { pollId } = useParams<{ pollId: string }>();
  const navigate = useNavigate();

  const {
    data: pollData,
    isLoading,
    isError,
  } = useQuery<ApiResponse<Poll>, Error>({
    queryKey: ["poll", pollId],
    queryFn: () => pollsApi.getById(pollId!),
    enabled: !!pollId,
  });

  const poll = pollData?.data;

  const form = useForm<EditPollFormValues>({
    resolver: zodResolver(editPollSchema),
    defaultValues: {
      title: "",
      description: "",
      expiresAt: "",
      requiresAuth: false,
      isAnonymous: false,
      questions: [{ text: "", isRequired: true, options: [{ text: "" }, { text: "" }] }],
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = form;

  useEffect(() => {
    if (!poll) return;
    reset({
      title: poll.title,
      description: poll.description ?? "",
      expiresAt: new Date(poll.expiresAt).toISOString().slice(0, 16),
      requiresAuth: poll.requiresAuth,
      isAnonymous: poll.isAnonymous,
      questions: poll.questions.map((q) => ({
        text: q.text,
        isRequired: q.isRequired,
        options: q.options.map((o) => ({ text: o.text })),
      })),
    });
  }, [poll, reset]);

  const { fields: questionFields } = useFieldArray({ control, name: "questions" });

  const onSubmit = async (values: EditPollFormValues) => {
    if (!pollId) return;
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        expiresAt: new Date(values.expiresAt).toISOString(),
      };
      if (values.description) payload.description = values.description;

      await pollsApi.update(pollId, payload);
      toast.success("Poll updated!");
      navigate("/dashboard");
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 403) toast.error("You don't have permission to edit this poll.");
      else toast.error(getApiErrorMessage(err, "Failed to update poll. Please try again."));
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <h2 className="text-lg font-semibold">Poll not found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          This poll doesn't exist or you don't have permission to edit it.
        </p>
        <Button variant="outline" asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="landing-heading text-2xl">Edit poll</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Changes apply immediately. Existing responses are preserved.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Poll details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={control}
                name="title"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<EditPollFormValues, "title">;
                }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Poll title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="description"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<EditPollFormValues, "description">;
                }) => (
                  <FormItem>
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="expiresAt"
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<EditPollFormValues, "expiresAt">;
                }) => (
                  <FormItem>
                    <FormLabel>Closes at</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        min={new Date().toISOString().slice(0, 16)}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Settings — read-only summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Require sign-in to respond</p>
                  <p className="text-xs text-muted-foreground">
                    Only authenticated users can submit responses
                  </p>
                </div>
                <Badge variant={watch("requiresAuth") ? "default" : "secondary"}>
                  {watch("requiresAuth") ? "On" : "Off"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Anonymous responses</p>
                  <p className="text-xs text-muted-foreground">Respondent identity is not stored</p>
                </div>
                <Badge variant={watch("isAnonymous") ? "default" : "secondary"}>
                  {watch("isAnonymous") ? "On" : "Off"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Settings are fixed at poll creation and cannot be changed.
              </p>
            </CardContent>
          </Card>

          {/* Questions — read-only summary */}
          <div className="space-y-3">
            <h2 className="landing-heading text-base">
              Questions{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({questionFields.length})
              </span>
            </h2>
            {questionFields.map((field, index) => (
              <Card key={field.id} className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {index + 1}. {field.text}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    {field.isRequired ? "Required" : "Optional"} &middot; {field.options.length}{" "}
                    options
                  </p>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-0.5">
                    {field.options.map((opt, oi) => (
                      <li key={oi}>{opt.text}</li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground">
              Questions cannot be changed after the poll is created. To update questions, create a
              new poll.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
