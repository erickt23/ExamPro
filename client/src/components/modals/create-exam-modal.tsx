import React, { useState } from "react";
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
import CreateSubjectModal from "./create-subject-modal";

const createExamSchema = z.object({
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
});

type CreateExamForm = z.infer<typeof createExamSchema>;

interface CreateExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateExamModal({ open, onOpenChange }: CreateExamModalProps) {
  const { toast } = useToast();
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });
  // Question selection state
  const [selectionMethod, setSelectionMethod] = useState<'manual' | 'random'>('manual');
  const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
  const [randomQuestionCount, setRandomQuestionCount] = useState<number>(10);
  const [randomQuestions, setRandomQuestions] = useState<any[]>([]);
  
  // Search and filter state
  const [questionSearch, setQuestionSearch] = useState("");
  const [filterSubject, setFilterSubject] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("");
  const [filterBloomsTaxonomy, setFilterBloomsTaxonomy] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const form = useForm<CreateExamForm>({
    resolver: zodResolver(createExamSchema),
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
    },
  });

  const { data: questions } = useQuery({
    queryKey: ["/api/questions", { search: questionSearch, subject: filterSubject, type: filterType, difficulty: filterDifficulty, bloomsTaxonomy: filterBloomsTaxonomy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionSearch) params.append('search', questionSearch);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterType) params.append('type', filterType);
      if (filterDifficulty) params.append('difficulty', filterDifficulty);
      if (filterBloomsTaxonomy) params.append('bloomsTaxonomy', filterBloomsTaxonomy);
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: true, // Always fetch questions for both manual and random selection
  });

  // Auto-select random questions when method changes or count changes
  React.useEffect(() => {
    if (selectionMethod === 'random' && questions && questions.length > 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(randomQuestionCount, questions.length));
      setRandomQuestions(selected);
    }
  }, [selectionMethod, randomQuestionCount, questions]);

  const createExamMutation = useMutation({
    mutationFn: async (data: CreateExamForm) => {
      // First create the exam
      const examResponse = await apiRequest("POST", "/api/exams", {
        ...data,
        availableFrom: data.availableFrom ? new Date(data.availableFrom).toISOString() : null,
        availableUntil: data.availableUntil ? new Date(data.availableUntil).toISOString() : null,
      });
      
      // Add questions to exam based on selection method
      const questionsToAdd = selectionMethod === 'manual' ? selectedQuestions : randomQuestions;
      if (questionsToAdd.length > 0) {
        const examData = await examResponse.json();
        
        for (let i = 0; i < questionsToAdd.length; i++) {
          const question = questionsToAdd[i];
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
      setRandomQuestions([]);
      setQuestionSearch("");
      setFilterSubject("");
      setFilterType("");
      setFilterDifficulty("");
      setFilterBloomsTaxonomy("");
      setRandomQuestionCount(10);
      setShowFilters(false);
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
    const questionsToCheck = selectionMethod === 'manual' ? selectedQuestions : randomQuestions;
    if (questionsToCheck.length === 0) {
      toast({
        title: "Error",
        description: `Please ${selectionMethod === 'manual' ? 'select at least one question' : 'ensure there are questions available for random selection'} for the exam`,
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
                  <div className="flex items-center justify-between mb-3">
                    <Label>Search and Select Questions</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-xs"
                    >
                      {showFilters ? 'Hide Filters' : 'Show Filters'}
                    </Button>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search questions by title or content..."
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Filter Section */}
                  {showFilters && (
                    <Card className="p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Subject Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Subject</Label>
                          <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All subjects" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All subjects</SelectItem>
                              {subjects.map((subject: any) => (
                                <SelectItem key={subject.id} value={subject.id.toString()}>
                                  {subject.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Question Type Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Question Type</Label>
                          <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All types</SelectItem>
                              <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                              <SelectItem value="short_answer">Short Answer</SelectItem>
                              <SelectItem value="essay">Essay</SelectItem>
                              <SelectItem value="fill_blank">Fill in Blank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Difficulty Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Difficulty</Label>
                          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All levels</SelectItem>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Bloom's Taxonomy Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Bloom's Taxonomy</Label>
                          <Select value={filterBloomsTaxonomy} onValueChange={setFilterBloomsTaxonomy}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="All levels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All levels</SelectItem>
                              <SelectItem value="remember">Remember</SelectItem>
                              <SelectItem value="understand">Understand</SelectItem>
                              <SelectItem value="apply">Apply</SelectItem>
                              <SelectItem value="analyze">Analyze</SelectItem>
                              <SelectItem value="evaluate">Evaluate</SelectItem>
                              <SelectItem value="create">Create</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Clear Filters Button */}
                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setQuestionSearch("");
                            setFilterSubject("");
                            setFilterType("");
                            setFilterDifficulty("");
                            setFilterBloomsTaxonomy("");
                          }}
                          className="text-xs"
                        >
                          Clear All Filters
                        </Button>
                      </div>
                    </Card>
                  )}
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
                            {question.difficulty && (
                              <Badge variant="outline" className="capitalize text-xs">{question.difficulty}</Badge>
                            )}
                            {question.bloomsTaxonomy && (
                              <Badge variant="outline" className="capitalize text-xs">{question.bloomsTaxonomy}</Badge>
                            )}
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
                                  <Badge variant="outline">{question.subject || 'No subject'}</Badge>
                                  {question.difficulty && (
                                    <Badge variant="outline" className="capitalize text-xs">{question.difficulty}</Badge>
                                  )}
                                  {question.bloomsTaxonomy && (
                                    <Badge variant="outline" className="capitalize text-xs">{question.bloomsTaxonomy}</Badge>
                                  )}
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

            {/* Random Question Selection */}
            {selectionMethod === 'random' && (
              <div className="space-y-4">
                <div>
                  <Label>Number of Questions to Select</Label>
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="1"
                      max={questions?.length || 100}
                      value={randomQuestionCount}
                      onChange={(e) => setRandomQuestionCount(parseInt(e.target.value) || 1)}
                      placeholder="Enter number of questions"
                      className="w-48"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {questions?.length > 0 
                      ? `Available questions: ${questions.length}` 
                      : 'Loading questions...'}
                  </p>
                </div>

                {/* Randomly Selected Questions Preview */}
                {randomQuestions.length > 0 && (
                  <div>
                    <Label>Randomly Selected Questions ({randomQuestions.length})</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg">
                      {randomQuestions.map((question, index) => (
                        <div key={question.id} className="p-3 bg-green-50 border-l-4 border-green-400">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{index + 1}.</span>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <Badge className={getQuestionTypeColor(question.questionType)} variant="secondary">
                                  {formatQuestionType(question.questionType)}
                                </Badge>
                                <Badge variant="outline">{question.subject || 'No subject'}</Badge>
                                {question.difficulty && (
                                  <Badge variant="outline" className="capitalize text-xs">{question.difficulty}</Badge>
                                )}
                                {question.bloomsTaxonomy && (
                                  <Badge variant="outline" className="capitalize text-xs">{question.bloomsTaxonomy}</Badge>
                                )}
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
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> These questions were randomly selected. 
                        The selection will change if you modify the number of questions or refresh the selection.
                      </p>
                    </div>
                  </div>
                )}

                {questions?.length === 0 && (
                  <div className="p-4 text-center text-gray-500 border rounded-lg">
                    No questions available for random selection. Please create some questions first.
                  </div>
                )}

                {questions && questions.length > 0 && randomQuestions.length === 0 && (
                  <div className="p-4 text-center text-gray-500 border rounded-lg">
                    Setting up random selection...
                  </div>
                )}
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
      
      <CreateSubjectModal
        open={showCreateSubjectModal}
        onOpenChange={setShowCreateSubjectModal}
      />
    </Dialog>
  );
}
