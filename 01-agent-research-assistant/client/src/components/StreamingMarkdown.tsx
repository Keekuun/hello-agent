import { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StreamingMarkdownProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export function StreamingMarkdown({ content, speed = 8, onComplete }: StreamingMarkdownProps) {
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
        const charsToAdd = Math.min(5, currentContent.length - indexRef.current);
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
    <div className="relative">
      <div className={isComplete ? '' : 'opacity-95'}>
        <MarkdownRenderer content={displayedContent} />
      </div>
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}