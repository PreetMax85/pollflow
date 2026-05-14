/**
 * @file src/pages/polls/CreatePollPage.tsx
 */

import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray, useFormContext } from "react-hook-form";
import type { Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { ControllerRenderProps } from "react-hook-form";
import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";
import { pollsApi } from "@/api/polls";

// ─── ToggleSwitch ─────────────────────────────────────────────────────────────
// Inline toggle — bypasses Radix UI to avoid data-state/data-checked CSS mismatch.

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
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

// ─── Schema ───────────────────────────────────────────────────────────────────

const MAX_OPTIONS = 6;

const optionSchema = z.object({
  text: z.string().min(1, "Option cannot be empty").max(300),
});

const questionSchema = z.object({
  text: z.string().min(3, "Question must be at least 3 characters").max(500),
  isRequired: z.boolean(),
  options: z.array(optionSchema).min(2, "At least 2 options required").max(MAX_OPTIONS),
});

const createPollSchema = z.object({
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

type CreatePollFormValues = z.infer<typeof createPollSchema>;

// ─── Question Item ────────────────────────────────────────────────────────────
// Uses useFormContext so it can read/write form state without prop-drilling.

interface QuestionItemProps {
  questionIndex: number;
  totalQuestions: number;
  control: Control<CreatePollFormValues, unknown, CreatePollFormValues>;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QuestionItem({
  questionIndex,
  totalQuestions,
  control,
  onRemove,
  onMoveUp,
  onMoveDown,
}: QuestionItemProps) {
  const [collapsed, setCollapsed] = useState(false);

  // ✅ useFormContext + watch/setValue — most reliable way to read/write boolean fields
  // Avoids Controller render-prop issues with Switch components
  const { watch, setValue } = useFormContext<CreatePollFormValues>();
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

          {totalQuestions > 1 && (
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
          {/* Question text */}
          <FormField
            control={control}
            name={`questions.${questionIndex}.text`}
            render={({
              field,
            }: {
              field: ControllerRenderProps<CreatePollFormValues, `questions.${number}.text`>;
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

          {/* Required toggle — plain Switch with watch/setValue, no FormField */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Required</p>
              <p className="text-xs text-muted-foreground">
                {isRequired ? "Respondent must answer this" : "Respondent can skip this"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRequired ? "default" : "secondary"} className="text-xs">
                {isRequired ? "On" : "Off"}
              </Badge>
              <ToggleSwitch
                checked={isRequired ?? true}
                onChange={(val) =>
                  setValue(`questions.${questionIndex}.isRequired`, val, { shouldDirty: true })
                }
              />
            </div>
          </div>

          {/* Options */}
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
                    CreatePollFormValues,
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatePollPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const defaultExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  const form = useForm<CreatePollFormValues>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      description: "",
      expiresAt: defaultExpiry,
      requiresAuth: false,
      isAnonymous: false,
      questions: [{ text: "", isRequired: true, options: [{ text: "" }, { text: "" }] }],
    },
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form;

  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
    move: moveQuestion,
  } = useFieldArray({ control, name: "questions" });

  // ✅ watch/setValue for top-level boolean switches — no Controller/FormField needed
  const requiresAuth = watch("requiresAuth");
  const isAnonymous = watch("isAnonymous");

  const onSubmit = async (values: CreatePollFormValues) => {
    try {
      const { description, ...rest } = values;
      const payload = {
        ...rest,
        ...(description ? { description } : {}),
        expiresAt: new Date(values.expiresAt).toISOString(),
        questions: values.questions.map((q, qi) => ({
          ...q,
          order: qi,
          options: q.options.map((o, oi) => ({ ...o, order: oi })),
        })),
      };

      const response = await pollsApi.create(payload);
      // ✅ Invalidate dashboard query so new poll appears immediately on back-navigate
      await queryClient.invalidateQueries({ queryKey: ["polls", "my"] });
      toast.success("Poll created!");
      // ✅ backend returns data: Poll directly
      navigate(`/polls/${response.data.id}/analytics`);
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create poll.";
      toast.error(message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="landing-heading text-2xl">Create a poll</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build your poll, set an expiry, and share the link.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Poll details */}
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
                  field: ControllerRenderProps<CreatePollFormValues, "title">;
                }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Team Lunch Preferences" {...field} />
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
                  field: ControllerRenderProps<CreatePollFormValues, "description">;
                }) => (
                  <FormItem>
                    <FormLabel>
                      Description{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add context for your respondents…"
                        rows={3}
                        {...field}
                      />
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
                  field: ControllerRenderProps<CreatePollFormValues, "expiresAt">;
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

          {/* Settings — plain Switch with watch/setValue */}
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
                <div className="flex items-center gap-2">
                  <Badge variant={requiresAuth ? "default" : "secondary"} className="text-xs">
                    {requiresAuth ? "On" : "Off"}
                  </Badge>
                  <ToggleSwitch
                    checked={requiresAuth}
                    onChange={(val) => setValue("requiresAuth", val, { shouldDirty: true })}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label>Anonymous responses</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Respondent identity is not stored
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isAnonymous ? "default" : "secondary"} className="text-xs">
                    {isAnonymous ? "On" : "Off"}
                  </Badge>
                  <ToggleSwitch
                    checked={isAnonymous}
                    onChange={(val) => setValue("isAnonymous", val, { shouldDirty: true })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
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

          {/* Submit */}
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
                  Creating…
                </>
              ) : (
                "Create poll"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
