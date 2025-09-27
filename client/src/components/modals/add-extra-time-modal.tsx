import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, AlertTriangle } from "lucide-react";

const addExtraTimeSchema = z.object({
  additionalMinutes: z.number().min(1, "Must add at least 1 minute").max(120, "Cannot add more than 120 minutes"),
});

type AddExtraTimeForm = z.infer<typeof addExtraTimeSchema>;

interface AddExtraTimeModalProps {
  examId: number | null;
  examTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function AddExtraTimeModal({
  examId,
  examTitle,
  isOpen,
  onClose,
}: AddExtraTimeModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddExtraTimeForm>({
    resolver: zodResolver(addExtraTimeSchema),
    defaultValues: {
      additionalMinutes: 5,
    },
  });

  const addExtraTimeMutation = useMutation({
    mutationFn: async (data: AddExtraTimeForm) => {
      if (!examId) throw new Error("No exam ID provided");
      const response = await apiRequest("PUT", `/api/exams/${examId}/add-time`, data);
      return response as any; // The response is already parsed by apiRequest
    },
    onSuccess: (data: any) => {
      toast({
        title: "Extra Time Added",
        description: `Successfully added ${data.addedMinutes} minutes to the exam. Total extra time: ${data.totalExtraTime} minutes.`,
      });
      
      // Invalidate exam data to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId] });
      
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to add extra time to exam",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const handleSubmit = async (data: AddExtraTimeForm) => {
    setIsSubmitting(true);
    addExtraTimeMutation.mutate(data);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Add Extra Time
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {examTitle && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Exam: {examTitle}
              </p>
            </div>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium">Emergency Use Only</p>
                <p className="mt-1">
                  This will immediately add extra time to all students currently taking this exam.
                  Use only in emergencies or unforeseen circumstances.
                </p>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="additionalMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        min="1"
                        max="120"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-additional-minutes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="button-add-time"
                >
                  {isSubmitting ? "Adding..." : "Add Extra Time"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}