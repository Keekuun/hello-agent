import { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { normalizeMarkdown } from '../utils/markdownNormalize';

interface StreamingMarkdownProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

function cleanIncompleteMarkdown(text: string): string {
  let cleaned = normalizeMarkdown(text);
  
  // 计算未闭合的 ** 数量
  const boldMarkers = cleaned.match(/\*\*/g);
  if (boldMarkers && boldMarkers.length % 2 !== 0) {
    // 有未闭合的 **，移除最后一个
    const lastIdx = cleaned.lastIndexOf('**');
    cleaned = cleaned.slice(0, lastIdx) + cleaned.slice(lastIdx + 2);
  }
  
  // 计算未闭合的 * 数量（排除 **）
  const singleStars = cleaned.replace(/\*\*/g, '').match(/\*/g);
  if (singleStars && singleStars.length % 2 !== 0) {
    const lastIdx = cleaned.lastIndexOf('*');
    cleaned = cleaned.slice(0, lastIdx) + cleaned.slice(lastIdx + 1);
  }
  
  // 处理未闭合的 `
  const backticks = cleaned.match(/`/g);
  if (backticks && backticks.length % 2 !== 0) {
    const lastIdx = cleaned.lastIndexOf('`');
    cleaned = cleaned.slice(0, lastIdx) + cleaned.slice(lastIdx + 1);
  }
  
  // 处理未闭合的 [
  const openBrackets = (cleaned.match(/\[/g) || []).length;
  const closeBrackets = (cleaned.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    // 移除多余的 [
    let remaining = openBrackets - closeBrackets;
    for (let i = cleaned.length - 1; i >= 0 && remaining > 0; i--) {
      if (cleaned[i] === '[') {
        cleaned = cleaned.slice(0, i) + cleaned.slice(i + 1);
        remaining--;
      }
    }
  }
  
  return cleaned;
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
        const rawContent = currentContent.slice(0, nextIndex);
        setDisplayedContent(cleanIncompleteMarkdown(rawContent));
        indexRef.current = nextIndex;
        
        timerRef.current = window.setTimeout(animate, speed);
      } else {
        setDisplayedContent(cleanIncompleteMarkdown(currentContent));
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
      <div>
        <MarkdownRenderer content={displayedContent} />
      </div>
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-text-bottom" />
      )}
    </div>
  );
}