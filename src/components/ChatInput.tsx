import React, { useState, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const EXAMPLE_PROMPTS = [
  'Turn off the living room light',
  'Set temperature to 23 degrees',
  'Dim living room light to 30%, set thermostat to 26°C, and lock front door',
  'Unlock the front door',
  'Activate leaving home routine',
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  disabled = false,
}) => {
  const [input, setInput] = useState('');

  const {
    isSupported,
    isListening,
    transcript,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
  } = useSpeechRecognition({
    onResult: (text) => {
      setInput(text);
    },
  });

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    if (isListening) stopListening();
    const messageToSend = input.trim();
    setInput('');
    onSend(messageToSend);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      {/* Listening status notice */}
      {isListening && (
        <div className="flex items-center justify-between text-xs px-3 py-1.5 rounded-md bg-cyan-950/40 border border-cyan-800/50 text-cyan-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Listening to voice command... speak now</span>
          </div>
          <button
            type="button"
            onClick={cancelListening}
            className="text-slate-400 hover:text-white underline text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Voice error notice */}
      {errorMessage && (
        <div className="text-xs text-amber-400 px-3 py-1 bg-amber-950/30 border border-amber-900/40 rounded-md">
          {errorMessage}
        </div>
      )}

      {/* Input composer bar */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : 'Type or speak a smart-home command...'}
          disabled={isLoading || disabled}
          className="w-full bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 text-slate-100 placeholder-slate-500 text-sm rounded-lg pl-4 pr-24 py-2.5 outline-none transition-colors disabled:opacity-60"
        />

        {/* Action icons right-aligned inside/beside */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Microphone button */}
          {isSupported && (
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isLoading || disabled}
              title={isListening ? 'Stop listening' : 'Start voice input'}
              className={`p-1.5 rounded-md transition-colors ${
                isListening
                  ? 'bg-cyan-500 text-slate-950 animate-pulse'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={!input.trim() || isLoading || disabled}
            title="Send command"
            className="p-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>

      {/* Quick suggestions */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Try an example command:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSend(prompt)}
              disabled={isLoading || disabled}
              className="text-left text-xs text-slate-400 hover:text-slate-200 bg-slate-900/50 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
