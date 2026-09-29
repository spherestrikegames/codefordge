import React, { useState } from 'react';
import { Sparkles, Send, Bot, Check, Copy, ArrowRight, CornerDownLeft, Loader2, Lightbulb, Code2 } from 'lucide-react';
import { Snippet, SupportedLanguage } from '../types';

interface AiCopilotAgentProps {
  currentSnippet: Snippet | null;
  onApplyCode?: (codeSnippet: string, targetTab?: 'html' | 'css' | 'js') => void;
  className?: string;
  isCompact?: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AiCopilotAgent: React.FC<AiCopilotAgentProps> = ({
  currentSnippet,
  onApplyCode,
  className = '',
  isCompact = false
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Hello! I'm your CodeForge AI Agent.**
I can guide you on what to build next and give step-by-step code implementations for HTML, CSS, JavaScript, and Python.

Click a suggestion below or ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = promptToSend || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    if (!promptToSend) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text.trim(),
          title: currentSnippet?.title || 'Project',
          language: currentSnippet?.language || 'web',
          html: currentSnippet?.html || '',
          css: currentSnippet?.css || '',
          js: currentSnippet?.js || '',
          code: currentSnippet?.code || ''
        })
      });

      if (!res.ok) throw new Error('AI service error');
      const data = await res.json();

      const agentReply: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'assistant',
        content: data.suggestion || 'Here are some ideas and steps you can take.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, agentReply]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          role: 'assistant',
          content: 'Unable to reach AI Agent right now. Check your internet connection or verify the Gemini configuration.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (codeText: string, id: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 1500);
  };

  // Quick suggestion prompts
  const suggestions = currentSnippet?.language === 'python' ? [
    '💡 What features should I add to this Python script?',
    '⚡ Optimize algorithm and add data visualizations',
    '🧪 Write unit tests and input validation'
  ] : [
    '💡 Suggest 3 next features for this web app',
    '⚡ Add interactive JavaScript functionality',
    '🎨 Improve CSS styling with sleek animations',
    '🐛 Review code and check for bugs'
  ];

  return (
    <div className={`flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden ${className}`}>
      {/* Agent Header */}
      <div className="px-4 py-3 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>CodeForge Copilot</span>
              <span className="text-[10px] font-normal text-emerald-400 bg-emerald-950/50 px-1.5 py-0.2 rounded border border-emerald-800/40">
                Gemini 3.8
              </span>
            </div>
          </div>
        </div>

        {currentSnippet && (
          <span className="text-[11px] font-mono text-neutral-400 uppercase">
            {currentSnippet.language}
          </span>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[95%] rounded-lg p-3 leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-neutral-950 border border-neutral-800 text-neutral-200'
              }`}
            >
              {/* Parse markdown-style text, bullets, and code blocks */}
              <div className="whitespace-pre-wrap space-y-1.5">
                {msg.content.split('```').map((part, index) => {
                  if (index % 2 === 1) {
                    // Code block
                    const lines = part.trim().split('\n');
                    const langHeader = lines[0].match(/^[a-z]+/i) ? lines[0] : '';
                    const rawCode = langHeader ? lines.slice(1).join('\n') : part;
                    const codeId = `${msg.id}-${index}`;

                    return (
                      <div key={index} className="my-2 rounded-md bg-neutral-900 border border-neutral-800 overflow-hidden font-mono text-[11.5px]">
                        <div className="px-2.5 py-1 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-neutral-400 text-[10px]">
                          <span>{langHeader || 'code'}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyCode(rawCode, codeId)}
                              className="hover:text-white flex items-center gap-1"
                            >
                              {copiedCodeId === codeId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedCodeId === codeId ? 'Copied' : 'Copy'}</span>
                            </button>
                            {onApplyCode && (
                              <button
                                onClick={() => onApplyCode(rawCode)}
                                className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 ml-2"
                              >
                                <span>Apply</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-2.5 overflow-x-auto text-emerald-300">
                          <code>{rawCode}</code>
                        </div>
                      </div>
                    );
                  }
                  return <span key={index}>{part}</span>;
                })}
              </div>
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span>AI Copilot is analyzing your code and generating suggestions...</span>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="p-2 bg-neutral-950/60 border-t border-neutral-800 flex gap-1.5 overflow-x-auto">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendPrompt(sug.replace(/^[^\w]+/, ''))}
            disabled={isLoading}
            className="px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] whitespace-nowrap transition-colors border border-neutral-700/60 disabled:opacity-50"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-2.5 bg-neutral-950 border-t border-neutral-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask AI: 'How do I add a timer?', 'Suggest next feature'..."
            disabled={isLoading}
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !inputPrompt.trim()}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
