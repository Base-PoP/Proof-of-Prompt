'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language = 'code', children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success('코드가 복사되었습니다');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-4 not-prose">
      <div className="flex items-center justify-between bg-gray-200 text-gray-700 px-4 py-2 rounded-t-lg text-sm border border-gray-300 border-b-0">
        <span className="font-mono text-xs uppercase font-semibold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
          title="코드 복사"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="text-xs">복사됨</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">코드 복사</span>
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-100 text-gray-900 p-4 rounded-b-lg overflow-x-auto border border-gray-300 !mt-0">
        <code className="text-sm font-mono">{children}</code>
      </pre>
    </div>
  );
}
