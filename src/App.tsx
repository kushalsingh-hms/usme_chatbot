import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

function App() {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [finalScore, setFinalScore] = useState<number | undefined>(undefined);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // Initialize audio context for Windows compatibility
  const initializeAudio = async () => {
    try {
      // Create audio context to ensure audio is properly initialized
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if it's suspended (common on Windows)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      setAudioInitialized(true);
      setAudioError(null);
      console.log('🔊 Audio context initialized successfully');
      
      // Test audio playback capability
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0; // Silent test
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      
      audioContext.close();
    } catch (error) {
      console.error('❗ Audio initialization failed:', error);
      setAudioError('Audio initialization failed. Please check your audio settings.');
    }
  };

  useEffect(() => {
    const instance = new Vapi('25179bc7-b44c-4c1e-b701-2bf1f9a77bd1');
    setVapi(instance);

    console.log('✅ Vapi instance initialized');

    instance.on('call-start', () => {
      console.log('✅ Call started');
      setIsConnected(true);
      setIsLoading(false);
      setAudioError(null);
    });

    instance.on('call-end', () => {
      console.log('🛑 Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
      setIsLoading(false);
    });

    instance.on('speech-start', () => {
      console.log('🗣️ Assistant started speaking');
      setIsSpeaking(true);
      setAudioError(null); // Clear any audio errors when speech starts
    });

    instance.on('speech-end', () => {
      console.log('🔇 Assistant stopped speaking');
      setIsSpeaking(false);
    });

    instance.on('message', (message) => {
      console.log('📩 New message:', message);
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role,
            text: message.transcript,
          },
        ]);

        if (message.role === 'assistant' && message.transcript.toLowerCase().includes('your total score')) {
          const score = message.transcript.match(/\d+/)?.[0];
          if (score) {
            console.log('🏆 Final score detected:', score);
            setFinalScore(Number(score));
            setIsConnected(false);
            setIsSpeaking(false);
            instance.stop();
          }
        }
      }
    });

    // Debug logs for internal transport states
    instance.on('send-transport-state-change' as any, (state: any) => {
      console.log('📡 Send transport state changed:', state);
    });
    instance.on('recv-transport-state-change' as any, (state: any) => {
      console.log('📡 Receive transport state changed:', state);
    });

    instance.on('error', (error) => {
      console.error('❗ Vapi error:', error);
      setIsLoading(false);
      
      // Enhanced error handling for Windows audio issues
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      if (errorMessage.toLowerCase().includes('audio') || 
          errorMessage.toLowerCase().includes('microphone') ||
          errorMessage.toLowerCase().includes('media')) {
        setAudioError('Audio/Microphone error detected. Please check your audio settings and permissions.');
      } else if (errorMessage.toLowerCase().includes('connection') ||
                errorMessage.toLowerCase().includes('network')) {
        setAudioError('Connection error. Please check your internet connection.');
      } else {
        setAudioError(`Error: ${errorMessage}`);
      }
    });

    return () => {
      console.log('🧹 Cleaning up Vapi instance');
      instance.stop();
    };
  }, []);

  const startCall = async () => {
    if (vapi) {
      try {
        console.log('📞 Starting call...');
        setIsLoading(true);
        setAudioError(null);
        
        // Initialize audio context for Windows compatibility
        if (!audioInitialized) {
          await initializeAudio();
        }
        
        // Start the call
        vapi.start('a3f9406b-f3d2-40ec-9239-772cd6c6b8b9');
        
        // Set a timeout to check if speech starts (Windows audio detection)
        const speechTimeout = setTimeout(() => {
          if (isConnected && !isSpeaking) {
            console.warn('⚠️ No speech detected after 30 seconds - potential Windows audio issue');
            setAudioError('No audio detected. If you can\'t hear the assistant, try refreshing the page or checking your audio settings.');
          }
        }, 30000);
        
        // Clear timeout when speech starts or call ends
        const clearTimeoutOnSpeech = () => clearTimeout(speechTimeout);
        vapi.on('speech-start', clearTimeoutOnSpeech);
        vapi.on('call-end', clearTimeoutOnSpeech);
        
      } catch (error) {
        console.error('❗ Failed to start call:', error);
        setIsLoading(false);
        setAudioError('Failed to start call. Please try again.');
      }
    }
  };

  const endCall = () => {
    if (vapi) {
      console.log('⛔ Stopping call...');
      vapi.stop();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left side - Controls */}
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
          {finalScore !== undefined && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-center mb-4">PHQ-9 Assessment Results</h2>
              <div className="flex flex-col items-center">
                <div className="w-64 h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Your Score', value: finalScore },
                          { name: 'Remaining', value: 27 - finalScore },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        <Cell fill="#EF4444" />
                        <Cell fill="#E5E7EB" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-800">{finalScore}/27</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {finalScore <= 4
                      ? 'Minimal Depression'
                      : finalScore <= 9
                      ? 'Mild Depression'
                      : finalScore <= 14
                      ? 'Moderate Depression'
                      : finalScore <= 19
                      ? 'Moderately Severe Depression'
                      : 'Severe Depression'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    This is not a diagnosis. Please consult a healthcare professional.
                  </p>
                </div>
              </div>
            </div>
          )}
          <br />
          {!isConnected ? (
            <div>
              <button
                onClick={startCall}
                disabled={isLoading}
                className={`w-full py-3 px-6 rounded-lg transition-colors ${
                  isLoading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Please Wait! Connecting Best AI Agent ...
                  </div>
                ) : (
                  'Start Voice Assessment'
                )}
              </button>
              {isLoading && (
                <div className="text-center text-sm text-gray-600 mt-3">
                  It might take 15-20 sec to connect the best AI agent
                </div>
              )}
              {audioError && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Audio Issue Detected</h3>
                      <div className="mt-1 text-sm text-yellow-700">{audioError}</div>
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            setAudioError(null);
                            initializeAudio();
                          }}
                          className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
                        >
                          Try Fix Audio
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isSpeaking ? 'Assistant Speaking...' : 'Listening...'}
                  </span>
                </div>
                <button
                  onClick={endCall}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                >
                  End Call
                </button>
              </div>
              {audioError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Audio Not Working?</h3>
                      <div className="mt-1 text-sm text-red-700">{audioError}</div>
                      <div className="mt-2 text-xs text-red-600">
                        <strong>Windows troubleshooting:</strong>
                        <br />• Check speaker volume and ensure it's not muted
                        <br />• Try a different browser (Edge, Firefox)
                        <br />• Refresh the page and try again
                        <br />• Check Windows audio settings
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Chat */}
      <div
        style={{
          height: '100vh',
          overflowY: 'scroll',
          position: 'fixed',
          right: 0,
          top: 0,
          zIndex: 1000,
        }}
        className="w-96 bg-white shadow-xl border-l border-gray-200"
      >
        <div className="h-full flex flex-col">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Conversation</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {transcript.length === 0 ? (
              <p className="text-gray-500 text-center">Conversation will appear here...</p>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className="mb-4">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">{msg.role === 'user' ? 'You' : 'Assistant'}</div>
                      <div>{msg.text}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
