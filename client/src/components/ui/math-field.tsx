import { useEffect, useRef, forwardRef } from 'react';
import 'mathlive';
import { cn } from '@/lib/utils';

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
          
          // Set virtual keyboard policy if available
          if (typeof mathField.mathVirtualKeyboardPolicy !== 'undefined') {
            mathField.mathVirtualKeyboardPolicy = 'manual';
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
          if (!readonly && typeof window !== 'undefined' && window.mathVirtualKeyboard && typeof window.mathVirtualKeyboard.show === 'function') {
            window.mathVirtualKeyboard.show();
          }
          if (onFocus) onFocus();
        } catch (error) {
          console.warn('MathField focus error:', error);
          if (onFocus) onFocus();
        }
      };

      const handleBlur = () => {
        try {
          if (typeof window !== 'undefined' && window.mathVirtualKeyboard && typeof window.mathVirtualKeyboard.hide === 'function') {
            window.mathVirtualKeyboard.hide();
          }
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
    );
  }
);

MathField.displayName = 'MathField';

export { MathField };