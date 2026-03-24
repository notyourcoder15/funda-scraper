import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/.netlify/functions/scrape';

function ScraperForm() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [propertyInfo, setPropertyInfo] = useState(null);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (url && url.includes('funda.nl/detail/')) {
        setInfoLoading(true);
        setPropertyInfo(null);
        try {
          const response = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, action: 'info' })
          });
          if (response.ok) {
            const data = await response.json();
            setPropertyInfo(data);
          }
        } catch (err) {
          console.error('Failed to fetch property info');
        } finally {
          setInfoLoading(false);
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to scrape images');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'funda-images.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      {propertyInfo && (
        <div className="mb-6 p-5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg transform transition-all duration-500 animate-fade-in">
          <div className="text-center">
            <h2 className="text-xl font-bold text-text">{propertyInfo.address}</h2>
            {(propertyInfo.zipcode || propertyInfo.city) && (
              <p className="text-sm text-gray-500 mt-1">
                {propertyInfo.zipcode} {propertyInfo.city}
              </p>
            )}
            <p className="text-2xl font-bold text-primary-orange mt-2">{propertyInfo.price}</p>
          </div>
        </div>
      )}
      {infoLoading && (
        <div className="mb-6 p-5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-primary-orange" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Give me the full URL"
        className="w-full px-5 py-4 rounded-full bg-white/90 backdrop-blur-sm border-0 text-text placeholder:text-gray-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
        disabled={loading}
      />
      {error && (
        <div className="mt-3 text-white text-sm text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 text-white text-sm text-center">
          Images downloaded successfully!
        </div>
      )}
      <button
        type="submit"
        disabled={loading || !url}
        className="mt-4 w-full py-4 rounded-full bg-primary-orange hover:bg-primary-dark disabled:bg-white/30 disabled:text-white/50 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          'Grab the Gallery'
        )}
      </button>
    </form>
  );
}

export default ScraperForm;
