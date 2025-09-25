import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTranslation } from "@/hooks/useTranslation";
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
  gradeLevel: z.enum(["pre_k", "kindergarten", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "undergraduate", "graduate"]).optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  totalPoints: z.number().min(1, "Total points must be at least 1"),
  attemptsAllowed: z.number().min(1).default(1),
  randomizeQuestions: z.boolean().default(false),
  randomizeOptions: z.boolean().default(false),
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
  const { t } = useTranslation();
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
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterBloomsTaxonomy, setFilterBloomsTaxonomy] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const form = useForm<CreateExamForm>({
    resolver: zodResolver(createExamSchema),
    defaultValues: {
      title: '',
      description: '',
      subjectId: subjects.length > 0 ? subjects[0].id : 22,
      duration: 90,
      totalPoints: 100,
      attemptsAllowed: 1,
      randomizeQuestions: false,
      randomizeOptions: false,
      requirePassword: false,
      password: '',
      availableFrom: '',
      availableUntil: '',
    },
  });

  // Update form default subject when subjects are loaded
  React.useEffect(() => {
    if (subjects.length > 0 && !form.getValues('subjectId')) {
      form.setValue('subjectId', subjects[0].id);
    }
  }, [subjects, form]);

  const { data: questionsData } = useQuery({
    queryKey: ["/api/questions", { search: questionSearch, subject: filterSubject, type: filterType, difficulty: filterDifficulty, bloomsTaxonomy: filterBloomsTaxonomy }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (questionSearch) params.append('search', questionSearch);
      if (filterSubject && filterSubject !== 'all') params.append('subject', filterSubject);
      if (filterType && filterType !== 'all') params.append('type', filterType);
      if (filterDifficulty && filterDifficulty !== 'all') params.append('difficulty', filterDifficulty);
      if (filterBloomsTaxonomy && filterBloomsTaxonomy !== 'all') params.append('bloomsTaxonomy', filterBloomsTaxonomy);
      
      const response = await fetch(`/api/questions?${params}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    retry: false,
    enabled: true, // Always fetch questions for both manual and random selection
  });

  const questions = questionsData?.questions || [];

  // Auto-select random questions when method changes or count changes
  React.useEffect(() => {
    if (selectionMethod === 'random' && questions && questions.length > 0) {
      const shuffled = [...questions].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(randomQuestionCount, questions.length));
      setRandomQuestions(selected);
    }
  }, [selectionMethod, randomQuestionCount, questions]);

  // Calculate total points automatically based on selected questions
  React.useEffect(() => {
    const questionsToCalculate = selectionMethod === 'manual' ? selectedQuestions : randomQuestions;
    const totalPoints = questionsToCalculate.reduce((sum, question) => sum + (question.points || 1), 0);
    
    if (totalPoints > 0) {
      form.setValue('totalPoints', totalPoints);
    }
  }, [selectedQuestions, randomQuestions, selectionMethod, form]);

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
      setFilterSubject("all");
      setFilterType("all");
      setFilterDifficulty("all");
      setFilterBloomsTaxonomy("all");
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

  const getSubjectName = (subjectId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject ? subject.name : `Subject ${subjectId}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createExamModal.createNewExam')}</DialogTitle>
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
                    <FormLabel>{t('createExamModal.examTitle')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('createExamModal.examTitlePlaceholder')} {...field} />
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
                      <FormLabel>{t('createExamModal.subject')}</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateSubjectModal(true)}
                        className="h-auto p-1 text-primary hover:text-primary/80"
                        title={t('createExamModal.addNewSubject')}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('createExamModal.selectSubject')} />
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

              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pre_k">Pre-K</SelectItem>
                        <SelectItem value="kindergarten">Kindergarten</SelectItem>
                        <SelectItem value="1st">1st Grade</SelectItem>
                        <SelectItem value="2nd">2nd Grade</SelectItem>
                        <SelectItem value="3rd">3rd Grade</SelectItem>
                        <SelectItem value="4th">4th Grade</SelectItem>
                        <SelectItem value="5th">5th Grade</SelectItem>
                        <SelectItem value="6th">6th Grade</SelectItem>
                        <SelectItem value="7th">7th Grade</SelectItem>
                        <SelectItem value="8th">8th Grade</SelectItem>
                        <SelectItem value="9th">9th Grade</SelectItem>
                        <SelectItem value="10th">10th Grade</SelectItem>
                        <SelectItem value="11th">11th Grade</SelectItem>
                        <SelectItem value="12th">12th Grade</SelectItem>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
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
                  <FormLabel>{t('createExamModal.description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3}
                      placeholder={t('createExamModal.descriptionPlaceholder')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Question Selection Method */}
            <div>
              <Label className="text-sm font-medium">{t('createExamModal.questionSelectionMethod')}</Label>
              <RadioGroup 
                value={selectionMethod} 
                onValueChange={(value: 'manual' | 'random') => setSelectionMethod(value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual">{t('createExamModal.manualSelection')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="random" id="random" />
                  <Label htmlFor="random">{t('createExamModal.randomSelection')}</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Manual Question Selection */}
            {selectionMethod === 'manual' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>{t('createExamModal.searchAndSelectQuestions')}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="text-xs"
                    >
                      {showFilters ? t('createExamModal.hideFilters') : t('createExamModal.showFilters')}
                    </Button>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder={t('createExamModal.searchQuestionsPlaceholder')}
                      value={questionSearch}
                      onChange={(e) => setQuestionSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  {/* Filter Section */}
                  {showFilters && (
                    <Card className="p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Subject Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">{t('createExamModal.subject')}</Label>
                          <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t('createExamModal.allSubjects')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('createExamModal.allSubjects')}</SelectItem>
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
                          <Label className="text-sm font-medium mb-2 block">{t('createExamModal.questionType')}</Label>
                          <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t('createExamModal.allTypes')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('createExamModal.allTypes')}</SelectItem>
                              <SelectItem value="multiple_choice">{t('createExamModal.multipleChoice')}</SelectItem>
                              <SelectItem value="short_answer">{t('createExamModal.shortAnswer')}</SelectItem>
                              <SelectItem value="essay">{t('createExamModal.essay')}</SelectItem>
                              <SelectItem value="fill_blank">{t('createExamModal.fillInBlank')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Difficulty Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">{t('createExamModal.difficulty')}</Label>
                          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t('createExamModal.allLevels')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('createExamModal.allLevels')}</SelectItem>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Bloom's Taxonomy Filter */}
                        <div>
                          <Label className="text-sm font-medium mb-2 block">{t('createExamModal.bloomsTaxonomy')}</Label>
                          <Select value={filterBloomsTaxonomy} onValueChange={setFilterBloomsTaxonomy}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t('createExamModal.allLevels')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('createExamModal.allLevels')}</SelectItem>
                              <SelectItem value="remember">{t('createExamModal.remember')}</SelectItem>
                              <SelectItem value="understand">{t('createExamModal.understand')}</SelectItem>
                              <SelectItem value="apply">{t('createExamModal.apply')}</SelectItem>
                              <SelectItem value="analyze">{t('createExamModal.analyze')}</SelectItem>
                              <SelectItem value="evaluate">{t('createExamModal.evaluate')}</SelectItem>
                              <SelectItem value="create">{t('createExamModal.createLevel')}</SelectItem>
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
                            setFilterSubject("all");
                            setFilterType("all");
                            setFilterDifficulty("all");
                            setFilterBloomsTaxonomy("all");
                          }}
                          className="text-xs"
                        >
                          {t('createExamModal.clearAllFilters')}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Selected Questions */}
                {selectedQuestions.length > 0 && (
                  <div className="space-y-4 max-w-full">
                    <div>
                      <Label>{t('createExamModal.selectedQuestions')} ({selectedQuestions.length})</Label>
                      <div className="mt-2 space-y-2 max-h-32 overflow-y-auto overflow-x-hidden max-w-full">
                        {selectedQuestions.map((question, index) => (
                          <div key={question.id} className="flex items-start gap-2 p-2 bg-blue-50 rounded max-w-full">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex flex-wrap items-center gap-1 mb-1 overflow-hidden">
                                <span className="text-sm font-medium flex-shrink-0">{index + 1}.</span>
                                <Badge className={`${getQuestionTypeColor(question.questionType)} flex-shrink-0`} variant="secondary">
                                  {formatQuestionType(question.questionType)}
                                </Badge>
                                {question.difficulty && (
                                  <Badge variant="outline" className="capitalize text-xs flex-shrink-0">{question.difficulty}</Badge>
                                )}
                                {question.bloomsTaxonomy && (
                                  <Badge variant="outline" className="capitalize text-xs flex-shrink-0">{question.bloomsTaxonomy}</Badge>
                                )}
                                <span className="text-xs text-gray-500 flex-shrink-0">{question.points} pts</span>
                              </div>
                              <p className="text-sm truncate" style={{maxWidth: 'calc(100% - 2rem)'}}>{question.questionText}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeQuestion(question.id)}
                              className="flex-shrink-0 ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Points Summary Card */}
                    <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{t('createExamModal.examSummary')}</h4>
                            <p className="text-sm text-gray-600">
                              {selectedQuestions.length} {selectedQuestions.length === 1 ? t('createExamModal.question') : t('createExamModal.questions')} {t('createExamModal.selected')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {selectedQuestions.reduce((sum, q) => sum + (q.points || 1), 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total Points</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Available Questions */}
                <div className="max-w-full">
                  <Label>{t('createExamModal.availableQuestions')} ({questions?.length || 0} {t('createExamModal.total')})</Label>
                  <div className={`mt-2 border rounded-lg overflow-x-hidden max-w-full ${questions?.length > 5 ? 'max-h-60 overflow-y-auto' : ''}`}>
                    {questions?.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {t('createExamModal.noQuestionsFound')}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {questions?.map((question: any) => (
                          <div key={question.id} className="p-3 hover:bg-gray-50">
                            <div className="flex items-start gap-2 max-w-full">
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex flex-wrap items-center gap-1 mb-2 overflow-hidden">
                                  <Badge className={`${getQuestionTypeColor(question.questionType)} flex-shrink-0`} variant="secondary">
                                    {formatQuestionType(question.questionType)}
                                  </Badge>
                                  <Badge variant="outline" className="flex-shrink-0">{getSubjectName(question.subjectId)}</Badge>
                                  {question.difficulty && (
                                    <Badge variant="outline" className="capitalize text-xs flex-shrink-0">{question.difficulty}</Badge>
                                  )}
                                  {question.bloomsTaxonomy && (
                                    <Badge variant="outline" className="capitalize text-xs flex-shrink-0">{question.bloomsTaxonomy}</Badge>
                                  )}
                                  <span className="text-xs text-gray-500 flex-shrink-0">{question.points} pts</span>
                                </div>
                                <p className="text-sm text-gray-900 truncate" style={{maxWidth: 'calc(100% - 2rem)'}}>
                                  {question.questionText}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQuestion(question)}
                                disabled={selectedQuestions.find(q => q.id === question.id)}
                                className="flex-shrink-0 ml-2"
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
                  <Label>{t('createExamModal.numberOfQuestionsToSelect')}</Label>
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="1"
                      max={questions?.length || 100}
                      value={randomQuestionCount}
                      onChange={(e) => setRandomQuestionCount(parseInt(e.target.value) || 1)}
                      placeholder={t('createExamModal.enterNumberOfQuestions')}
                      className="w-full max-w-48"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {questions?.length > 0 
                      ? `${t('createExamModal.availableQuestionsCount')} ${questions.length}` 
                      : t('createExamModal.loadingQuestions')}
                  </p>
                </div>

                {/* Randomly Selected Questions Preview */}
                {randomQuestions.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <Label>{t('createExamModal.randomlySelectedQuestions')} ({randomQuestions.length})</Label>
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
                                  <Badge variant="outline">Subject {question.subjectId}</Badge>
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
                          <strong>{t('createExamModal.note')}</strong> {t('createExamModal.randomSelectionNote')}
                        </p>
                      </div>
                    </div>

                    {/* Points Summary Card for Random Questions */}
                    <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{t('createExamModal.randomSelectionSummary')}</h4>
                            <p className="text-sm text-gray-600">
                              {randomQuestions.length} {randomQuestions.length === 1 ? t('createExamModal.question') : t('createExamModal.questions')} {t('createExamModal.randomlySelected')}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-orange-600">
                              {randomQuestions.reduce((sum, q) => sum + (q.points || 1), 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total Points</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {questions?.length === 0 && (
                  <div className="p-4 text-center text-gray-500 border rounded-lg">
                    {t('createExamModal.noQuestionsAvailableForRandom')}
                  </div>
                )}

                {questions && questions.length > 0 && randomQuestions.length === 0 && (
                  <div className="p-4 text-center text-gray-500 border rounded-lg">
                    {t('createExamModal.settingUpRandomSelection')}
                  </div>
                )}
              </div>
            )}

            {/* Exam Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createExamModal.durationMinutes')}</FormLabel>
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
                render={({ field }) => {
                  const questionsToCalculate = selectionMethod === 'manual' ? selectedQuestions : randomQuestions;
                  const calculatedPoints = questionsToCalculate.reduce((sum, question) => sum + (question.points || 1), 0);
                  const isAutoCalculated = questionsToCalculate.length > 0;
                  
                  return (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        {t('createExamModal.totalPoints')}
                        {isAutoCalculated && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                            {t('createExamModal.autoCalculated')}
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            className={isAutoCalculated ? "bg-green-50 border-green-200" : ""}
                          />
                          {isAutoCalculated && (
                            <div className="absolute inset-y-0 right-3 flex items-center">
                              <span className="text-xs text-green-600 font-medium">
                                = {calculatedPoints} {t('createExamModal.pointsCalculatedSuffix')}
                              </span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {isAutoCalculated && (
                        <FormDescription className="text-green-600 text-xs">
                          {t('createExamModal.pointsAutoCalculatedDescription', { count: questionsToCalculate.length, plural: questionsToCalculate.length === 1 ? t('createExamModal.question') : t('createExamModal.questions') })}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

            </div>

            {/* Additional Settings Row */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="attemptsAllowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createExamModal.attemptsAllowed')}</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">{t('createExamModal.oneAttempt')}</SelectItem>
                        <SelectItem value="2">{t('createExamModal.twoAttempts')}</SelectItem>
                        <SelectItem value="3">{t('createExamModal.threeAttempts')}</SelectItem>
                        <SelectItem value="-1">{t('createExamModal.unlimited')}</SelectItem>
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
                    <FormLabel>{t('createExamModal.availableFrom')}</FormLabel>
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
                    <FormLabel>{t('createExamModal.availableUntil')}</FormLabel>
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
              <Label className="text-sm font-medium mb-3 block">{t('createExamModal.examOptions')}</Label>
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
                        <FormLabel>{t('createExamModal.randomizeQuestionOrder')}</FormLabel>
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
                        <FormLabel>{t('createExamModal.randomizeAnswerOptions')}</FormLabel>
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
                        <FormLabel>{t('createExamModal.requirePasswordToStart')}</FormLabel>
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
                        <FormLabel>{t('createExamModal.examPassword')}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={t('createExamModal.enterExamPassword')} 
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
                {t('common.cancel')}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                disabled={createExamMutation.isPending}
                className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 text-indigo-700 hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-indigo-500/20 hover:text-indigo-800 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {t('createExamModal.saveAsDraft')}
              </Button>
              <Button 
                type="submit"
                disabled={createExamMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {createExamMutation.isPending ? t('common.creating') : t('createExamModal.createExam')}
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
