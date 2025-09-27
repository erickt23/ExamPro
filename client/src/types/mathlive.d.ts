// TypeScript declarations for MathLive integration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<MathfieldElement>, MathfieldElement> & {
        onInput?: (event: Event) => void;
        onChange?: (event: Event) => void;
        ref?: React.Ref<MathfieldElement>;
        value?: string;
        readonly?: boolean;
        'virtual-keyboard-mode'?: 'auto' | 'manual' | 'onfocus' | 'off';
        'virtual-keyboard-policy'?: 'auto' | 'manual' | 'sandboxed';
        'data-testid'?: string;
      };
    }
  }
}

declare module 'mathlive' {
  export interface MathfieldElement extends HTMLElement {
    value: string;
    readonly: boolean;
    mathVirtualKeyboardPolicy: 'auto' | 'manual' | 'sandboxed';
    executeCommand(command: string): boolean;
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;
  }

  export interface MathfieldConfig {
    virtualKeyboardMode?: 'auto' | 'manual' | 'onfocus' | 'off';
    mathVirtualKeyboardPolicy?: 'auto' | 'manual' | 'sandboxed';
  }

  export const MathfieldElement: {
    new(): MathfieldElement;
  };
}

export {};