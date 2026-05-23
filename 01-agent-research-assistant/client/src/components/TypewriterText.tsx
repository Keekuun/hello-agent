import { useState, useEffect, useRef, useCallback } from 'react';

interface TypewriterTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export function TypewriterText({ content, speed = 10, onComplete }: TypewriterTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const contentRef = useRef(content);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    contentRef.current = content;
    
    if (!content) {
      setDisplayedContent('');
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setDisplayedContent('');
    indexRef.current = 0;
    setIsComplete(false);
    cleanup();

    const animate = () => {
      const currentContent = contentRef.current;
      
      if (indexRef.current < currentContent.length) {
        const charsToAdd = Math.min(3, currentContent.length - indexRef.current);
        const nextIndex = indexRef.current + charsToAdd;
        setDisplayedContent(currentContent.slice(0, nextIndex));
        indexRef.current = nextIndex;
        
        timerRef.current = window.setTimeout(animate, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    timerRef.current = window.setTimeout(animate, speed);

    return cleanup;
  }, [content, speed, onComplete, cleanup]);

  if (!content) return null;

  return (
    <div>
      {displayedContent}
      {!isComplete && (
        <span className="ml-0.5 inline-block w-0.5 h-4 bg-blue-500 animate-pulse" />
      )}
    </div>
  );
}