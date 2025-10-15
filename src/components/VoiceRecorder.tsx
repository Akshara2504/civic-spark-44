import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  language?: string;
}

const VoiceRecorder = ({ onTranscriptChange, language = 'en-US' }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Voice recording not supported in this browser');
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = language;

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' ';
        } else {
          interimTranscript += transcriptPiece;
        }
      }

      const newTranscript = transcript + finalTranscript;
      setTranscript(newTranscript);
      onTranscriptChange(newTranscript + interimTranscript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Voice recording error: ' + event.error);
      setIsRecording(false);
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Voice recording not available');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success('Recording started');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        onClick={toggleRecording}
        variant={isRecording ? "destructive" : "outline"}
        size="sm"
        className={isRecording ? 'animate-pulse' : ''}
      >
        {isRecording ? (
          <>
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-4 h-4 mr-2" />
            Start Voice Input
          </>
        )}
      </Button>
      {isRecording && (
        <span className="text-sm text-muted-foreground flex items-center">
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          Listening...
        </span>
      )}
    </div>
  );
};

export default VoiceRecorder;
