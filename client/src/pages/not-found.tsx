import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileWarning, Home, ChevronLeft, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const [_, setLocation] = useLocation();
  const [animation, setAnimation] = useState(true);

  useEffect(() => {
    // Simulate animation cycles
    const timer = setInterval(() => {
      setAnimation(prev => !prev);
    }, 3000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-background">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={animation ? 'search' : 'warning'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            {animation ? (
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <Search className="h-32 w-32 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ 
                  y: [0, -15, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
              >
                <FileWarning className="h-32 w-32 text-destructive" />
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <h1 className="text-5xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-primary to-destructive bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-3xl font-bold mb-6">Page Not Found</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or never existed in the first place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-3 justify-center"
        >
          <Button
            onClick={() => setLocation('/')}
            variant="default"
            size="lg"
            className="gap-2"
          >
            <Home size={18} />
            Go to Home
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <ChevronLeft size={18} />
            Go Back
          </Button>
        </motion.div>
      </div>

      {/* Background animated elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0,
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              opacity: [0, 0.3, 0],
              y: [null, Math.random() * window.innerHeight],
              rotate: [0, Math.random() * 360],
            }}
            transition={{ 
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 10,
              ease: "easeInOut"
            }}
            className="absolute"
          >
            {i % 2 === 0 ? (
              <AlertTriangle 
                className="text-primary/10"
                size={i % 3 === 0 ? 40 : i % 3 === 1 ? 24 : 16}
              />
            ) : (
              <Search
                className="text-destructive/10"
                size={i % 3 === 0 ? 40 : i % 3 === 1 ? 24 : 16}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}