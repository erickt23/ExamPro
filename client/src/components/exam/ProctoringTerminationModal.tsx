import { XCircle, AlertTriangle, Clock, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProctoringTerminationModalProps {
  isOpen: boolean;
  violationCount: number;
  onClose: () => void;
}

export default function ProctoringTerminationModal({
  isOpen,
  violationCount,
  onClose,
}: ProctoringTerminationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="proctoring-termination-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Exam Terminated
          </DialogTitle>
          <DialogDescription>
            Your exam has been automatically submitted due to policy violations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Exam Ended:</strong> Too many proctoring violations detected.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileX className="h-4 w-4 text-gray-500" />
              <span>Total violations: <strong className="text-red-600">{violationCount}</strong></span>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-gray-500" />
                What happens next:
              </div>
              <ul className="text-sm text-gray-600 space-y-1 ml-6">
                <li>• Your exam has been automatically submitted</li>
                <li>• All answers up to this point have been saved</li>
                <li>• The violation log has been recorded</li>
                <li>• Your instructor will be notified</li>
              </ul>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>Academic Integrity:</strong> This incident will be reviewed according to your institution's academic integrity policy. If you believe this was an error, contact your instructor immediately.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <Button 
            onClick={onClose}
            variant="outline"
            data-testid="button-acknowledge-termination"
          >
            Return to Exam List
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}