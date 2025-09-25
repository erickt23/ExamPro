import { useState, useEffect, useCallback, useRef } from 'react';

export interface ViolationLog {
  id: string;
  type: 'fullscreen_exit' | 'tab_switch' | 'window_blur' | 'context_menu' | 'devtools';
  timestamp: Date;
  description: string;
}

export interface ExamProctoringOptions {
  onWarning?: () => void;
  onAutoSubmit?: () => void;
  warningThreshold?: number;
  terminationThreshold?: number;
  enableFullscreen?: boolean;
  enableTabDetection?: boolean;
  enableContextMenuBlock?: boolean;
  enableDevToolsDetection?: boolean;
}

export interface ExamProctoringState {
  isFullscreen: boolean;
  violationCount: number;
  violations: ViolationLog[];
  isTerminated: boolean;
  showWarning: boolean;
}

export function useExamProctoring(options: ExamProctoringOptions = {}) {
  const {
    onWarning,
    onAutoSubmit,
    warningThreshold = 1,
    terminationThreshold = 3,
    enableFullscreen = true,
    enableTabDetection = true,
    enableContextMenuBlock = true,
    enableDevToolsDetection = true,
  } = options;

  const [state, setState] = useState<ExamProctoringState>({
    isFullscreen: false,
    violationCount: 0,
    violations: [],
    isTerminated: false,
    showWarning: false,
  });

  const warningShownRef = useRef(false);
  const terminatedRef = useRef(false);
  const prevIsFullscreenRef = useRef(false);

  // Generate unique violation ID
  const generateViolationId = () => {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Log a violation
  const logViolation = useCallback((type: ViolationLog['type'], description: string) => {
    if (terminatedRef.current) return;

    const violation: ViolationLog = {
      id: generateViolationId(),
      type,
      timestamp: new Date(),
      description,
    };

    setState(prevState => {
      const newViolations = [...prevState.violations, violation];
      const newViolationCount = newViolations.length;

      // Handle warning threshold
      if (newViolationCount === warningThreshold && !warningShownRef.current) {
        warningShownRef.current = true;
        onWarning?.();
        return {
          ...prevState,
          violations: newViolations,
          violationCount: newViolationCount,
          showWarning: true,
        };
      }

      // Handle termination threshold
      if (newViolationCount >= terminationThreshold && !terminatedRef.current) {
        terminatedRef.current = true;
        setTimeout(() => {
          onAutoSubmit?.();
        }, 100);
        return {
          ...prevState,
          violations: newViolations,
          violationCount: newViolationCount,
          isTerminated: true,
        };
      }

      return {
        ...prevState,
        violations: newViolations,
        violationCount: newViolationCount,
      };
    });
  }, [warningThreshold, terminationThreshold, onWarning, onAutoSubmit]);

  // Enter fullscreen
  const enterFullscreen = useCallback(async () => {
    if (!enableFullscreen) return;

    try {
      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.warn('Failed to enter fullscreen:', error);
    }
  }, [enableFullscreen]);

  // Exit fullscreen
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.warn('Failed to exit fullscreen:', error);
    }
  }, []);

  // Handle fullscreen change
  const handleFullscreenChange = useCallback(() => {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );

    setState(prevState => ({ ...prevState, isFullscreen: isCurrentlyFullscreen }));

    // Log violation if exiting fullscreen unexpectedly
    if (!isCurrentlyFullscreen && prevIsFullscreenRef.current && enableFullscreen) {
      logViolation('fullscreen_exit', 'Student exited fullscreen mode');
    }

    // Update the ref for next time
    prevIsFullscreenRef.current = isCurrentlyFullscreen;
  }, [enableFullscreen, logViolation]);

  // Handle visibility change (tab switching)
  const handleVisibilityChange = useCallback(() => {
    if (!enableTabDetection) return;

    if (document.hidden) {
      logViolation('tab_switch', 'Student switched to another tab or minimized window');
    }
  }, [enableTabDetection, logViolation]);

  // Handle window blur (switching windows)
  const handleWindowBlur = useCallback(() => {
    if (!enableTabDetection) return;

    logViolation('window_blur', 'Student switched to another window or application');
  }, [enableTabDetection, logViolation]);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!enableContextMenuBlock) return;

    e.preventDefault();
    logViolation('context_menu', 'Student attempted to open context menu');
  }, [enableContextMenuBlock, logViolation]);

  // Handle keyboard shortcuts (detect potential devtools opening)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableDevToolsDetection) return;

    // Detect common devtools shortcuts
    const isDevToolsShortcut = 
      (e.key === 'F12') ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U') || // View source
      (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')); // Mac shortcuts

    if (isDevToolsShortcut) {
      e.preventDefault();
      logViolation('devtools', `Student attempted to use developer tools shortcut: ${e.key}`);
    }
  }, [enableDevToolsDetection, logViolation]);

  // Start proctoring
  const startProctoring = useCallback(async () => {
    if (terminatedRef.current) return;

    // Initialize fullscreen ref
    prevIsFullscreenRef.current = false;

    // Enter fullscreen
    await enterFullscreen();

    // Set fullscreen ref after entering fullscreen
    setTimeout(() => {
      prevIsFullscreenRef.current = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).msFullscreenElement
      );
    }, 100);

    // Add event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Prevent common shortcuts
    const preventShortcuts = (e: KeyboardEvent) => {
      // Prevent refresh, back, forward, etc.
      if (
        (e.ctrlKey && (e.key === 'r' || e.key === 'R')) ||
        (e.key === 'F5') ||
        (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) ||
        (e.ctrlKey && (e.key === 'w' || e.key === 'W'))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', preventShortcuts);

    console.log('Exam proctoring started');
  }, [
    enterFullscreen,
    handleFullscreenChange,
    handleVisibilityChange,
    handleWindowBlur,
    handleContextMenu,
    handleKeyDown,
  ]);

  // Stop proctoring
  const stopProctoring = useCallback(async () => {
    // Remove event listeners
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('keydown', handleKeyDown);

    // Exit fullscreen
    await exitFullscreen();

    console.log('Exam proctoring stopped');
  }, [
    handleFullscreenChange,
    handleVisibilityChange,
    handleWindowBlur,
    handleContextMenu,
    handleKeyDown,
    exitFullscreen,
  ]);

  // Get violations for server submission
  const getViolationsForSubmission = useCallback(() => {
    return {
      violations: state.violations.map(v => ({
        type: v.type,
        timestamp: v.timestamp.toISOString(),
        description: v.description,
      })),
      totalViolations: state.violationCount,
      isTerminatedForViolations: state.isTerminated,
    };
  }, [state.violations, state.violationCount, state.isTerminated]);

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setState(prevState => ({ ...prevState, showWarning: false }));
  }, []);

  // Reset proctoring state
  const resetProctoring = useCallback(() => {
    setState({
      isFullscreen: false,
      violationCount: 0,
      violations: [],
      isTerminated: false,
      showWarning: false,
    });
    warningShownRef.current = false;
    terminatedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, [stopProctoring]);

  return {
    ...state,
    startProctoring,
    stopProctoring,
    resetProctoring,
    getViolationsForSubmission,
    dismissWarning,
    enterFullscreen,
    exitFullscreen,
  };
}