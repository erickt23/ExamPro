import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, X } from "lucide-react";

const createExamSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
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
});

type CreateExamForm = z.infer<typeof createExamSchema>;

interface CreateExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateExamModal({ open, onOpenChange }: CreateExamModalProps) {
  const { toast } = useToast();
  const [selectionMethod, setSelectionMethod] = useState<'manual' | 'random'>('manual');
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");

  const form = useForm<CreateExamForm>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      title: '',
      description: '',
      subject: '',
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
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["/api/questions", { search: questionSearch }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionSearch) params.append('search', questionSearch);
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: selectionMethod === 'manual',
  });

  const createExamMutation = useMutation({
    mutationFn: async (data: CreateExamForm) => {
      // First create the exam
      const examResponse = await apiRequest("POST", "/api/exams", {
        ...data,
        availableFrom: data.availableFrom ? new Date(data.availableFrom).toISOString() : null,
        availableUntil: data.availableUntil ? new Date(data.availableUntil).toISOString() : null,
      });
      
      // If manual selection, add questions to exam
      if (selectionMethod === 'manual' && selectedQuestions.length > 0) {
        const examData = await examResponse.json();
        
        for (let i = 0; i < selectedQuestions.length; i++) {
          const question = selectedQuestions[i];
          await apiRequest("POST", `/api/exams/${examData.id}/questions`, {
            questionId: question.id,
            order: i + 1,
            points: question.points || 1,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam created successfully",
      });
      form.reset();
      setSelectedQuestions([]);
      setQuestionSearch("");
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
        description: "Failed to create exam",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateExamForm) => {
    if (selectionMethod === 'manual' && selectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one question for the exam",
        variant: "destructive",
      });
      return;
    }
    createExamMutation.mutate(data);
  };

  const addQuestion = (question: any) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
    }
  };

  const removeQuestion = (questionId: number) => {
    setSelectedQuestions(selectedQuestions.filter(q => q.id !== questionId));
  };

  const formatQuestionType = (type: string) => {
    return type.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getQuestionTypeColor = (type: string) => {
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Exam</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
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
                      rows={3}
                      placeholder="Brief description of the exam..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Selection Method */}
            <div>
              <Label className="text-sm font-medium">Question Selection Method</Label>
              <RadioGroup 
                value={selectionMethod} 
                onValueChange={(value: 'manual' | 'random') => setSelectionMethod(value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual">Manual Selection - Choose specific questions</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="random" id="random" />
                  <Label htmlFor="random">Random Selection - Auto-generate from criteria</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Manual Question Selection */}
            {selectionMethod === 'manual' && (
              <div className="space-y-4">
                <div>
                  <Label>Search and Select Questions</Label>
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

                {/* Selected Questions */}
                {selectedQuestions.length > 0 && (
                  <div>
                    <Label>Selected Questions ({selectedQuestions.length})</Label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {selectedQuestions.map((question, index) => (
                        <div key={question.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{index + 1}.</span>
                            <span className="text-sm truncate">{question.questionText}</span>
                            <Badge className={getQuestionTypeColor(question.questionType)} variant="secondary">
                              {formatQuestionType(question.questionType)}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeQuestion(question.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Questions */}
                <div>
                  <Label>Available Questions</Label>
                  <div className="mt-2 max-h-40 overflow-y-auto border rounded-lg">
                    {questions?.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No questions found. Create some questions first.
                      </div>
                    ) : (
                      <div className="divide-y">
                        {questions?.map((question: any) => (
                          <div key={question.id} className="p-3 hover:bg-gray-50">
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
                                disabled={selectedQuestions.find(q => q.id === question.id)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                        min="1" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                        min="1" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Attempt</SelectItem>
                        <SelectItem value="2">2 Attempts</SelectItem>
                        <SelectItem value="3">3 Attempts</SelectItem>
                        <SelectItem value="-1">Unlimited</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Scheduling */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="availableFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available From</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="availableUntil"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Available Until</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exam Options */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Exam Options</Label>
              <div className="space-y-3">
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
                        <FormLabel>Randomize question order</FormLabel>
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
                        <FormLabel>Randomize answer options</FormLabel>
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
                        <FormLabel>Show results immediately</FormLabel>
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
                        <FormLabel>Require password to start</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

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
              </div>
            </div>

            <DialogFooter className="space-x-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                disabled={createExamMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button 
                type="submit"
                disabled={createExamMutation.isPending}
              >
                {createExamMutation.isPending ? "Creating..." : "Create Exam"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
