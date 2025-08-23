import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
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
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Info, ChevronDown } from "lucide-react";

interface ImportQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ImportQuestionsModal({ open, onOpenChange }: ImportQuestionsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [showFormatInstructions, setShowFormatInstructions] = useState(false);

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
          title: t('importQuestions.importSuccessful'),
          description: t('importQuestions.questionsImported', { count: results.imported }),
        });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t('importQuestions.unauthorized'),
          description: t('importQuestions.loggedOut'),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: t('importQuestions.importFailed'),
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
    setShowFormatInstructions(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('importQuestions.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Format Instructions Toggle */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              onClick={() => setShowFormatInstructions(!showFormatInstructions)}
              className="w-full justify-between p-3 h-auto border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <span className="font-medium">
                {showFormatInstructions ? t('importQuestions.hideFormatInstructions') : t('importQuestions.showFormatInstructions')}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFormatInstructions ? 'rotate-180' : ''}`} />
            </Button>
            
            {/* Collapsible Excel Format Information */}
            {showFormatInstructions && (
              <Alert className="animate-in slide-in-from-top-2 duration-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>{t('importQuestions.excelFormatRequired')}</strong> {t('importQuestions.excelFormatDescription')}
                  <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                    <li><strong>title</strong> - {t('importQuestions.columnTitle')}</li>
                    <li><strong>questionText</strong> - {t('importQuestions.columnQuestionText')}</li>
                    <li><strong>questionType</strong> - {t('importQuestions.columnQuestionType')}</li>
                    <li><strong>subject</strong> - {t('importQuestions.columnSubject')}</li>
                    <li><strong>difficulty</strong> - {t('importQuestions.columnDifficulty')}</li>
                    <li><strong>bloomsTaxonomy</strong> - {t('importQuestions.columnBloomsTaxonomy')}</li>
                    <li><strong>points</strong> - {t('importQuestions.columnPoints')}</li>
                    <li><strong>options</strong> - {t('importQuestions.columnOptions')}</li>
                    <li><strong>correctAnswer</strong> - {t('importQuestions.columnCorrectAnswer')}</li>
                    <li><strong>explanation</strong> - {t('importQuestions.columnExplanation')}</li>
                    <li><strong>category</strong> - {t('importQuestions.columnCategory')}</li>
                  </ul>
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">{t('importQuestions.advancedQuestionTypes')}</p>
                    <ul className="text-xs space-y-1 text-blue-700 dark:text-blue-200">
                      <li><strong>Matching:</strong> {t('importQuestions.matchingFormat')}</li>
                      <li><strong>Ranking:</strong> {t('importQuestions.rankingFormat')}</li>
                      <li><strong>Drag & Drop:</strong> {t('importQuestions.dragDropFormat')}</li>
                      <li><strong>Fill in Blank:</strong> {t('importQuestions.fillBlankFormat')}</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('importQuestions.selectExcelFile')}</label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {selectedFile && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
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
                <span className="text-sm">{t('importQuestions.processingFile')}</span>
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
                  {t('importQuestions.questionsImported', { count: importResults.imported })}
                  {importResults.warnings && importResults.warnings.length > 0 && (
                    <span className="text-yellow-700"> • {t('importQuestions.duplicatesSkipped', { count: importResults.warnings.length })}</span>
                  )}
                  {importResults.errors.length > 0 && (
                    <span className="text-red-700"> • {t('importQuestions.errorsOccurred', { count: importResults.errors.length })}</span>
                  )}
                </AlertDescription>
              </Alert>

              {importResults.warnings && importResults.warnings.length > 0 && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {t('importQuestions.duplicateQuestionsSkipped', { count: importResults.warnings.length })}
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {importResults.warnings.map((warning: any, index: number) => (
                          <li key={index}>{t('importQuestions.row')} {warning.row}: {warning.message}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('importQuestions.errorsOccurredDetails', { count: importResults.errors.length })}
                    <div className="mt-2 max-h-40 overflow-y-auto">
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {importResults.errors.map((error: any, index: number) => (
                          <li key={index}>{t('importQuestions.row')} {error.row}: {error.message}</li>
                        ))}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            {importResults ? t('importQuestions.close') : t('common.cancel')}
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={!selectedFile || importMutation.isPending}
          >
            {importMutation.isPending ? t('importQuestions.importing') : t('importQuestions.importQuestions')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}