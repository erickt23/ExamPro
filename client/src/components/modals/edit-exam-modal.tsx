import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Search, X, Minus } from "lucide-react";
import CreateSubjectModal from "./create-subject-modal";

const editExamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  subjectId: z.number().min(1, "Subject is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  totalPoints: z.number().min(1, "Total points must be at least 1"),
  attemptsAllowed: z.number().min(1).default(1),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
  showResultsImmediately: z.boolean().default(false),
  requirePassword: z.boolean().default(false),
  password: z.string().optional(),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'scheduled']).default('draft'),
});

type EditExamForm = z.infer<typeof editExamSchema>;

interface EditExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: number | null;
}

export default function EditExamModal({ open, onOpenChange, examId }: EditExamModalProps) {
  const { toast } = useToast();
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  
  // Question management state
  const [selectionMethod, setSelectionMethod] = useState<'manual' | 'random'>('manual');
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [randomQuestionCount, setRandomQuestionCount] = useState<number>(10);
  const [randomQuestions, setRandomQuestions] = useState<any[]>([]);
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  // Fetch exam details
  const { data: examData } = useQuery({
    queryKey: ["/api/exams", examId],
    queryFn: async () => {
      if (!examId) return null;
      const response = await fetch(`/api/exams/${examId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch current exam questions
  const { data: currentExamQuestions = [] } = useQuery({
    queryKey: ["/api/exams", examId, "questions"],
    queryFn: async () => {
      if (!examId) return [];
      const response = await fetch(`/api/exams/${examId}/questions`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!examId && open,
    retry: false,
  });

  // Fetch available questions for adding
  const { data: availableQuestions } = useQuery({
    queryKey: ["/api/questions", { search: questionSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionSearch) params.append('search', questionSearch);
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: open,
  });

  // Auto-select random questions when method changes or count changes
  React.useEffect(() => {
    if (selectionMethod === 'random' && availableQuestions && availableQuestions.length > 0) {
      const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(randomQuestionCount, availableQuestions.length));
      setRandomQuestions(selected);
    }
  }, [selectionMethod, randomQuestionCount, availableQuestions]);

  const form = useForm<EditExamForm>({
    resolver: zodResolver(editExamSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: 1,
      duration: 90,
      totalPoints: 100,
      attemptsAllowed: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      showResultsImmediately: false,
      requirePassword: false,
      password: '',
      availableFrom: '',
      availableUntil: '',
      status: 'draft',
    },
  });

  // Update form when exam data loads
  useEffect(() => {
    if (examData) {
      form.reset({
        title: examData.title || '',
        description: examData.description || '',
        subjectId: examData.subjectId || 1,
        duration: examData.duration || 90,
        totalPoints: examData.totalPoints || 100,
        attemptsAllowed: examData.attemptsAllowed || 1,
        randomizeQuestions: examData.randomizeQuestions || false,
        randomizeOptions: examData.randomizeOptions || false,
        showResultsImmediately: examData.showResultsImmediately || false,
        requirePassword: examData.requirePassword || false,
        password: examData.password || '',
        availableFrom: examData.availableFrom ? new Date(examData.availableFrom).toISOString().slice(0, 16) : '',
        availableUntil: examData.availableUntil ? new Date(examData.availableUntil).toISOString().slice(0, 16) : '',
        status: examData.status || 'draft',
      });
    }
  }, [examData, form]);

  const updateExamMutation = useMutation({
    mutationFn: async (data: EditExamForm) => {
      await apiRequest("PUT", `/api/exams/${examId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam updated successfully",
      });
      onOpenChange(false);
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
        description: "Failed to update exam",
        variant: "destructive",
      });
    },
  });

  // Add question to exam mutation
  const addQuestionToExamMutation = useMutation({
    mutationFn: async ({ questionId, order, points }: { questionId: number; order: number; points: number }) => {
      await apiRequest("POST", `/api/exams/${examId}/questions`, {
        questionId,
        order,
        points,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      toast({
        title: "Success",
        description: "Question added to exam successfully",
      });
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
        description: "Failed to add question to exam",
        variant: "destructive",
      });
    },
  });

  // Remove question from exam mutation
  const removeQuestionFromExamMutation = useMutation({
    mutationFn: async (questionId: number) => {
      await apiRequest("DELETE", `/api/exams/${examId}/questions/${questionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "questions"] });
      toast({
        title: "Success",
        description: "Question removed from exam successfully",
      });
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
        description: "Failed to remove question from exam",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditExamForm) => {
    updateExamMutation.mutate(data);
  };

  const addQuestion = (question: any) => {
    // Prevent adding if already in progress or question already exists
    if (addQuestionToExamMutation.isPending) return;
    
    const isAlreadyInExam = currentExamQuestions.some((eq: any) => eq.questionId === question.id);
    if (isAlreadyInExam) return;
    
    const maxOrder = currentExamQuestions.length > 0 
      ? Math.max(...currentExamQuestions.map((q: any) => q.order || 0))
      : 0;
    
    addQuestionToExamMutation.mutate({
      questionId: question.id,
      order: maxOrder + 1,
      points: question.points || 1,
    });
  };

  const addQuestionsInBulk = (questions: any[]) => {
    // Prevent bulk adding if already in progress
    if (addQuestionToExamMutation.isPending) return;
    
    // Filter out questions that are already in the exam
    const questionsToAdd = questions.filter(question => 
      !currentExamQuestions.some((eq: any) => eq.questionId === question.id)
    );
    
    if (questionsToAdd.length === 0) return;
    
    // Calculate the starting order once
    const baseOrder = currentExamQuestions.length > 0 
      ? Math.max(...currentExamQuestions.map((q: any) => q.order || 0))
      : 0;
    
    // Create a queue of questions to add and process them one by one
    let currentIndex = 0;
    
    const addNextQuestion = () => {
      if (currentIndex >= questionsToAdd.length) return;
      
      const question = questionsToAdd[currentIndex];
      addQuestionToExamMutation.mutate({
        questionId: question.id,
        order: baseOrder + currentIndex + 1,
        points: question.points || 1,
      }, {
        onSuccess: () => {
          currentIndex++;
          // Small delay before adding the next question to avoid overwhelming the server
          setTimeout(() => addNextQuestion(), 100);
        },
        onError: () => {
          // Stop adding questions on error
          currentIndex = questionsToAdd.length;
        }
      });
    };
    
    // Start adding questions
    addNextQuestion();
  };

  const removeQuestion = (questionId: number) => {
    removeQuestionFromExamMutation.mutate(questionId);
  };

  const formatQuestionType = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getQuestionTypeColor = (type: string | undefined) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'short_answer': return 'bg-green-100 text-green-800';
      case 'essay': return 'bg-orange-100 text-orange-800';
      case 'fill_blank': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Exam</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-full overflow-hidden">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Calculus I - Midterm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Subject</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateSubjectModal(true)}
                        className="h-auto p-1 text-primary hover:text-primary/80"
                        title="Add new subject"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject: any) => (
                          <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter exam description (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Exam Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="90"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalPoints"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="attemptsAllowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attempts Allowed</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scheduling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="availableFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>When students can start taking the exam</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Until (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>When the exam closes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Options */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="randomizeQuestions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Randomize Question Order</FormLabel>
                      <FormDescription>
                        Questions will appear in random order for each student
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="randomizeOptions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Randomize Answer Options</FormLabel>
                      <FormDescription>
                        Multiple choice options will be shuffled
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showResultsImmediately"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Show Results Immediately</FormLabel>
                      <FormDescription>
                        Students see their score right after submission
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requirePassword"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require Password</FormLabel>
                      <FormDescription>
                        Students need a password to access the exam
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {form.watch('requirePassword') && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="Enter exam password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Question Management */}
            <div className="space-y-4">
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Manage Exam Questions</h3>

                {/* Current Questions */}
                <div className="mb-6 max-w-full">
                  <Label className="text-sm font-medium">Current Questions ({currentExamQuestions.length})</Label>
                  {currentExamQuestions.length > 0 ? (
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto overflow-x-hidden border rounded-lg max-w-full">
                      {currentExamQuestions.map((examQuestion: any, index: number) => (
                        <div key={examQuestion.id} className="p-3 bg-blue-50 border-l-4 border-blue-400">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1">
                              <span className="text-sm font-medium">{index + 1}.</span>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge className={getQuestionTypeColor(examQuestion.question?.questionType)} variant="secondary">
                                    {formatQuestionType(examQuestion.question?.questionType || 'unknown')}
                                  </Badge>
                                  <Badge variant="outline">{examQuestion.question?.subject || 'No Subject'}</Badge>
                                  <span className="text-xs text-gray-500">{examQuestion.points} pts</span>
                                </div>
                                <p className="text-sm text-gray-900 truncate">
                                  {examQuestion.question?.questionText || 'Question text not available'}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(examQuestion.questionId)}
                              disabled={removeQuestionFromExamMutation.isPending}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 p-4 text-center text-gray-500 border rounded-lg">
                      No questions added to this exam yet.
                    </div>
                  )}
                </div>

                {/* Add Questions Section */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Add Questions to Exam</Label>
                  
                  {/* Question Selection Method */}
                  <div>
                    <Label className="text-sm font-medium">Selection Method</Label>
                    <RadioGroup 
                      value={selectionMethod} 
                      onValueChange={(value: 'manual' | 'random') => setSelectionMethod(value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual-edit" />
                        <Label htmlFor="manual-edit">Manual Selection - Choose specific questions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="random" id="random-edit" />
                        <Label htmlFor="random-edit">Random Selection - Auto-select from available questions</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Manual Question Selection */}
                  {selectionMethod === 'manual' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Search Available Questions</Label>
                        <div className="flex space-x-2 mt-2">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search questions..."
                              value={questionSearch}
                              onChange={(e) => setQuestionSearch(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Available Questions */}
                      <div className="max-w-full">
                        <Label>Available Questions</Label>
                        <div className="mt-2 max-h-40 overflow-y-auto overflow-x-hidden border rounded-lg max-w-full">
                          {availableQuestions?.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                              No questions found.
                            </div>
                          ) : (
                            <div className="divide-y">
                              {availableQuestions?.map((question: any) => {
                                const isAlreadyInExam = currentExamQuestions.some((eq: any) => eq.questionId === question.id);
                                return (
                                  <div key={question.id} className={`p-3 ${isAlreadyInExam ? 'bg-gray-50 opacity-50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <Badge className={getQuestionTypeColor(question.questionType)} variant="secondary">
                                            {formatQuestionType(question.questionType)}
                                          </Badge>
                                          <Badge variant="outline">{question.subject}</Badge>
                                          <span className="text-xs text-gray-500">{question.points} pts</span>
                                        </div>
                                        <p className="text-sm text-gray-900 truncate">
                                          {question.questionText}
                                        </p>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addQuestion(question)}
                                        disabled={isAlreadyInExam || addQuestionToExamMutation.isPending}
                                      >
                                        {addQuestionToExamMutation.isPending ? (
                                          'Adding...'
                                        ) : isAlreadyInExam ? (
                                          'Added'
                                        ) : (
                                          <Plus className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Random Question Selection */}
                  {selectionMethod === 'random' && (
                    <div className="space-y-4">
                      <div>
                        <Label>Number of Questions to Add</Label>
                        <div className="mt-2">
                          <Input
                            type="number"
                            min="1"
                            max={availableQuestions?.length || 100}
                            value={randomQuestionCount}
                            onChange={(e) => setRandomQuestionCount(parseInt(e.target.value) || 1)}
                            placeholder="Enter number of questions"
                            className="w-48"
                          />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {availableQuestions?.length > 0 
                            ? `Available questions: ${availableQuestions.length}` 
                            : 'Loading questions...'}
                        </p>
                      </div>

                      {/* Randomly Selected Questions Preview */}
                      {randomQuestions.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Randomly Selected Questions ({randomQuestions.length})</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addQuestionsInBulk(randomQuestions)}
                              disabled={addQuestionToExamMutation.isPending || randomQuestions.length === 0}
                            >
                              {addQuestionToExamMutation.isPending ? 'Adding...' : `Add ${randomQuestions.length} Selected`}
                            </Button>
                          </div>
                          <div className="mt-2 space-y-2 max-h-32 overflow-y-auto border rounded-lg">
                            {randomQuestions.map((question, index) => (
                              <div key={question.id} className="p-3 bg-green-50 border-l-4 border-green-400">
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium">{index + 1}.</span>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                      <Badge className={getQuestionTypeColor(question.questionType)} variant="secondary">
                                        {formatQuestionType(question.questionType)}
                                      </Badge>
                                      <Badge variant="outline">{question.subject}</Badge>
                                      <span className="text-xs text-gray-500">{question.points} pts</span>
                                    </div>
                                    <p className="text-sm text-gray-900 truncate">
                                      {question.questionText}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {availableQuestions?.length === 0 && (
                        <div className="p-4 text-center text-gray-500 border rounded-lg">
                          No questions available for random selection.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateExamMutation.isPending} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                {updateExamMutation.isPending ? "Updating..." : "Update Exam"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      
      <CreateSubjectModal
        open={showCreateSubjectModal}
        onOpenChange={setShowCreateSubjectModal}
      />
    </Dialog>
  );
}