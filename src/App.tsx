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
    const instance = new Vapi('09eed585-d93a-4af8-940b-b8e742d5710e');
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
        vapi.start('748a009d-05cb-4dcd-bb39-111e7427cc2a');
        
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/assests/background.png')`,
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      </div>

      {/* R-SYSTEMS Logo */}
      <div className="absolute top-8 left-8 z-10">
        <img 
          src="/assests/logo.png" 
          alt="R-SYSTEMS" 
          className="h-12 w-auto"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Controls */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-lg w-full px-8">
          {finalScore !== undefined && (
            <div className="mb-6 bg-white bg-opacity-95 p-6 rounded-xl shadow-lg">
              <h2 className="text-xl font-bold text-center mb-4 text-gray-800">PHQ-9 Assessment Results</h2>
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
          
          {!finalScore && !isConnected && (
            <div className="mb-8">
              {/* Chatbot Icon */}
              <div className="flex justify-center mb-6">
                <div className="bg-white bg-opacity-20 p-4 rounded-full backdrop-blur-sm border border-white border-opacity-30">
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <circle cx="9" cy="9" r="1.5"/>
                    <circle cx="15" cy="9" r="1.5"/>
                    <path d="M8 13.5h8v1H8z"/>
                  </svg>
                </div>
              </div>
              
              {/* Greeting Message */}
              <div className="text-center mb-8">
                {/* <h1 className="text-3xl font-bold text-white mb-4">Good evening!</h1> */}
                <p className="text-xs text-white text-opacity-90"></p>
                <p className="text-xl text-white text-opacity-90">Can I help you with anything?</p>
              </div>
            </div>
          )}
          
          {!isConnected ? (
            <div>
              <button
                onClick={startCall}
                disabled={isLoading}
                className={`w-full py-4 px-8 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                  isLoading 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Please Wait! Connecting Best AI Agent ...
                  </div>
                ) : (
                  'USME ordering system'
                )}
              </button>
              {isLoading && (
                <div className="text-center text-sm text-white text-opacity-90 mt-4 bg-black bg-opacity-30 p-3 rounded-lg backdrop-blur-sm">
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
            <div className="bg-white bg-opacity-95 p-6 rounded-xl shadow-lg backdrop-blur-sm">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  <span className="text-lg font-medium text-gray-800">
                    {isSpeaking ? 'Assistant Speaking...' : 'Listening...'}
                  </span>
                </div>
                <button
                  onClick={endCall}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition-all duration-300 font-semibold hover:scale-105"
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
      </div>

      {/* Bottom Right - Chat */}
      <div
        style={{
          height: '80vh',
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000,
        }}
        className="w-80 bg-white bg-opacity-20 shadow-2xl border border-white border-opacity-30 backdrop-blur-lg rounded-xl"
      >
        <div className="h-full flex flex-col">
          <div className="bg-white bg-opacity-30 p-3 border-b border-white border-opacity-20 rounded-t-xl backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white">Conversation</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {transcript.length === 0 ? (
              <p className="text-white text-opacity-70 text-center text-sm">Conversation will appear here...</p>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className="mb-3">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-500 bg-opacity-80 text-white rounded-br-none backdrop-blur-sm'
                          : 'bg-white bg-opacity-80 text-gray-800 rounded-bl-none backdrop-blur-sm'
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
