import { useState, useEffect } from 'react';
import ScraperForm from './components/ScraperForm';

function FloatingShape({ delay, size, top, left, duration = 20 }) {
  return (
    <div
      className="absolute rounded-full opacity-20"
      style={{
        width: size,
        height: size,
        top,
        left,
        backgroundColor: '#F7A100',
        animation: `float ${duration}s ease-in-out infinite`,
        animationDelay: `${delay}s`
      }}
    />
  );
}

function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-primary-orange overflow-hidden relative">
      <FloatingShape delay={0} size="80px" top="10%" left="10%" duration={15} />
      <FloatingShape delay={2} size="120px" top="70%" left="5%" duration={18} />
      <FloatingShape delay={4} size="60px" top="20%" left="80%" duration={12} />
      <FloatingShape delay={1} size="100px" top="60%" left="85%" duration={20} />
      <FloatingShape delay={3} size="50px" top="40%" left="15%" duration={14} />
      <FloatingShape delay={5} size="90px" top="80%" left="70%" duration={16} />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
        <div className={`w-full max-w-md transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <ScraperForm />
        </div>
      </div>

      <p className="absolute bottom-8 left-0 right-0 text-xs text-white/60 text-center">
        For personal use only. Ensure compliance with Funda terms of service.
      </p>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
