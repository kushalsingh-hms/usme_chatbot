import React, { useState, useEffect } from 'react';
import Vapi from '@vapi-ai/web';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

function App() {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [finalScore, setFinalScore] = useState<number | undefined>(undefined);
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([]);

  useEffect(() => {
    // const vapiInstance = new Vapi('011af9cc-b706-4a52-b345-ea137f671f3f'); // kushal.singh@rsystems.com
    const vapiInstance = new Vapi('25179bc7-b44c-4c1e-b701-2bf1f9a77bd1'); // kps678304@gmail.com
    setVapi(vapiInstance);

    vapiInstance.on('call-start', () => {
      console.log('Call started');
      setIsConnected(true);
    });

    vapiInstance.on('call-end', () => {
      console.log('Call ended');
      setIsConnected(false);
      setIsSpeaking(false);
    });

    vapiInstance.on('speech-start', () => {
      console.log('Assistant started speaking');
      setIsSpeaking(true);
    });

    vapiInstance.on('speech-end', () => {
      console.log('Assistant stopped speaking');
      setIsSpeaking(false);
    });

    vapiInstance.on('message', (message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        setTranscript(prev => [...prev, {
          role: message.role,
          text: message.transcript
        }]);

        if (message.role === 'assistant' && message.transcript.toLowerCase().includes('your total score')) {
          const score = message.transcript.match(/\d+/)?.[0];
          setFinalScore(Number(score));
          setIsConnected(false);
          setIsSpeaking(false);
          vapiInstance?.stop();
          if (vapi) {
            vapi.stop();
          }
        }
      }
    });

    vapiInstance.on('error', (error) => {
      console.error('Vapi error:', error);
    });

    return () => {
      vapiInstance?.stop();
    };
  }, []);

  const startCall = () => {
    if (vapi) {
      // vapi.start('57986718-1aa0-42b3-8ff7-49c5cd4516e6'); kushal.singh@rsystems.com
      vapi.start('a3f9406b-f3d2-40ec-9239-772cd6c6b8b9');
      // vapi.start('da9c7446-38e8-4cfd-b655-ef637e5dc333');
    }
  };

  const endCall = () => {
    if (vapi) {
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
                          { name: 'Your Score', value: finalScore, color: '#EF4444' },
                          { name: 'Remaining', value: 27 - finalScore, color: '#E5E7EB' }
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
                    {finalScore <= 4 ? 'Minimal Depression' :
                     finalScore <= 9 ? 'Mild Depression' :
                     finalScore <= 14 ? 'Moderate Depression' :
                     finalScore <= 19 ? 'Moderately Severe Depression' :
                     'Severe Depression'}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    This is not a diagnosis. Please consult a healthcare professional.
                  </p>
                </div>
              </div>
            </div>
          )}
          <br/>
          {!isConnected ? (
            <button
              onClick={startCall}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Voice Assessment
            </button>
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
            </div>
          )}
        </div>
      </div>

      {/* Right side - Chat */}
      <div style={{
        height: '100vh',
        overflowY: 'scroll',
        position: 'fixed',
        right: 0,
        top: 0,
        zIndex: 1000,
      }} className="w-96 bg-white shadow-xl border-l border-gray-200">
        <div 
          className="h-full flex flex-col">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Conversation</h3>
          </div>
          <div 
          className="flex-1 overflow-y-auto p-4">
            {transcript.length === 0 ? (
              <p className="text-gray-500 text-center">Conversation will appear here...</p>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className="mb-4">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white rounded-br-none' 
                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                    }`}>
                      <div className="text-xs opacity-75 mb-1">
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                      </div>
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