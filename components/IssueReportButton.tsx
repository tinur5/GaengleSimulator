'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

export default function IssueReportButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [issueUrl, setIssueUrl] = useState('');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
          timestamp: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setIssueUrl(data.issueUrl || '');
        setFallbackUsed(data.fallbackUsed || false);
        // Reset form after 3 seconds
        timeoutRef.current = setTimeout(() => {
          setIsOpen(false);
          setTitle('');
          setDescription('');
          setStatus('idle');
          setIssueUrl('');
          setFallbackUsed(false);
        }, 3000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Netzwerkfehler. Bitte versuchen Sie es später erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Report Issue Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 flex items-center gap-2 z-50"
        title="Problem melden"
      >
        <AlertCircle size={24} />
        <span className="hidden sm:inline">Problem melden</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-4">Problem melden</h2>
            
            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="text-green-600 mt-0.5" size={20} />
                  <div>
                    <p className="text-green-800 font-semibold">
                      {fallbackUsed ? 'Issue per Email gesendet!' : 'Issue erfolgreich erstellt!'}
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      {fallbackUsed ? (
                        <>
                          Ihr Problem wurde per Email an den Administrator gesendet. 
                          Sie erhalten eine Benachrichtigung, sobald es bearbeitet wird.
                        </>
                      ) : (
                        <>
                          Ihr Problem wurde gemeldet.{' '}
                          {issueUrl && (
                            <a
                              href={issueUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Issue anzeigen
                            </a>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-red-600 mt-0.5" size={20} />
                      <div>
                        <p className="text-red-800 font-semibold">Fehler</p>
                        <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Titel
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Kurze Beschreibung des Problems"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Beschreibung
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 h-32"
                    placeholder="Beschreiben Sie das Problem im Detail..."
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Wird gesendet...' : 'Melden'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
