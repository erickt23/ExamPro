import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const createAdminQuestionSchema = z.object({
  title: z.string().optional(),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(["multiple_choice", "short_answer", "essay", "fill_blank", "matching", "ranking", "drag_drop"]),
  category: z.enum(["exam", "homework"]),
  subjectId: z.number().min(1, "Subject is required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  bloomsTaxonomy: z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]).optional(),
  points: z.number().min(1, "Points must be at least 1"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  visibilityType: z.enum(["all_instructors", "specific_instructors"]),
  authorizedInstructorIds: z.array(z.string()).optional(),
});

type CreateAdminQuestionForm = z.infer<typeof createAdminQuestionSchema>;

interface CreateAdminQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateAdminQuestionModal({ open, onOpenChange }: CreateAdminQuestionModalProps) {
  const { toast } = useToast();
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);

  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: open,
  });

  const instructors = users.filter(user => user.role === 'instructor');

  const form = useForm<CreateAdminQuestionForm>({
    resolver: zodResolver(createAdminQuestionSchema),
    defaultValues: {
      questionType: "multiple_choice",
      category: "exam",
      difficulty: "medium",
      points: 1,
      visibilityType: "all_instructors",
      options: ["", "", "", ""],
      authorizedInstructorIds: [],
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: CreateAdminQuestionForm) => {
      await apiRequest("POST", "/api/admin/questions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      toast({
        title: "Success",
        description: "Question created successfully",
      });
      onOpenChange(false);
      form.reset();
      setSelectedInstructors([]);
    },
    onError: (error) => {
      console.error("Error creating question:", error);
      toast({
        title: "Error",
        description: "Failed to create question",
        variant: "destructive",
      });
    },
  });

  const questionType = form.watch("questionType");
  const visibilityType = form.watch("visibilityType");

  const onSubmit = (data: CreateAdminQuestionForm) => {
    if (data.visibilityType === "specific_instructors") {
      data.authorizedInstructorIds = selectedInstructors;
    } else {
      data.authorizedInstructorIds = [];
    }

    // Format options for multiple choice
    if (data.questionType === "multiple_choice" && data.options) {
      data.options = data.options.filter(option => option.trim() !== "");
    }

    createQuestionMutation.mutate(data);
  };

  const addInstructor = (instructorId: string) => {
    if (!selectedInstructors.includes(instructorId)) {
      setSelectedInstructors([...selectedInstructors, instructorId]);
    }
  };

  const removeInstructor = (instructorId: string) => {
    setSelectedInstructors(selectedInstructors.filter(id => id !== instructorId));
  };

  const getInstructorName = (instructorId: string) => {
    const instructor = instructors.find(i => i.id === instructorId);
    return instructor ? `${instructor.firstName} ${instructor.lastName}` : instructorId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Admin Question</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Question title..." {...field} data-testid="input-question-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="questionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-question-type">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        <SelectItem value="matching">Matching</SelectItem>
                        <SelectItem value="ranking">Ranking</SelectItem>
                        <SelectItem value="drag_drop">Drag & Drop</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your question..."
                      className="min-h-[100px]"
                      {...field}
                      data-testid="textarea-question-text"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {questionType === "multiple_choice" && (
              <div className="space-y-2">
                <FormLabel>Answer Options</FormLabel>
                {form.watch("options")?.map((_, index) => (
                  <FormField
                    key={index}
                    control={form.control}
                    name={`options.${index}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder={`Option ${index + 1}`}
                            {...field}
                            data-testid={`input-option-${index}`}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="exam">Exam Questions</SelectItem>
                        <SelectItem value="homework">Homework Questions</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subject">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-points"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bloomsTaxonomy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bloom's Taxonomy (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-blooms">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="remember">Remember</SelectItem>
                        <SelectItem value="understand">Understand</SelectItem>
                        <SelectItem value="apply">Apply</SelectItem>
                        <SelectItem value="analyze">Analyze</SelectItem>
                        <SelectItem value="evaluate">Evaluate</SelectItem>
                        <SelectItem value="create">Create</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="visibilityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question Visibility</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-visibility">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all_instructors">All Instructors</SelectItem>
                        <SelectItem value="specific_instructors">Specific Instructors Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose whether all instructors can see this question or only specific ones.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {visibilityType === "specific_instructors" && (
                <div className="space-y-3">
                  <FormLabel>Authorized Instructors</FormLabel>
                  <Select onValueChange={addInstructor}>
                    <SelectTrigger data-testid="select-add-instructor">
                      <SelectValue placeholder="Add instructor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {instructors
                        .filter(instructor => !selectedInstructors.includes(instructor.id))
                        .map((instructor) => (
                          <SelectItem key={instructor.id} value={instructor.id}>
                            {instructor.firstName} {instructor.lastName} ({instructor.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedInstructors.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedInstructors.map((instructorId) => (
                        <Badge key={instructorId} variant="secondary" className="flex items-center gap-1">
                          {getInstructorName(instructorId)}
                          <X
                            className="w-3 h-3 cursor-pointer"
                            onClick={() => removeInstructor(instructorId)}
                            data-testid={`remove-instructor-${instructorId}`}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="correctAnswer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter correct answer..." {...field} data-testid="input-correct-answer" />
                  </FormControl>
                  <FormDescription>
                    For multiple choice, enter the letter (A, B, C, D). For other types, enter the expected answer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Explain the correct answer..."
                      {...field}
                      data-testid="textarea-explanation"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createQuestionMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                data-testid="button-create-question"
              >
                {createQuestionMutation.isPending ? "Creating..." : "Create Question"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}