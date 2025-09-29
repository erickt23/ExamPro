// MathLive global configuration for font loading

// Configure MathLive font loading to work with Vite
export function configureMathLive() {
  // Wait for MathLive to be available
  if (typeof window !== 'undefined') {
    const configureWhenReady = () => {
      try {
        // Method 1: Configure via MathfieldElement
        if ((window as any).MathfieldElement) {
          // Let MathLive auto-detect fonts directory 
          // This works better with Vite than hardcoded paths
          if (typeof (window as any).MathfieldElement.fontsDirectory !== 'undefined') {
            (window as any).MathfieldElement.fontsDirectory = null;
          }
          
          // Additional configuration to ensure proper loading
          if ((window as any).MathfieldElement.configure) {
            (window as any).MathfieldElement.configure({
              fontsDirectory: null, // Auto-detect
              mathVirtualKeyboardPolicy: 'manual',
              virtualKeyboardToggleGlyph: null, // Remove keyboard toggle icon
              menuToggleGlyph: null, // Remove menu toggle icon  
              virtualKeyboardMode: 'manual',
            });
          }
        }

        // Method 2: Try global ml configuration
        if ((window as any).ml && typeof (window as any).ml.configure === 'function') {
          (window as any).ml.configure({
            fontsDirectory: null, // Auto-detect
          });
        }

        console.log('MathLive fonts configured successfully');
        
      } catch (error) {
        console.warn('MathLive configuration warning (may be safe to ignore):', error);
      }
    };

    // Try to configure immediately if MathLive is already loaded
    if ((window as any).MathfieldElement) {
      configureWhenReady();
    } else {
      // Wait for MathLive to load
      setTimeout(configureWhenReady, 100);
      
      // Also listen for DOMContentLoaded if not already loaded
      if (document.readyState !== 'complete') {
        document.addEventListener('DOMContentLoaded', configureWhenReady);
      }
    }
  }
}

// Auto-configure when this module is imported
configureMathLive();