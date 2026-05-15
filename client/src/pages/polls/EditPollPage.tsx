import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
import type { Control, ControllerRenderProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PlusCircle, Trash2, ArrowUp, ArrowDown, Loader2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { cn, getApiErrorMessage } from "@/lib/utils";

import { pollsApi } from "@/api/polls";
import type { Poll, ApiResponse } from "@/types";

// ToggleSwitch 

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

// Schema

const MAX_OPTIONS = 6;

const optionSchema = z.object({
  text: z.string().min(1, "Option cannot be empty").max(300),
});

const questionSchema = z.object({
  text: z.string().min(3, "Question must be at least 3 characters").max(500),
  isRequired: z.boolean(),
  options: z.array(optionSchema).min(2, "At least 2 options required").max(MAX_OPTIONS, "A question can have at most 6 options"),
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

// Question Item

interface QuestionItemProps {
  questionIndex: number;
  totalQuestions: number;
  control: Control<EditPollFormValues, unknown, EditPollFormValues>;
  onRemove: () => void;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QuestionItem({ questionIndex, totalQuestions, control, onRemove, canRemove, onMoveUp, onMoveDown }: QuestionItemProps) {
  const [collapsed, setCollapsed] = useState(false);

  // useFormContext gives access to watch/setValue without prop-drilling
  const { watch, setValue } = useFormContext<EditPollFormValues>();
  const isRequired = watch(`questions.${questionIndex}.isRequired`);

  const {
    fields: optionFields,
    append: appendOption,
    remove: removeOption,
  } = useFieldArray({ control, name: `questions.${questionIndex}.options` });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-1.5">
          {/* Up/Down reorder */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={onMoveUp}
              disabled={questionIndex === 0}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-5 w-5"
              onClick={onMoveDown}
              disabled={questionIndex === totalQuestions - 1}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>

          <CardTitle className="text-sm font-medium flex-1">Question {questionIndex + 1}</CardTitle>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>

          {canRemove && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-4">
          <FormField
            control={control}
            name={`questions.${questionIndex}.text`}
            render={({
              field,
            }: {
              field: ControllerRenderProps<EditPollFormValues, `questions.${number}.text`>;
            }) => (
              <FormItem>
                <FormLabel className="text-xs">Question text</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. What is your favourite feature?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Required toggle — plain ToggleSwitch via useFormContext */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">
                {isRequired ? "Respondent must answer this" : "Respondent can skip this"}
              </p>
            </div>
            <ToggleSwitch
              checked={isRequired ?? true}
              onChange={(val) =>
                setValue(`questions.${questionIndex}.isRequired`, val, { shouldDirty: true })
              }
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              Options <span className="text-muted-foreground">(min. 2, max. {MAX_OPTIONS})</span>
            </Label>
            {optionFields.map((optionField, optionIndex) => (
              <FormField
                key={optionField.id}
                control={control}
                name={`questions.${questionIndex}.options.${optionIndex}.text`}
                render={({
                  field,
                }: {
                  field: ControllerRenderProps<
                    EditPollFormValues,
                    `questions.${number}.options.${number}.text`
                  >;
                }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input placeholder={`Option ${optionIndex + 1}`} {...field} />
                        {optionFields.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeOption(optionIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full border-dashed"
              onClick={() => appendOption({ text: "" })}
              disabled={optionFields.length >= MAX_OPTIONS}
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              {optionFields.length >= MAX_OPTIONS ? `Max ${MAX_OPTIONS} options` : "Add option"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

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
    setValue,
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

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
    move: moveQuestion,
  } = useFieldArray({ control, name: "questions" });

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

          {/* Settings — ToggleSwitch with watch/setValue directly, no FormField needed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Require sign-in to respond</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Only authenticated users can submit responses
                  </p>
                </div>
                <ToggleSwitch
                  checked={watch("requiresAuth")}
                  onChange={(val) => setValue("requiresAuth", val, { shouldDirty: true })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Anonymous responses</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Respondent identity is not stored
                  </p>
                </div>
                <ToggleSwitch
                  checked={watch("isAnonymous")}
                  onChange={(val) => setValue("isAnonymous", val, { shouldDirty: true })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h2 className="landing-heading text-base">
              Questions{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({questionFields.length})
              </span>
            </h2>
            {questionFields.map((field, index) => (
              <QuestionItem
                key={field.id}
                questionIndex={index}
                totalQuestions={questionFields.length}
                control={control}
                onRemove={() => removeQuestion(index)}
                canRemove={questionFields.length > 1}
                onMoveUp={() => moveQuestion(index, index - 1)}
                onMoveDown={() => moveQuestion(index, index + 1)}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={() =>
                appendQuestion({
                  text: "",
                  isRequired: true,
                  options: [{ text: "" }, { text: "" }],
                })
              }
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add question
            </Button>
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
