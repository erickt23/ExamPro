"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const [mathLiveInteracting, setMathLiveInteracting] = React.useState(false);
  
  // Function to detect if target is related to MathLive
  const isMathLiveElement = React.useCallback((target: Element | null): boolean => {
    if (!target) return false;
    
    // Check element and all parents for MathLive classes/attributes
    let current: Element | null = target;
    while (current && current !== document.body) {
      // Check various MathLive selectors
      if (
        current.tagName?.toLowerCase() === 'math-virtual-keyboard' ||
        current.tagName?.toLowerCase() === 'math-field' ||
        current.closest?.('math-virtual-keyboard') ||
        current.closest?.('math-field') ||
        current.closest?.('.ML__virtual-keyboard') ||
        current.closest?.('.ml__virtual-keyboard') ||
        current.closest?.('.ML__keyboard') ||
        current.closest?.('.ML__keycap') ||
        current.closest?.('.ML__toolbar') ||
        current.closest?.('.ML__menu') ||
        current.closest?.('.ML__popup') ||
        current.closest?.('.ML__popover') ||
        current.closest?.('.mathfield') ||
        current.closest?.('.math-toolbar') ||
        current.closest?.('.math-keyboard') ||
        current.closest?.('[data-ml]') ||
        current.hasAttribute?.('data-ml') ||
        current.id?.includes('mathlive') ||
        current.className?.includes('ML__') ||
        current.className?.includes('ml__') ||
        current.className?.includes('mathfield') ||
        current.className?.includes('math-')
      ) {
        return true;
      }
      current = current.parentElement || null;
    }
    return false;
  }, []);
  
  // Effect to monitor MathLive interactions globally
  React.useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isMathLiveElement(e.target as Element)) {
        setMathLiveInteracting(true);
        // Reset after a short delay
        setTimeout(() => setMathLiveInteracting(false), 100);
      }
    };
    
    const handleDocumentFocus = (e: FocusEvent) => {
      if (isMathLiveElement(e.target as Element)) {
        setMathLiveInteracting(true);
        setTimeout(() => setMathLiveInteracting(false), 100);
      }
    };
    
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('focusin', handleDocumentFocus, true);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('focusin', handleDocumentFocus, true);
    };
  }, [isMathLiveElement]);

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      onPointerDownOutside={(e) => {
        // Always prevent modal from closing if MathLive is interacting or element is MathLive-related
        if (mathLiveInteracting || isMathLiveElement(e.target as Element)) {
          e.preventDefault();
          return;
        }
      }}
      onInteractOutside={(e) => {
        // Always prevent modal from closing if MathLive is interacting or element is MathLive-related
        if (mathLiveInteracting || isMathLiveElement(e.target as Element)) {
          e.preventDefault();
          return;
        }
      }}
      onEscapeKeyDown={(e) => {
        // Prevent escape from closing modal if MathLive is interacting
        if (mathLiveInteracting) {
          e.preventDefault();
          return;
        }
        
        // Check if virtual keyboard is open, if so don't close modal
        const keyboardElement = document.querySelector('math-virtual-keyboard') || 
                              document.querySelector('.ML__virtual-keyboard') ||
                              document.querySelector('.ml__virtual-keyboard') ||
                              document.querySelector('.mathfield') ||
                              document.querySelector('.math-keyboard') ||
                              document.querySelector('.ML__keyboard');
        if (keyboardElement) {
          const isVisible = keyboardElement.getAttribute('aria-hidden') !== 'true' &&
                           (keyboardElement as HTMLElement).style.display !== 'none' &&
                           (keyboardElement as HTMLElement).style.visibility !== 'hidden' &&
                           keyboardElement.getBoundingClientRect().height > 0;
          if (isVisible) {
            e.preventDefault();
            return;
          }
        }
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
