import { useEffect, useRef, forwardRef, useState } from 'react';
import 'mathlive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

interface MathFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  readonly?: boolean;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
  onBlur?: () => void;
  onFocus?: () => void;
}

const MathField = forwardRef<HTMLElement, MathFieldProps>(
  ({ value = '', onChange, readonly = false, placeholder = '', className, 'data-testid': testId, onBlur, onFocus }, ref) => {
    const mathFieldRef = useRef<any>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const toggleVirtualKeyboard = () => {
      if (window.mathVirtualKeyboard) {
        if (!isKeyboardVisible) {
          window.mathVirtualKeyboard.show();
          setIsKeyboardVisible(true);
        } else {
          // Use the stored original hide function
          if ((window.mathVirtualKeyboard as any).manualHide) {
            (window.mathVirtualKeyboard as any).manualHide.call(window.mathVirtualKeyboard);
          } else {
            window.mathVirtualKeyboard.hide();
          }
          setIsKeyboardVisible(false);
        }
      }
    };

    useEffect(() => {
      const mathField = mathFieldRef.current;
      if (!mathField) return;

      // Wait for MathLive to be fully loaded
      const initializeMathField = () => {
        try {
          // Set initial value safely
          if (value !== mathField.value) {
            mathField.value = value || '';
          }

          // Configure mathfield safely
          if (typeof mathField.readonly !== 'undefined') {
            mathField.readonly = readonly;
          }
          
          // Configuration for persistent virtual keyboard
          const config = {
            mathVirtualKeyboardPolicy: 'manual',
            virtualKeyboardMode: 'manual',
            virtualKeyboardLayout: 'symbols',
            virtualKeyboard: 'symbols',
            virtualKeyboardTargetOrigin: 'auto',
            menuItems: [],
            contextMenuPolicy: 'none',
            keybindings: [],
            readOnly: readonly,
            smartFence: true,
            smartMode: true,
            smartSuperscript: true
          };

          // Apply each configuration safely
          Object.keys(config).forEach(key => {
            try {
              if (typeof mathField[key] !== 'undefined') {
                mathField[key] = config[key as keyof typeof config];
              }
            } catch (configError) {
              // Silently ignore individual config errors
            }
          });

          // Additional safety: disable menu-related functions
          if (mathField.menuItems) {
            mathField.menuItems = [];
          }
          
          // Configure persistent virtual keyboard behavior
          if (window.mathVirtualKeyboard) {
            try {
              // Position keyboard on the right side and keep it persistent
              window.mathVirtualKeyboard.container = document.body;
              window.mathVirtualKeyboard.originValidator = () => true;
              window.mathVirtualKeyboard.targetOrigin = '*';
              
              // Force right-side positioning with CSS override
              const keyboardElement = document.querySelector('math-virtual-keyboard') || 
                                    document.querySelector('.ML__virtual-keyboard') ||
                                    document.querySelector('.ml__virtual-keyboard');
              if (keyboardElement) {
                (keyboardElement as HTMLElement).style.cssText = `
                  position: fixed !important;
                  right: 20px !important;
                  top: 50% !important;
                  transform: translateY(-50%) !important;
                  z-index: 99999 !important;
                  left: auto !important;
                  bottom: auto !important;
                `;
              }
              
              // Override the hide functionality to keep keyboard persistent
              const originalHide = window.mathVirtualKeyboard.hide;
              window.mathVirtualKeyboard.hide = function() {
                // Don't auto-hide - only hide when manually closed
                return false;
              };
              
              // Store original hide function for manual closing
              (window.mathVirtualKeyboard as any).manualHide = originalHide;
              
              // Handle clipboard permissions gracefully
              if (typeof navigator.clipboard !== 'undefined') {
                const originalWriteText = navigator.clipboard.writeText;
                navigator.clipboard.writeText = function(text: string) {
                  return originalWriteText.call(this, text).catch(() => {
                    // Silently fail clipboard operations to prevent error messages
                    return Promise.resolve();
                  });
                };
              }
              
            } catch (keyboardError) {
              // Silently handle keyboard configuration errors
            }
          }
          
        } catch (error) {
          console.warn('MathLive configuration error:', error);
        }
      };

      // Event handlers with safety checks
      const handleInput = (event: Event) => {
        try {
          const target = event.target as any;
          if (onChange && target && typeof target.value !== 'undefined') {
            onChange(target.value);
          }
        } catch (error) {
          console.warn('MathField input error:', error);
        }
      };

      const handleFocus = () => {
        try {
          // Skip virtual keyboard to prevent popover errors
          if (onFocus) onFocus();
        } catch (error) {
          console.warn('MathField focus error:', error);
          if (onFocus) onFocus();
        }
      };

      const handleBlur = () => {
        try {
          // Skip virtual keyboard to prevent popover errors
          if (onBlur) onBlur();
        } catch (error) {
          console.warn('MathField blur error:', error);
          if (onBlur) onBlur();
        }
      };

      // Initialize after a short delay to ensure MathLive is ready
      const timer = setTimeout(initializeMathField, 100);

      // Add event listeners safely
      try {
        mathField.addEventListener('input', handleInput);
        mathField.addEventListener('focusin', handleFocus);
        mathField.addEventListener('focusout', handleBlur);
      } catch (error) {
        console.warn('MathField event listener error:', error);
      }

      return () => {
        clearTimeout(timer);
        try {
          if (mathField && typeof mathField.removeEventListener === 'function') {
            mathField.removeEventListener('input', handleInput);
            mathField.removeEventListener('focusin', handleFocus);
            mathField.removeEventListener('focusout', handleBlur);
          }
        } catch (error) {
          console.warn('MathField cleanup error:', error);
        }
      };
    }, [value, onChange, readonly, onFocus, onBlur]);

    return (
      <div className="relative">
        <math-field
          ref={(el: any) => {
            mathFieldRef.current = el;
            if (typeof ref === 'function') {
              ref(el);
            } else if (ref) {
              (ref as any).current = el;
            }
          }}
          data-testid={testId}
          className={cn(
            "block w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-input dark:bg-background dark:text-foreground",
            readonly && "cursor-default",
            className
          )}
          style={{
            fontSize: '16px',
            lineHeight: '1.5',
            minHeight: '40px',
            fontFamily: 'inherit',
          }}
        >
          {placeholder && !value ? placeholder : value}
        </math-field>
        
        {/* Virtual Keyboard Toggle Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          onClick={toggleVirtualKeyboard}
          data-testid="toggle-virtual-keyboard"
        >
          <Calculator className={cn(
            "h-4 w-4", 
            isKeyboardVisible ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
          )} />
        </Button>
      </div>
    );
  }
);

MathField.displayName = 'MathField';

export { MathField };