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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, List, PenTool, FileText, Pen, Upload, Paperclip } from "lucide-react";
import CreateSubjectModal from "./create-subject-modal";
import { ObjectUploader } from "@/components/ObjectUploader";

const createQuestionSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  questionText: z.string().min(1, "Question text is required"),
  questionType: z.enum(['multiple_choice', 'short_answer', 'essay', 'fill_blank']),
  category: z.enum(['exam', 'homework']),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  attachmentUrl: z.string().optional(),
  subjectId: z.number().min(1, "Subject is required"),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  bloomsTaxonomy: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']).optional(),
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
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["/api/subjects"],
    retry: false,
  });
  const [selectedType, setSelectedType] = useState<string>('multiple_choice');
  const [mcqOptions, setMcqOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState('A');
  const [attachmentFile, setAttachmentFile] = useState<any>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string>('');

  const form = useForm<CreateQuestionForm>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: {
      title: '',
      questionText: '',
      questionType: 'multiple_choice',
      category: questionCategory,
      subjectId: 1,
      difficulty: 'medium',
      points: 1,
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: CreateQuestionForm) => {
      let payload = { ...data };
      
      if (data.questionType === 'multiple_choice') {
        payload.options = mcqOptions.filter(option => option.trim());
        payload.correctAnswer = correctOption;
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
        title: "Success",
        description: "Question created successfully",
      });
      form.reset();
      setMcqOptions(['', '', '', '']);
      setCorrectOption('A');
      setAttachmentFile(null);
      setAttachmentUrl('');
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
        description: "Failed to create question",
        variant: "destructive",
      });
    },
  });

  const questionTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: List },
    { value: 'short_answer', label: 'Short Answer', icon: PenTool },
    { value: 'essay', label: 'Essay', icon: FileText },
    { value: 'fill_blank', label: 'Fill in Blank', icon: Pen },
  ];

  const onSubmit = (data: CreateQuestionForm) => {
    createQuestionMutation.mutate(data);
  };

  const updateMcqOption = (index: number, value: string) => {
    const newOptions = [...mcqOptions];
    newOptions[index] = value;
    setMcqOptions(newOptions);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New {questionCategory === 'homework' ? 'Homework' : 'Exam'} Question</DialogTitle>
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
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4}
                      placeholder="Enter your question here..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multiple Choice Options */}
            {selectedType === 'multiple_choice' && (
              <div>
                <Label className="text-sm font-medium">Answer Options</Label>
                <div className="space-y-3 mt-2">
                  {mcqOptions.map((option, index) => {
                    const letter = String.fromCharCode(65 + index); // A, B, C, D
                    return (
                      <div key={index} className="flex items-center space-x-3">
                        <RadioGroup 
                          value={correctOption} 
                          onValueChange={setCorrectOption}
                          className="flex"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={letter} id={`option-${letter}`} />
                          </div>
                        </RadioGroup>
                        <span className="text-sm font-medium text-gray-700 min-w-[20px]">{letter}.</span>
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

            {/* Tagging and Categorization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                disabled={createQuestionMutation.isPending}
              >
                Save as Draft
              </Button>
              <Button 
                type="submit"
                disabled={createQuestionMutation.isPending}
              >
                {createQuestionMutation.isPending ? "Creating..." : "Create Question"}
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
