import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (event.results[0].isFinal && onResult) {
          onResult(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        let errText = 'Speech recognition error';
        if (event.error === 'not-allowed') {
          errText = 'Microphone permission denied. Please allow microphone access.';
        } else if (event.error === 'no-speech') {
          errText = 'No speech detected. Please try again.';
        } else if (event.error === 'network') {
          errText = 'Network error during voice recognition.';
        } else {
          errText = `Recognition error: ${event.error}`;
        }
        setErrorMessage(errText);
        setIsListening(false);
        if (onError) onError(errText);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [onResult, onError]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setErrorMessage('Speech recognition is not supported in this browser.');
      return;
    }
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setErrorMessage(null);
      try {
        recognitionRef.current.start();
      } catch (e: any) {
        console.warn('Speech recognition start error:', e);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
  }, [isListening]);

  const cancelListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      setIsListening(false);
      setTranscript('');
    }
  }, [isListening]);

  return {
    isSupported,
    isListening,
    transcript,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
  };
}
