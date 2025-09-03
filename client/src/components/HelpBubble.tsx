import React, { useEffect, useState, useRef } from 'react';
import { useHelp } from '@/contexts/HelpContext';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';

interface HelpBubbleProps {
  children?: React.ReactNode;
}

export function HelpBubble({ children }: HelpBubbleProps) {
  const { 
    isHelpActive, 
    currentStep, 
    steps, 
    nextStep, 
    prevStep, 
    skipHelp,
    finishHelp 
  } = useHelp();
  
  const [bubblePosition, setBubblePosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isHelpActive || steps.length === 0) {
      setIsVisible(false);
      return;
    }

    const currentStepData = steps[currentStep];
    if (!currentStepData) return;

    const targetElement = document.querySelector(currentStepData.target);
    if (!targetElement) {
      // If target element not found, move to next step
      setTimeout(nextStep, 100);
      return;
    }

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect();
      const bubbleRect = bubbleRef.current?.getBoundingClientRect();
      
      if (!bubbleRect) return;

      let top = 0;
      let left = 0;

      switch (currentStepData.placement) {
        case 'top':
          top = rect.top - bubbleRect.height - 12;
          left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
          break;
        case 'bottom':
          top = rect.bottom + 12;
          left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
          break;
        case 'left':
          top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
          left = rect.left - bubbleRect.width - 12;
          break;
        case 'right':
          top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
          left = rect.right + 12;
          break;
      }

      // Ensure bubble stays within viewport
      const padding = 16;
      left = Math.max(padding, Math.min(left, window.innerWidth - bubbleRect.width - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - bubbleRect.height - padding));

      setBubblePosition({ top, left });
      setIsVisible(true);

      // Add highlight to target element
      targetElement.classList.add('help-highlight');
      
      // Scroll target into view if needed
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
    };

    // Delay positioning to ensure DOM is ready
    setTimeout(updatePosition, 100);

    // Cleanup function to remove highlights
    return () => {
      document.querySelectorAll('.help-highlight').forEach(el => {
        el.classList.remove('help-highlight');
      });
    };
  }, [isHelpActive, currentStep, steps, nextStep]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (isHelpActive && steps.length > 0) {
        const currentStepData = steps[currentStep];
        const targetElement = document.querySelector(currentStepData?.target || '');
        if (targetElement && bubbleRef.current) {
          // Re-calculate position on resize
          setTimeout(() => {
            const rect = targetElement.getBoundingClientRect();
            const bubbleRect = bubbleRef.current!.getBoundingClientRect();
            
            let top = 0;
            let left = 0;

            switch (currentStepData.placement) {
              case 'top':
                top = rect.top - bubbleRect.height - 12;
                left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
                break;
              case 'bottom':
                top = rect.bottom + 12;
                left = rect.left + (rect.width / 2) - (bubbleRect.width / 2);
                break;
              case 'left':
                top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
                left = rect.left - bubbleRect.width - 12;
                break;
              case 'right':
                top = rect.top + (rect.height / 2) - (bubbleRect.height / 2);
                left = rect.right + 12;
                break;
            }

            const padding = 16;
            left = Math.max(padding, Math.min(left, window.innerWidth - bubbleRect.width - padding));
            top = Math.max(padding, Math.min(top, window.innerHeight - bubbleRect.height - padding));

            setBubblePosition({ top, left });
          }, 50);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isHelpActive, currentStep, steps]);

  if (!isHelpActive || steps.length === 0 || !isVisible) {
    return <>{children}</>;
  }

  const currentStepData = steps[currentStep];
  if (!currentStepData) return <>{children}</>;

  return (
    <>
      {children}
      
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      
      {/* Help Bubble */}
      <div
        ref={bubbleRef}
        className="fixed z-50 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 p-4 animate-in fade-in-0 slide-in-from-bottom-2"
        style={{
          top: `${bubblePosition.top}px`,
          left: `${bubblePosition.left}px`,
        }}
        data-testid="help-bubble"
      >
        {/* Arrow pointer */}
        <div 
          className={`absolute w-3 h-3 bg-white border transform rotate-45 ${
            currentStepData.placement === 'top' 
              ? 'bottom-[-7px] left-1/2 -translate-x-1/2 border-b border-r border-gray-200' 
              : currentStepData.placement === 'bottom'
              ? 'top-[-7px] left-1/2 -translate-x-1/2 border-t border-l border-gray-200'
              : currentStepData.placement === 'left'
              ? 'right-[-7px] top-1/2 -translate-y-1/2 border-r border-b border-gray-200'
              : 'left-[-7px] top-1/2 -translate-y-1/2 border-l border-t border-gray-200'
          }`}
        />
        
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{currentStepData.title}</h3>
          </div>
          <button
            onClick={skipHelp}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="help-close-button"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <p className="text-sm text-gray-700 mb-4">{currentStepData.content}</p>
        
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </div>
          <div className="flex gap-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={skipHelp}
            className="text-xs"
            data-testid="help-skip-button"
          >
            Skip Tour
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                className="text-xs"
                data-testid="help-prev-button"
              >
                <ChevronLeft className="w-3 h-3 mr-1" />
                Previous
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={currentStep === steps.length - 1 ? finishHelp : nextStep}
              className="text-xs bg-blue-600 hover:bg-blue-700"
              data-testid="help-next-button"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}