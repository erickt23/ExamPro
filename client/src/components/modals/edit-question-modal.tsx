import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, List, PenTool, FileText, Pen, Upload, Paperclip, ArrowUpDown, Link, Move3D, Calculator } from "lucide-react";

import { ObjectUploader } from "@/components/ObjectUploader";
import { MathField } from "@/components/ui/math-field";

const editQuestionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(['multiple_choice', 'short_answer', 'essay', 'fill_blank', 'matching', 'ranking', 'drag_drop', 'stem']),
  category: z.enum(['exam', 'homework']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional().nullable(),
  correctAnswers: z.array(z.string()).optional().nullable(),
  explanation: z.string().optional(),
  attachmentUrl: z.string().optional(),
  subjectId: z.number().min(1, "Please select a subject"),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  bloomsTaxonomy: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
  gradeLevel: z.enum(['pre_k', 'kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate']).optional(),
  points: z.number().min(1).default(1),
  timeLimit: z.number().optional(),
});

type EditQuestionForm = z.infer<typeof editQuestionSchema>;

interface EditQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: number | null;
}

export default function EditQuestionModal({ open, onOpenChange, questionId }: EditQuestionModalProps) {
  const { toast } = useToast();

  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });

  // Fetch question details
  const { data: questionData } = useQuery({
    queryKey: ["/api/questions", questionId],
    queryFn: async () => {
      if (!questionId) return null;
      const response = await fetch(`/api/questions/${questionId}`);
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!questionId && open,
    retry: false,
  });

  const [selectedType, setSelectedType] = useState<string>('multiple_choice');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOptions, setCorrectOptions] = useState<string[]>(['A']);
  const [attachmentFile, setAttachmentFile] = useState<any>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  
  // State for new question types
  const [matchingPairs, setMatchingPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
  const [rankingItems, setRankingItems] = useState(['', '']);
  const [dragDropZones, setDragDropZones] = useState([{ zone: '', items: [''] }]);
  const [dragDropItems, setDragDropItems] = useState(['']);
  const [fillBlankFields, setFillBlankFields] = useState([{ label: 'Blank 1', answer: '' }, { label: 'Blank 2', answer: '' }]);

  const form = useForm<EditQuestionForm>({
    resolver: zodResolver(editQuestionSchema),
    defaultValues: {
      title: '',
      questionText: '',
      questionType: 'multiple_choice',
      category: 'exam',
      points: 1,
    },
  });

  // Update form when question data loads
  useEffect(() => {
    if (questionData) {
      form.reset({
        title: questionData.title || '',
        questionText: questionData.questionText || '',
        questionType: questionData.questionType || 'multiple_choice',
        category: questionData.category || 'exam',
        subjectId: questionData.subjectId,
        difficulty: questionData.difficulty,
        bloomsTaxonomy: questionData.bloomsTaxonomy || undefined,
        gradeLevel: questionData.gradeLevel || undefined,
        points: questionData.points || 1,
        timeLimit: questionData.timeLimit || undefined,
        explanation: questionData.explanation || '',
        attachmentUrl: questionData.attachmentUrl || '',
      });
      
      setSelectedType(questionData.questionType || 'multiple_choice');
      
      if (questionData.questionType === 'multiple_choice' && questionData.options) {
        setMcqOptions([...questionData.options, '', '', '', ''].slice(0, Math.max(4, questionData.options.length)));
        
        // Handle both single and multiple correct answers
        if (questionData.correctAnswers && Array.isArray(questionData.correctAnswers)) {
          // Multiple correct answers from correctAnswers field
          setCorrectOptions(questionData.correctAnswers);
        } else if (questionData.correctAnswer) {
          // Single correct answer from correctAnswer field
          setCorrectOptions([questionData.correctAnswer]);
        } else {
          setCorrectOptions(['A']);
        }
      } else if (questionData.questionType === 'matching' && questionData.options) {
        setMatchingPairs(questionData.options.length > 0 ? questionData.options : [{ left: '', right: '' }, { left: '', right: '' }]);
      } else if (questionData.questionType === 'ranking' && questionData.options) {
        setRankingItems(questionData.options.length > 0 ? questionData.options : ['', '']);
      } else if (questionData.questionType === 'fill_blank' && questionData.correctAnswer) {
        // Parse pipe-separated correct answers
        const answers = questionData.correctAnswer.split('|').filter((a: string) => a.trim());
        if (answers.length > 0) {
          const fields = answers.map((answer: string, index: number) => ({
            label: `Blank ${index + 1}`,
            answer: answer
          }));
          setFillBlankFields(fields);
        } else {
          setFillBlankFields([{ label: 'Blank 1', answer: '' }, { label: 'Blank 2', answer: '' }]);
        }
      } else if (questionData.questionType === 'drag_drop' && questionData.correctAnswer) {
        try {
          const data = JSON.parse(questionData.correctAnswer);
          if (data.zones) setDragDropZones(data.zones);
          if (data.items) setDragDropItems(data.items);
        } catch (e) {
          // If parsing fails, use default values
          setDragDropZones([{ zone: '', items: [''] }]);
          setDragDropItems(['']);
        }
      }
      
      if (questionData.attachmentUrl) {
        setAttachmentUrl(questionData.attachmentUrl);
        // Set a placeholder file object for display
        setAttachmentFile({ name: 'Existing attachment' });
      }
    }
  }, [questionData, form]);

  // Function to toggle correct options for multiple choice
  const toggleCorrectOption = (letter: string) => {
    setCorrectOptions(prev => {
      if (prev.includes(letter)) {
        return prev.filter(option => option !== letter);
      } else {
        return [...prev, letter].sort();
      }
    });
  };

  const updateQuestionMutation = useMutation({
    mutationFn: async (data: EditQuestionForm) => {
      let payload = { ...data };
      
      if (data.questionType === 'multiple_choice') {
        payload.options = mcqOptions.filter(option => option.trim());
        // Save multiple correct answers
        if (correctOptions.length > 1) {
          payload.correctAnswers = correctOptions;
          payload.correctAnswer = null; // Clear single answer when multiple are set
        } else {
          payload.correctAnswer = correctOptions[0] || 'A';
          payload.correctAnswers = null; // Clear multiple answers when only one is set
        }
      } else if (data.questionType === 'matching') {
        const validPairs = matchingPairs.filter(pair => pair.left.trim() && pair.right.trim());
        payload.options = validPairs.map(pair => `${pair.left}|${pair.right}`);
        payload.correctAnswer = JSON.stringify(validPairs);
      } else if (data.questionType === 'ranking') {
        const validItems = rankingItems.filter(item => item.trim());
        payload.options = validItems;
        payload.correctAnswer = JSON.stringify(validItems);
      } else if (data.questionType === 'fill_blank') {
        const validFields = fillBlankFields.filter(field => field.answer.trim());
        payload.correctAnswer = validFields.map(field => field.answer).join('|');
      } else if (data.questionType === 'drag_drop') {
        const validZones = dragDropZones.filter(zone => zone.zone?.trim()).map(zone => zone.zone);
        const validItems = dragDropItems.filter(item => item.trim());
        const optionsData = {
          zones: validZones,
          items: validItems
        };
        const answerKeyData = {
          zones: dragDropZones.filter(zone => zone.zone?.trim()).map(zone => ({
            zone: zone.zone,
            items: zone.items || []
          })),
          items: validItems
        };
        payload.options = [...validZones, ...validItems];
        payload.correctAnswer = JSON.stringify(answerKeyData);
      }
      
      // Include attachment URL if present
      if (attachmentUrl) {
        payload.attachmentUrl = attachmentUrl;
      }
      
      await apiRequest("PUT", `/api/questions/${questionId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/questions", questionId] });
      toast({
        title: "Success",
        description: "Question updated successfully",
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
        description: "Failed to update question",
        variant: "destructive",
      });
    },
  });

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: List },
    { value: 'short_answer', label: 'Short Answer', icon: PenTool },
    { value: 'essay', label: 'Essay', icon: FileText },
    { value: 'fill_blank', label: 'Fill in Blank', icon: Pen },
    { value: 'matching', label: 'Matching', icon: Link },
    { value: 'ranking', label: 'Ranking', icon: ArrowUpDown },
    { value: 'drag_drop', label: 'Drag & Drop', icon: Move3D },
    { value: 'stem', label: 'STEM (Math/Science)', icon: Calculator },
  ];

  const onSubmit = (data: EditQuestionForm) => {
    updateQuestionMutation.mutate(data);
  };

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  // Helper functions for new question types
  const updateMatchingPair = (index: number, side: 'left' | 'right', value: string) => {
    const newPairs = [...matchingPairs];
    newPairs[index][side] = value;
    setMatchingPairs(newPairs);
  };

  const addMatchingPair = () => {
    setMatchingPairs([...matchingPairs, { left: '', right: '' }]);
  };

  const removeMatchingPair = (index: number) => {
    if (matchingPairs.length > 2) {
      setMatchingPairs(matchingPairs.filter((_, i) => i !== index));
    }
  };

  const updateRankingItem = (index: number, value: string) => {
    const newItems = [...rankingItems];
    newItems[index] = value;
    setRankingItems(newItems);
  };

  const addRankingItem = () => {
    setRankingItems([...rankingItems, '']);
  };

  const removeRankingItem = (index: number) => {
    if (rankingItems.length > 2) {
      setRankingItems(rankingItems.filter((_, i) => i !== index));
    }
  };

  const updateDragDropZone = (index: number, value: string) => {
    const newZones = [...dragDropZones];
    newZones[index].zone = value;
    setDragDropZones(newZones);
  };

  const addDragDropZone = () => {
    setDragDropZones([...dragDropZones, { zone: '', items: [''] }]);
  };

  const updateDragDropItem = (index: number, value: string) => {
    const newItems = [...dragDropItems];
    newItems[index] = value;
    setDragDropItems(newItems);
  };

  const addDragDropItem = () => {
    setDragDropItems([...dragDropItems, '']);
  };

  // Fill-in-the-blank helper functions
  const updateFillBlankField = (index: number, field: 'label' | 'answer', value: string) => {
    const newFields = [...fillBlankFields];
    newFields[index][field] = value;
    setFillBlankFields(newFields);
  };

  const addFillBlankField = () => {
    const newIndex = fillBlankFields.length + 1;
    setFillBlankFields([...fillBlankFields, { label: `Blank ${newIndex}`, answer: '' }]);
  };

  const removeFillBlankField = (index: number) => {
    if (fillBlankFields.length > 1) {
      setFillBlankFields(fillBlankFields.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question Type */}
            <div>
              <Label className="text-sm font-medium">Question Type</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {questionTypes.map((type) => {
                  const IconComponent = type.icon;
                  const isSelected = selectedType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        setSelectedType(type.value);
                        form.setValue('questionType', type.value as any);
                      }}
                      className={`p-3 border-2 rounded-lg text-center hover:bg-gray-50 transition-colors ${
                        isSelected ? 'border-primary bg-primary/10' : 'border-gray-300'
                      }`}
                    >
                      <IconComponent className={`h-6 w-6 mx-auto mb-2 ${isSelected ? 'text-primary' : 'text-gray-600'}`} />
                      <p className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-600'}`}>
                        {type.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter question title..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Question Text
                    {form.watch('questionType') === 'stem' && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (Mathematical expressions supported)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    {form.watch('questionType') === 'stem' ? (
                      <MathField
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Enter your mathematical question here..."
                        data-testid="input-question-text-math"
                        className="min-h-[200px]"
                      />
                    ) : (
                      <Textarea 
                        rows={4}
                        placeholder="Enter your question here..." 
                        {...field} 
                        data-testid="input-question-text"
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multiple Choice Options */}
            {selectedType === 'multiple_choice' && (
              <div>
                <Label className="text-sm font-medium">Answer Options</Label>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Select multiple correct answers by checking the boxes. You can choose one or more correct answers.
                  </p>
                </div>
                <div className="space-y-3 mt-2">
                  {mcqOptions.map((option, index) => {
                    const letter = String.fromCharCode(65 + index); // A, B, C, D
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <Checkbox
                          checked={correctOptions.includes(letter)}
                          onCheckedChange={() => toggleCorrectOption(letter)}
                          id={`correct-${letter}`}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[20px]">{letter}.</span>
                        <Input
                          value={option}
                          onChange={(e) => updateMcqOption(index, e.target.value)}
                          placeholder={`Enter option ${letter}`}
                          className="flex-1"
                        />
                      </div>
                    );
                  })}
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setMcqOptions([...mcqOptions, ''])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another option
                </Button>
              </div>
            )}

            {/* Matching Question Options */}
            {selectedType === 'matching' && (
              <div>
                <Label className="text-sm font-medium">Matching Pairs</Label>
                <div className="space-y-3 mt-2">
                  {matchingPairs.map((pair, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs text-gray-500">Left Item</Label>
                        <Input
                          value={pair.left}
                          onChange={(e) => updateMatchingPair(index, 'left', e.target.value)}
                          placeholder={`Item ${index + 1}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Right Item</Label>
                        <Input
                          value={pair.right}
                          onChange={(e) => updateMatchingPair(index, 'right', e.target.value)}
                          placeholder={`Match ${index + 1}`}
                        />
                      </div>
                      {matchingPairs.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeMatchingPair(index)}
                          className="col-span-2 mt-2"
                        >
                          Remove Pair
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={addMatchingPair}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another pair
                </Button>
              </div>
            )}

            {/* Ranking Question Options */}
            {selectedType === 'ranking' && (
              <div>
                <Label className="text-sm font-medium">Items to Rank (in correct order)</Label>
                <div className="space-y-3 mt-2">
                  {rankingItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700 min-w-[30px]">{index + 1}.</span>
                      <Input
                        value={item}
                        onChange={(e) => updateRankingItem(index, e.target.value)}
                        placeholder={`Ranking item ${index + 1}`}
                        className="flex-1"
                      />
                      {rankingItems.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRankingItem(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="mt-3"
                  onClick={addRankingItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another item
                </Button>
              </div>
            )}

            {/* Fill in the Blank Question Options */}
            {selectedType === 'fill_blank' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">
                    Instructions
                  </Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Use <code className="bg-blue-200 dark:bg-blue-700 px-1 rounded text-xs">___</code> (three underscores) in your question text to mark where students should fill in answers. 
                    Define the correct answers for each blank below.
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Answer Fields</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Define the correct answers for each blank in order of appearance
                  </p>
                  <div className="space-y-3">
                    {fillBlankFields.map((field, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[80px]">
                          {field.label}:
                        </span>
                        <Input
                          value={field.answer}
                          onChange={(e) => updateFillBlankField(index, 'answer', e.target.value)}
                          placeholder={`Correct answer for ${field.label.toLowerCase()}`}
                          className="flex-1"
                        />
                        {fillBlankFields.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFillBlankField(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3"
                    onClick={addFillBlankField}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add another blank
                  </Button>
                </div>
                
                {fillBlankFields.some(field => field.answer.trim()) && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-green-700 dark:text-green-300">Preview Answers</Label>
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                        Correct answers (in order):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {fillBlankFields.filter(field => field.answer.trim()).map((field, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded border">
                            {index + 1}. {field.answer}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Drag and Drop Question Options */}
            {selectedType === 'drag_drop' && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Drop Zones</Label>
                  <div className="space-y-3 mt-2">
                    {dragDropZones.map((zone, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 min-w-[70px]">Zone {index + 1}:</span>
                        <Input
                          value={zone.zone}
                          onChange={(e) => updateDragDropZone(index, e.target.value)}
                          placeholder={`Drop zone ${index + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3"
                    onClick={addDragDropZone}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add drop zone
                  </Button>
                </div>

                <div>
                  <Label className="text-sm font-medium">Draggable Items</Label>
                  <div className="space-y-3 mt-2">
                    {dragDropItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 min-w-[70px]">Item {index + 1}:</span>
                        <Input
                          value={item}
                          onChange={(e) => updateDragDropItem(index, e.target.value)}
                          placeholder={`Draggable item ${index + 1}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3"
                    onClick={addDragDropItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add draggable item
                  </Button>
                </div>
              </div>
            )}

            {/* Tagging and Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a subject" />
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
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose difficulty level" />
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

              <FormField
                control={form.control}
                name="bloomsTaxonomy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bloom's Taxonomy</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select taxonomy" />
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

              <FormField
                control={form.control}
                name="gradeLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Additional Settings */}
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder="Optional"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>Leave empty for no time limit</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="explanation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Explanation (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3}
                      placeholder="Provide an explanation for the correct answer..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Attachment Section */}
            <div>
              <Label className="text-sm font-medium">Question Attachment (Optional)</Label>
              <p className="text-xs text-gray-600 mb-3">Upload a file that students can download when answering this question</p>
              
              {attachmentFile ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
                  <Paperclip className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium truncate">
                    {attachmentFile.name}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setAttachmentFile(null);
                      setAttachmentUrl('');
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={25 * 1024 * 1024} // 25MB
                  onGetUploadParameters={async () => {
                    const response = await fetch('/api/objects/upload', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await response.json();
                    return {
                      method: 'PUT' as const,
                      url: data.uploadURL
                    };
                  }}
                  onComplete={async (result) => {
                    if (result.successful && result.successful.length > 0) {
                      const file = result.successful[0];
                      setAttachmentFile(file.meta);
                      
                      // Convert upload URL to normalized object path
                      const uploadUrl = file.uploadURL || '';
                      try {
                        const response = await fetch('/api/objects/normalize-path', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path: uploadUrl })
                        });
                        const data = await response.json();
                        setAttachmentUrl(data.normalizedPath || uploadUrl);
                      } catch (error) {
                        console.error('Error normalizing path:', error);
                        setAttachmentUrl(uploadUrl);
                      }
                    }
                  }}
                  buttonClassName="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Attachment
                </ObjectUploader>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateQuestionMutation.isPending}>
                {updateQuestionMutation.isPending ? "Updating..." : "Update Question"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}