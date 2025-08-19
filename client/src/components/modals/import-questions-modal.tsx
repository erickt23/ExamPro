import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Info } from "lucide-react";

interface ImportQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportQuestionsModal({ open, onOpenChange }: ImportQuestionsModalProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/questions/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`${response.status}: ${errorData.message || response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (results) => {
      setImportResults(results);
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      
      if (results.imported > 0) {
        toast({
          title: "Import Successful",
          description: `${results.imported} questions imported successfully`,
        });
      }
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
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResults(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setImportResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Questions from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Excel Format Information */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Excel Format Required:</strong> Your Excel file should have these columns:
              <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                <li><strong>title</strong> - Question title</li>
                <li><strong>questionText</strong> - The actual question</li>
                <li><strong>questionType</strong> - multiple_choice, short_answer, essay, fill_blank, matching, ranking, or drag_drop</li>
                <li><strong>subject</strong> - Subject name (e.g., "Mathematics", "Physics", "History")</li>
                <li><strong>difficulty</strong> - easy, medium, or hard (optional, defaults to medium)</li>
                <li><strong>bloomsTaxonomy</strong> - remember, understand, apply, analyze, evaluate, create (optional)</li>
                <li><strong>points</strong> - Point value (optional, defaults to 1)</li>
                <li><strong>options</strong> - For multiple choice, separated by semicolons (e.g., "Paris;London;Berlin;Madrid")</li>
                <li><strong>correctAnswer</strong> - For multiple choice (A, B, C, D), matching/ranking (JSON format), or fill_blank (pipe-separated)</li>
                <li><strong>explanation</strong> - Optional explanation text</li>
                <li><strong>category</strong> - 'exam' or 'homework' (optional, defaults to 'exam')</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium text-blue-800 mb-2">Advanced Question Types:</p>
                <ul className="text-xs space-y-1 text-blue-700">
                  <li><strong>Matching:</strong> options: "Left1;Left2|Right1;Right2", correctAnswer: JSON format</li>
                  <li><strong>Ranking:</strong> options: "Item1;Item2;Item3", correctAnswer: Array format</li>
                  <li><strong>Drag & Drop:</strong> options: "Category1;Category2|Item1;Item2", correctAnswer: Object format</li>
                  <li><strong>Fill in Blank:</strong> correctAnswer: "answer1|answer2|answer3" (for multiple blanks)</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Excel File</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-gray-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Processing Excel file...</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Results */}
          {importResults && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{importResults.imported}</strong> questions imported successfully
                </AlertDescription>
              </Alert>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResults.errors.length}</strong> errors occurred:
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {importResults.errors.slice(0, 10).map((error: any, index: number) => (
                          <li key={index}>Row {error.row}: {error.message}</li>
                        ))}
                        {importResults.errors.length > 10 && (
                          <li>... and {importResults.errors.length - 10} more errors</li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              {importResults ? "Close" : "Cancel"}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!selectedFile || importMutation.isPending}
            >
              {importMutation.isPending ? "Importing..." : "Import Questions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}