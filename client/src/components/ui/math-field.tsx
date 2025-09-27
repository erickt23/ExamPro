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

      // Set initial value
      if (value !== mathField.value) {
        mathField.value = value;
      }

      // Configure mathfield
      mathField.readonly = readonly;
      mathField.mathVirtualKeyboardPolicy = 'manual';

      // Event handlers
      const handleInput = (event: Event) => {
        const target = event.target as any;
        if (onChange) {
          onChange(target.value);
        }
      };

      const handleFocus = () => {
        if (!readonly && window.mathVirtualKeyboard) {
          window.mathVirtualKeyboard.show();
        }
        if (onFocus) onFocus();
      };

      const handleBlur = () => {
        if (window.mathVirtualKeyboard) {
          window.mathVirtualKeyboard.hide();
        }
        if (onBlur) onBlur();
      };

      mathField.addEventListener('input', handleInput);
      mathField.addEventListener('focusin', handleFocus);
      mathField.addEventListener('focusout', handleBlur);

      return () => {
        mathField.removeEventListener('input', handleInput);
        mathField.removeEventListener('focusin', handleFocus);
        mathField.removeEventListener('focusout', handleBlur);
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