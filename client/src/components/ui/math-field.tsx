import { useEffect, useRef, forwardRef, useState } from 'react';
import 'mathlive';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calculator, Plus, Square, Sigma, Pi } from 'lucide-react';

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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    const toggleVirtualKeyboard = () => {
      if (window.mathVirtualKeyboard) {
        if (!isKeyboardVisible) {
          // Show keyboard
          window.mathVirtualKeyboard.show();
          
          // Ensure it's visible after showing
          const keyboardElement = document.querySelector('math-virtual-keyboard') || 
                                document.querySelector('.ML__virtual-keyboard') ||
                                document.querySelector('.ml__virtual-keyboard');
          if (keyboardElement) {
            (keyboardElement as HTMLElement).style.display = 'block';
            (keyboardElement as HTMLElement).style.visibility = 'visible';
            (keyboardElement as HTMLElement).style.opacity = '1';
          }
          
          setIsKeyboardVisible(true);
        } else {
          // Hide keyboard
          const keyboardElement = document.querySelector('math-virtual-keyboard') || 
                                document.querySelector('.ML__virtual-keyboard') ||
                                document.querySelector('.ml__virtual-keyboard');
          if (keyboardElement) {
            (keyboardElement as HTMLElement).style.display = 'none';
            (keyboardElement as HTMLElement).style.visibility = 'hidden';
            (keyboardElement as HTMLElement).style.opacity = '0';
          }
          
          // Also try the original hide function if available
          if ((window.mathVirtualKeyboard as any).originalHide) {
            try {
              (window.mathVirtualKeyboard as any).originalHide.call(window.mathVirtualKeyboard);
            } catch (e) {
              // Silently fail if hide doesn't work
            }
          }
          
          setIsKeyboardVisible(false);
        }
      }
    };

    useEffect(() => {
      const mathField = mathFieldRef.current;
      if (!mathField) return;

      // Configure MathLive font loading before field initialization
      if (window.MathfieldElement && typeof window.MathfieldElement.fontsDirectory !== 'undefined') {
        try {
          // Set the fonts directory to use the correct Vite path
          window.MathfieldElement.fontsDirectory = null; // Let MathLive auto-detect
          console.log('MathLive fonts directory configured');
        } catch (error) {
          console.warn('Could not configure MathLive fonts directory:', error);
        }
      }

      // Also try global configuration
      if ((window as any).ml) {
        try {
          (window as any).ml.configure({
            fontsDirectory: null, // Auto-detect
          });
        } catch (error) {
          console.warn('Could not configure MathLive globally:', error);
        }
      }

      // Wait for MathLive to be fully loaded
      const initializeMathField = () => {
        try {
          // Set initial value safely with LaTeX validation
          const cleanValue = value || '';
          if (cleanValue !== mathField.value) {
            try {
              // Sanitize and validate LaTeX before setting
              const sanitizedValue = cleanValue.replace(/\\placeholder\{\}/g, '');
              mathField.value = sanitizedValue;
            } catch (latexError) {
              console.warn('LaTeX parsing error, setting empty value:', latexError);
              mathField.value = '';
            }
          }

          // Configure mathfield safely
          if (typeof mathField.readonly !== 'undefined') {
            mathField.readonly = readonly;
          }
          
          // Apply configuration directly to mathField (MathLive 0.107.0+ format)
          try {
            // Basic configuration - only set what we know works
            mathField.readOnly = readonly;
            mathField.smartFence = true;
            mathField.smartMode = true;
            mathField.smartSuperscript = true;
            mathField.mathVirtualKeyboardPolicy = 'manual';
            
            // Don't override the default menu - let MathLive handle it
            // The default menu should include mathematical functions
            
          } catch (error) {
            console.warn('MathLive configuration error:', error);
          }

          // Apply theme styling to shadow DOM elements and fix menu z-index
          try {
            if (mathField.shadowRoot) {
              const style = document.createElement('style');
              style.textContent = `
                .ML__toolbar,
                .ml__toolbar,
                .ML__menu,
                .ml__menu {
                  background: hsl(var(--background, 0 0% 100%)) !important;
                  border-color: hsl(var(--border, 214.3 31.8% 91.4%)) !important;
                  color: hsl(var(--foreground, 222.2 84% 4.9%)) !important;
                  z-index: 999999 !important;
                }
                
                .ML__toolbar-button,
                .ml__toolbar-button {
                  color: hsl(var(--foreground, 222.2 84% 4.9%)) !important;
                }
                
                .ML__toolbar-button:hover,
                .ml__toolbar-button:hover {
                  background: hsl(var(--accent, 210 40% 98%)) !important;
                }
                
                .ML__popup,
                .ml__popup,
                .ML__popover,
                .ml__popover {
                  z-index: 999999 !important;
                  background: hsl(var(--background, 0 0% 100%)) !important;
                  border: 1px solid hsl(var(--border, 214.3 31.8% 91.4%)) !important;
                  border-radius: 6px !important;
                  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
                  position: fixed !important;
                }
              `;
              mathField.shadowRoot.appendChild(style);
            }
          } catch (e) {
            // Silently ignore styling errors
          }
          
          // Prevent popover errors by intercepting and handling them safely
          const originalShowPopover = (HTMLElement.prototype as any).showPopover;
          if (originalShowPopover) {
            (HTMLElement.prototype as any).showPopover = function(options?: any) {
              try {
                if (this.isConnected && this.offsetParent !== null) {
                  return originalShowPopover.call(this, options);
                }
              } catch (error: any) {
                // Silently handle popover errors to prevent runtime crashes
                console.debug('Popover operation skipped:', error.message);
              }
            };
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
              
              // Store original hide function and override to prevent auto-hide
              if (!((window.mathVirtualKeyboard as any).originalHide)) {
                (window.mathVirtualKeyboard as any).originalHide = window.mathVirtualKeyboard.hide;
              }
              
              // Override hide to prevent auto-hiding
              window.mathVirtualKeyboard.hide = function() {
                // Don't auto-hide - only hide when manually called from toggle
                return false;
              };
              
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

    // Close virtual keyboard when clicking outside the MathField component
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Element;
        
        // Don't close if keyboard is not visible
        if (!isKeyboardVisible) return;
        
        // Check if click is outside the MathField container
        if (containerRef.current && !containerRef.current.contains(target)) {
          // Also check if click is not on virtual keyboard itself
          const isVirtualKeyboardClick = target.closest('math-virtual-keyboard') ||
                                       target.closest('.ML__virtual-keyboard') ||
                                       target.closest('.ml__virtual-keyboard') ||
                                       target.closest('.ML__keyboard') ||
                                       target.closest('.ML__keycap') ||
                                       target.closest('.mathfield') ||
                                       (target.tagName && target.tagName.toLowerCase() === 'math-virtual-keyboard');
          
          // Only close if not clicking on virtual keyboard
          if (!isVirtualKeyboardClick) {
            // Close the virtual keyboard
            const keyboardElement = document.querySelector('math-virtual-keyboard') || 
                                  document.querySelector('.ML__virtual-keyboard') ||
                                  document.querySelector('.ml__virtual-keyboard');
            if (keyboardElement) {
              (keyboardElement as HTMLElement).style.display = 'none';
              (keyboardElement as HTMLElement).style.visibility = 'hidden';
              (keyboardElement as HTMLElement).style.opacity = '0';
            }
            
            // Also try the original hide function if available
            if ((window.mathVirtualKeyboard as any).originalHide) {
              try {
                (window.mathVirtualKeyboard as any).originalHide.call(window.mathVirtualKeyboard);
              } catch (e) {
                // Silently fail if hide doesn't work
              }
            }
            
            setIsKeyboardVisible(false);
          }
        }
      };

      // Add event listener
      document.addEventListener('mousedown', handleClickOutside);
      
      // Cleanup
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isKeyboardVisible]);

    // Function to insert mathematical expressions
    const insertMath = (latex: string) => {
      if (mathFieldRef.current && !readonly) {
        try {
          mathFieldRef.current.insert(latex);
          if (onChange) {
            onChange(mathFieldRef.current.value);
          }
        } catch (error) {
          console.warn('Error inserting LaTeX:', error);
        }
      }
    };

    return (
      <div ref={containerRef} className="relative">
        {/* Mathematical Functions Toolbar - Only show when not readonly */}
        {!readonly && (
          <div className="flex flex-wrap gap-1 mb-2 p-2 bg-muted/50 rounded-md border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\frac{\\placeholder{numerator}}{\\placeholder{denominator}}')}
              title="Insert Fraction"
              className="h-8 px-2"
            >
              ½
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\sqrt{\\placeholder{}}')}
              title="Insert Square Root"
              className="h-8 px-2"
            >
              √
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('^{\\placeholder{}}')}
              title="Insert Superscript"
              className="h-8 px-2"
            >
              x²
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('_{\\placeholder{}}')}
              title="Insert Subscript"
              className="h-8 px-2"
            >
              x₁
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\int_{\\placeholder{a}}^{\\placeholder{b}} \\placeholder{f(x)} \\, dx')}
              title="Insert Integral"
              className="h-8 px-2"
            >
              ∫
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\sum_{\\placeholder{n=1}}^{\\placeholder{\\infty}} \\placeholder{}')}
              title="Insert Sum"
              className="h-8 px-2"
            >
              <Sigma className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\log_{\\placeholder{}} \\placeholder{}')}
              title="Insert Logarithm"
              className="h-8 px-2"
            >
              log
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\sin \\placeholder{}')}
              title="Insert Sine"
              className="h-8 px-2"
            >
              sin
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\cos \\placeholder{}')}
              title="Insert Cosine"
              className="h-8 px-2"
            >
              cos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertMath('\\begin{pmatrix} \\placeholder{} & \\placeholder{} \\\\ \\placeholder{} & \\placeholder{} \\end{pmatrix}')}
              title="Insert 2×2 Matrix"
              className="h-8 px-2"
            >
              [ ]
            </Button>
          </div>
        )}
        
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
            "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            !readonly && "pr-10", // Only add right padding when button is present
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
        
        {/* Virtual Keyboard Toggle Button - Only show when not readonly */}
        {!readonly && (
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
        )}
      </div>
    );
  }
);

MathField.displayName = 'MathField';

export { MathField };