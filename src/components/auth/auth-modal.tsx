'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const signInWithValyu = useAuthStore((state) => state.signInWithValyu);
  const authLoading = useAuthStore((state) => state.loading);
  const [valyuLoading, setValyuLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleValyuSignIn = async () => {
    setValyuLoading(true);
    setError(null);

    try {
      const { error } = await signInWithValyu();
      if (error) {
        setError(error.message || 'Failed to connect to Valyu');
        setValyuLoading(false);
      }
      // Don't close here as OAuth will redirect
      // Don't set valyuLoading false here as user will be redirected
    } catch (err) {
      setError('An unexpected error occurred');
      setValyuLoading(false);
    }
  };

  const isLoading = authLoading || valyuLoading;

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xs border-0 shadow-2xl bg-card p-8">
        <DialogHeader className="text-center pb-4">
          <DialogTitle className="text-xl font-normal text-foreground">
            Patents.
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          <p className="text-sm text-muted-foreground text-center">
            Sign in with your Valyu account to access AI-powered patent research.
          </p>

          {/* Valyu Sign In Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleValyuSignIn}
            disabled={isLoading}
            className="w-full p-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <AnimatePresence mode="wait">
              {valyuLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Image
                      src="/valyu.svg"
                      alt="Valyu"
                      width={20}
                      height={20}
                      className="h-5 w-5"
                    />
                  </motion.div>
                  <span className="text-sm font-medium">Connecting to Valyu...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="normal"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3"
                >
                  <span className="text-sm font-medium">Sign in with</span>
                  <Image
                    src="/valyu.svg"
                    alt="Valyu"
                    width={80}
                    height={24}
                    className="h-6 w-auto"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Info about Valyu */}
          <p className="text-xs text-muted-foreground text-center">
            Your searches use Valyu credits from your organization.
          </p>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
