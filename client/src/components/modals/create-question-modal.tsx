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
  DialogDescription,
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
import { useTranslation } from "@/hooks/useTranslation";
import { MathField } from "@/components/ui/math-field";

const createQuestionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(['multiple_choice', 'short_answer', 'essay', 'fill_blank', 'matching', 'ranking', 'drag_drop', 'stem']),
  category: z.enum(['exam', 'homework']),
  options: z.union([z.array(z.string()), z.string()]).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  attachmentUrl: z.string().optional(),
  subjectId: z.number().min(1, "Please select a subject"),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  bloomsTaxonomy: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
  gradeLevel: z.enum(['pre_k', 'kindergarten', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate']).optional(),
  points: z.number().min(1).default(1),
  timeLimit: z.number().optional(),
});

type CreateQuestionForm = z.infer<typeof createQuestionSchema>;

interface CreateQuestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionCategory: 'exam' | 'homework';
}

export default function CreateQuestionModal({ open, onOpenChange, questionCategory }: CreateQuestionModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();

  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });
  const [selectedType, setSelectedType] = useState<string>('multiple_choice');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState('A');
  const [correctOptions, setCorrectOptions] = useState<string[]>(['A']); // For multiple correct answers
  const [attachmentFile, setAttachmentFile] = useState<any>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');
  
  // State for new question types
  const [matchingPairs, setMatchingPairs] = useState([{ left: '', right: '' }, { left: '', right: '' }]);
  const [rankingItems, setRankingItems] = useState(['', '']);
  const [dragDropZones, setDragDropZones] = useState([{ zone: '', items: [] as string[] }]);
  const [dragDropItems, setDragDropItems] = useState(['']);
  const [fillBlankFields, setFillBlankFields] = useState([{ label: 'Blank 1', answer: '' }, { label: 'Blank 2', answer: '' }]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const form = useForm<CreateQuestionForm>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: {
      title: '',
      questionText: '',
      questionType: 'multiple_choice',
      category: questionCategory,
      subjectId: subjects.length > 0 ? subjects[0].id : undefined,
      difficulty: 'medium',
      points: 1,
    },
  });

  // Update form default subject when subjects are loaded
  useEffect(() => {
    if (subjects.length > 0 && !form.getValues('subjectId')) {
      form.setValue('subjectId', subjects[0].id);
    }
  }, [subjects, form]);

  const createQuestionMutation = useMutation({
    mutationFn: async (data: CreateQuestionForm) => {
      let payload = { ...data } as any; // Allow dynamic properties
      
      if (data.questionType === 'multiple_choice') {
        payload.options = mcqOptions.filter(option => option.trim());
        // Support both single and multiple correct answers for backward compatibility
        if (correctOptions.length === 1) {
          payload.correctAnswer = correctOptions[0];
        } else {
          payload.correctAnswer = correctOptions.join(','); // Fallback for single field
          payload.correctAnswers = correctOptions; // New field for multiple answers
        }
      } else if (data.questionType === 'matching') {
        const validPairs = matchingPairs.filter(pair => pair.left.trim() && pair.right.trim());
        payload.options = JSON.stringify(validPairs);
        payload.correctAnswer = JSON.stringify(validPairs);
      } else if (data.questionType === 'ranking') {
        const validItems = rankingItems.filter(item => item.trim());
        payload.options = JSON.stringify(validItems);
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
        payload.options = JSON.stringify(optionsData);
        payload.correctAnswer = JSON.stringify(answerKeyData);
      }
      
      // Include attachment URL if present
      if (attachmentUrl) {
        payload.attachmentUrl = attachmentUrl;
      }
      
      await apiRequest("POST", "/api/questions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({
        title: t('common.success'),
        description: t('assignments.questionCreatedSuccessfully'),
      });
      form.reset();
      setMcqOptions(['', '', '', '']);
      setCorrectOption('A');
      setCorrectOptions(['A']);
      setMatchingPairs([{ left: '', right: '' }, { left: '', right: '' }]);
      setRankingItems(['', '']);
      setDragDropZones([{ zone: '', items: [''] }]);
      setDragDropItems(['']);
      setFillBlankFields([{ label: 'Blank 1', answer: '' }, { label: 'Blank 2', answer: '' }]);
      setAttachmentFile(null);
      setAttachmentUrl('');
      onOpenChange(false);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('questionCreation.loggedOutLoggingIn'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('assignments.failedToCreateQuestion'),
        variant: "destructive",
      });
    },
  });

  const questionTypes = [
    { value: 'multiple_choice', label: t('questionTypes.multipleChoice'), icon: List },
    { value: 'short_answer', label: t('questionTypes.shortAnswer'), icon: PenTool },
    { value: 'essay', label: t('questionTypes.essay'), icon: FileText },
    { value: 'fill_blank', label: t('questionTypes.fillInBlank'), icon: Pen },
    { value: 'matching', label: t('questionTypes.matching'), icon: Link },
    { value: 'ranking', label: t('questionTypes.ranking'), icon: ArrowUpDown },
    { value: 'drag_drop', label: t('questionTypes.dragAndDrop'), icon: Move3D },
    { value: 'stem', label: t('questionTypes.stem'), icon: Calculator },
  ];

  const onSubmit = (data: CreateQuestionForm) => {
    createQuestionMutation.mutate(data);
  };

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  // Helper functions for multiple correct answers
  const toggleCorrectOption = (option: string) => {
    setCorrectOptions(prev => {
      if (prev.includes(option)) {
        // Don't allow removing all correct answers
        if (prev.length === 1) return prev;
        return prev.filter(opt => opt !== option);
      } else {
        return [...prev, option].sort(); // Keep sorted for consistency
      }
    });
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
    setDragDropZones([...dragDropZones, { zone: '', items: [] }]);
  };

  // Toggle item assignment to zones for drag-drop questions
  const toggleItemInZone = (zoneIndex: number, item: string) => {
    setDragDropZones(prev => prev.map((zone, index) => {
      if (index === zoneIndex) {
        const isSelected = zone.items?.includes(item) || false;
        if (isSelected) {
          // Remove item from this zone
          return {
            ...zone,
            items: zone.items?.filter(i => i !== item) || []
          };
        } else {
          // Add item to this zone (and remove from other zones)
          const newZones = prev.map(z => ({
            ...z,
            items: z.items?.filter(i => i !== item) || []
          }));
          return {
            ...zone,
            items: [...(zone.items || []), item]
          };
        }
      } else {
        // Remove item from other zones
        return {
          ...zone,
          items: zone.items?.filter(i => i !== item) || []
        };
      }
    }));
  };

  const updateDragDropItem = (index: number, value: string) => {
    const newItems = [...dragDropItems];
    newItems[index] = value;
    setDragDropItems(newItems);
  };

  const addDragDropItem = () => {
    setDragDropItems([...dragDropItems, '']);
  };

  // Remove functions for drag-drop zones and items
  const removeDragDropZone = (index: number) => {
    if (dragDropZones.length > 1) {
      const newZones = dragDropZones.filter((_, i) => i !== index);
      setDragDropZones(newZones);
    }
  };

  const removeDragDropItem = (index: number) => {
    if (dragDropItems.length > 1) {
      const itemToRemove = dragDropItems[index];
      const newItems = dragDropItems.filter((_, i) => i !== index);
      setDragDropItems(newItems);
      
      // Remove the item from all zones
      const updatedZones = dragDropZones.map(zone => ({
        ...zone,
        items: zone.items?.filter(item => item !== itemToRemove) || []
      }));
      setDragDropZones(updatedZones);
    }
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
          <DialogTitle>{questionCategory === 'homework' ? t('assignments.createNewHomeworkQuestion') : t('assignments.createNewExamQuestion')}</DialogTitle>
          <DialogDescription>
            Create a new question for your {questionCategory}. Choose the question type and fill in the details below.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question Type */}
            <div>
              <Label className="text-sm font-medium">{t('assignments.questionType')}</Label>
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
                  <FormLabel>{t('assignments.questionTitle')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('assignments.enterQuestionTitle')} {...field} />
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
                    {t('assignments.questionText')}
                    {form.watch('questionType') === 'stem' && (
                      <span className="text-sm text-muted-foreground ml-2">
                        (Mathematical expressions supported)
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    {form.watch('questionType') === 'stem' ? (
                      <div className="relative">
                        <MathField
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Activate virtual keyboard to type Math expressions"
                          data-testid="input-question-text-math"
                          className="min-h-[200px] border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-900/10 focus-within:border-blue-400 dark:focus-within:border-blue-600 shadow-sm"
                          hideToolbar={true}
                          hideVirtualKeyboardToggle={true}
                        />
                        {/* Virtual Keyboard Button */}
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 w-24 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-blue-300 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 group"
                            onClick={() => {
                              console.log('Virtual Keyboard Button Clicked - Current local state:', keyboardVisible);
                              
                              if (!keyboardVisible) {
                                // SHOW keyboard
                                console.log('Attempting to SHOW keyboard...');
                                setKeyboardVisible(true);
                                
                                if (window.mathVirtualKeyboard) {
                                  try {
                                    window.mathVirtualKeyboard.show();
                                    console.log('MathLive show() called successfully');
                                  } catch (error) {
                                    console.error('Error showing keyboard:', error);
                                  }
                                }
                              } else {
                                // HIDE keyboard  
                                console.log('Attempting to HIDE keyboard...');
                                setKeyboardVisible(false);
                                
                                // Multiple methods to ensure keyboard closes
                                if (window.mathVirtualKeyboard) {
                                  try {
                                    // Method 1: Official API
                                    window.mathVirtualKeyboard.hide();
                                    console.log('MathLive hide() called');
                                  } catch (error) {
                                    console.error('Error hiding keyboard via API:', error);
                                  }
                                }
                                
                                // Method 2: Force hide via DOM manipulation
                                setTimeout(() => {
                                  const allPossibleSelectors = [
                                    'math-virtual-keyboard',
                                    '.ML__virtual-keyboard', 
                                    '.ml__virtual-keyboard',
                                    '.ML__keyboard',
                                    '[role="application"][aria-label*="keyboard"]',
                                    '[role="application"][aria-label*="Virtual"]',
                                    '.mathlive-keyboard',
                                    'div[data-ml-keyboard]'
                                  ];
                                  
                                  allPossibleSelectors.forEach(selector => {
                                    const elements = document.querySelectorAll(selector);
                                    elements.forEach((element) => {
                                      if (element) {
                                        console.log('Force hiding element:', selector);
                                        const htmlElement = element as HTMLElement;
                                        htmlElement.style.display = 'none !important';
                                        htmlElement.style.visibility = 'hidden !important';
                                        htmlElement.style.opacity = '0 !important';
                                        htmlElement.style.height = '0px !important';
                                        htmlElement.style.overflow = 'hidden !important';
                                        htmlElement.setAttribute('aria-hidden', 'true');
                                        htmlElement.classList.add('hidden');
                                      }
                                    });
                                  });
                                  
                                  console.log('DOM force hide completed');
                                }, 50);
                              }
                            }}
                            title="Toggle Virtual Keyboard"
                          >
                            <div className="flex flex-col items-center justify-center text-white">
                              <Calculator className="h-4 w-4 mb-0.5 group-hover:scale-110 transition-transform" />
                              <span className="text-[9px] font-medium leading-tight">Virtual Keyboard</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Textarea 
                        rows={4}
                        placeholder={t('assignments.enterYourQuestionHere')} 
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
                <Label className="text-sm font-medium">{t('assignments.answerOptions')}</Label>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {t('questionCreation.multipleCorrectHint')}
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
                          placeholder={`${t('assignments.enterOption')} ${letter}`}
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
                  {t('assignments.addAnotherOption')}
                </Button>
              </div>
            )}

            {/* Matching Question Options */}
            {selectedType === 'matching' && (
              <div>
                <Label className="text-sm font-medium">{t('assignments.matchingPairs')}</Label>
                <div className="space-y-3 mt-2">
                  {matchingPairs.map((pair, index) => (
                    <div key={index} className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                      <div>
                        <Label className="text-xs text-gray-500">{t('assignments.leftItem')}</Label>
                        <Input
                          value={pair.left}
                          onChange={(e) => updateMatchingPair(index, 'left', e.target.value)}
                          placeholder={`${t('assignments.item')} ${index + 1}`}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">{t('assignments.rightItem')}</Label>
                        <Input
                          value={pair.right}
                          onChange={(e) => updateMatchingPair(index, 'right', e.target.value)}
                          placeholder={`${t('assignments.match')} ${index + 1}`}
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
                          {t('assignments.removePair')}
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
                  {t('assignments.addAnotherPair')}
                </Button>
              </div>
            )}

            {/* Ranking Question Options */}
            {selectedType === 'ranking' && (
              <div>
                <Label className="text-sm font-medium">{t('assignments.itemsToRank')}</Label>
                <div className="space-y-3 mt-2">
                  {rankingItems.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <span className="text-sm font-medium text-gray-700 min-w-[30px]">{index + 1}.</span>
                      <Input
                        value={item}
                        onChange={(e) => updateRankingItem(index, e.target.value)}
                        placeholder={`${t('assignments.rankingItem')} ${index + 1}`}
                        className="flex-1"
                      />
                      {rankingItems.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRankingItem(index)}
                        >
                          {t('assignments.remove')}
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
                  {t('assignments.addAnotherItem')}
                </Button>
              </div>
            )}

            {/* Fill in the Blank Question Options */}
            {selectedType === 'fill_blank' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Label className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 block">
                    {t('assignments.instructions')}
                  </Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {t('assignments.useUnderscores')}
                  </p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">{t('assignments.answerFields')}</Label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    {t('assignments.defineCorrectAnswers')}
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
                          placeholder={`${t('assignments.correctAnswerFor')} ${field.label.toLowerCase()}`}
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
                            {t('assignments.remove')}
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
                    {t('assignments.addAnotherBlank')}
                  </Button>
                </div>
                
                {fillBlankFields.some(field => field.answer.trim()) && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-green-700 dark:text-green-300">{t('assignments.previewAnswers')}</Label>
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                        {t('assignments.correctAnswersInOrder')}
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
                  <Label className="text-sm font-medium">{t('assignments.dropZones')}</Label>
                  <div className="space-y-3 mt-2">
                    {dragDropZones.map((zone, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 min-w-[70px]">{t('assignments.zone')} {index + 1}:</span>
                        <Input
                          value={zone.zone}
                          onChange={(e) => updateDragDropZone(index, e.target.value)}
                          placeholder={`${t('assignments.dropZone')} ${index + 1}`}
                          className="flex-1"
                        />
                        {dragDropZones.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeDragDropZone(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    onClick={addDragDropZone}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('assignments.addDropZone')}
                  </Button>
                </div>

                <div>
                  <Label className="text-sm font-medium">{t('assignments.draggableItems')}</Label>
                  <div className="space-y-3 mt-2">
                    {dragDropItems.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700 min-w-[70px]">{t('assignments.item')} {index + 1}:</span>
                        <Input
                          value={item}
                          onChange={(e) => updateDragDropItem(index, e.target.value)}
                          placeholder={`${t('assignments.draggableItem')} ${index + 1}`}
                          className="flex-1"
                        />
                        {dragDropItems.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeDragDropItem(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                    onClick={addDragDropItem}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('assignments.addDraggableItem')}
                  </Button>
                </div>

                {/* Correct Answer Configuration for Drag-Drop */}
                {dragDropZones.length > 0 && dragDropItems.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium text-blue-700">{t('assignments.correctAnswerConfiguration')}</Label>
                    <p className="text-xs text-gray-600 mb-3">{t('assignments.assignEachItem')}</p>
                    {dragDropZones.some(zone => zone.zone.trim()) && dragDropItems.some(item => item.trim()) ? (
                      <div className="space-y-3">
                        {dragDropZones.map((zone, zoneIndex) => (
                          <div key={zoneIndex} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Label className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2 block">
                              {zone.zone || `Zone ${zoneIndex + 1}`}
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {dragDropItems.filter(item => item.trim()).map((item, itemIndex) => {
                                const isSelected = zone.items?.includes(item) || false;
                                return (
                                  <button
                                    key={itemIndex}
                                    type="button"
                                    onClick={() => toggleItemInZone(zoneIndex, item)}
                                    className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                                      isSelected
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                    }`}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {t('assignments.fillInAtLeastOneZone')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tagging and Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="subjectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('common.subject')}</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assignments.chooseASubject')} />
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
                    <FormLabel>{t('common.difficulty')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assignments.chooseDifficultyLevel')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">{t('difficulty.easy')}</SelectItem>
                        <SelectItem value="medium">{t('difficulty.medium')}</SelectItem>
                        <SelectItem value="hard">{t('difficulty.hard')}</SelectItem>
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
                    <FormLabel>{t('common.bloomsTaxonomy')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assignments.selectTaxonomy')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="remember">{t('blooms.remember')}</SelectItem>
                        <SelectItem value="understand">{t('blooms.understand')}</SelectItem>
                        <SelectItem value="apply">{t('blooms.apply')}</SelectItem>
                        <SelectItem value="analyze">{t('blooms.analyze')}</SelectItem>
                        <SelectItem value="evaluate">{t('blooms.evaluate')}</SelectItem>
                        <SelectItem value="create">{t('blooms.create')}</SelectItem>
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
                    <FormLabel>{t('common.points')}</FormLabel>
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
                    <FormLabel>{t('common.timeLimit')} ({t('questionCreation.minutes')})</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        placeholder={t('assignments.optional')}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormDescription>{t('assignments.leaveEmptyForNoTimeLimit')}</FormDescription>
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
                  <FormLabel>{t('questionCreation.explanation')} ({t('assignments.optional')})</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3}
                      placeholder={t('questionCreation.provideExplanation')} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Attachment Section */}
            <div>
              <Label className="text-sm font-medium">{t('questionCreation.questionAttachment')} ({t('assignments.optional')})</Label>
              <p className="text-xs text-gray-600 mb-3">{t('questionCreation.uploadFileDescription')}</p>
              
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
                    {t('assignments.remove')}
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
                  {t('questionCreation.uploadAttachment')}
                </ObjectUploader>
              )}
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
                disabled={createQuestionMutation.isPending}
                className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 text-indigo-700 hover:bg-gradient-to-r hover:from-blue-400/20 hover:to-indigo-500/20 hover:text-indigo-800 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                {t('questionCreation.saveAsDraft')}
              </Button>
              <Button 
                type="submit"
                disabled={createQuestionMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                {createQuestionMutation.isPending ? t('questionCreation.creating') : t('assignments.createQuestion')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
