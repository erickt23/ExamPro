import { AlertTriangle, Shield, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProctoringWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  violationCount: number;
  maxViolations: number;
  onReturnToFullscreen: () => void;
}

export default function ProctoringWarningModal({
  isOpen,
  onClose,
  violationCount,
  maxViolations,
  onReturnToFullscreen,
}: ProctoringWarningModalProps) {
  const remainingViolations = maxViolations - violationCount;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" data-testid="proctoring-warning-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Exam Proctoring Warning
          </DialogTitle>
          <DialogDescription>
            Your exam activity is being monitored for academic integrity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50">
            <Shield className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Warning:</strong> Suspicious activity detected during your exam.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 text-gray-500" />
              <span>Violations detected: <strong>{violationCount}</strong></span>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                You have <strong>{remainingViolations}</strong> violation{remainingViolations !== 1 ? 's' : ''} remaining before your exam is automatically submitted.
              </p>
            </div>

            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">Monitored activities include:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Leaving fullscreen mode</li>
                <li>Switching to other tabs or windows</li>
                <li>Using developer tools</li>
                <li>Opening context menus</li>
              </ul>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-800">
                <strong>To continue:</strong> Stay in fullscreen mode and focus only on your exam. 
                Avoid switching tabs, opening other applications, or leaving this page.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-acknowledge-warning"
          >
            I Understand
          </Button>
          <Button 
            onClick={() => {
              onReturnToFullscreen();
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="button-return-fullscreen"
          >
            Return to Fullscreen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}