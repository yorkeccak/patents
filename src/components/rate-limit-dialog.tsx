'use client';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AnimatePresence } from 'framer-motion';
import { ExternalLink, Copy, Check, Github, Code, Building2 } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { track } from '@vercel/analytics';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface RateLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetTime: Date;
  onShowAuth?: () => void;
}

export function RateLimitDialog({ open, onOpenChange, resetTime, onShowAuth }: RateLimitDialogProps) {
  const user = useAuthStore((state) => state.user);

  const [copied, setCopied] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  useEffect(() => {
    if (open) {
      track('Rate Limit Hit', {
        resetTime: resetTime.toISOString(),
        remainingQueries: 0
      });
    }
  }, [open, resetTime]);

  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleCopy = async (code: string) => {
    track('Code Copy', {
      source: 'rate_limit_dialog',
      codeLength: code.length
    });

    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBuildYourOwn = () => {
    track('Platform Clickthrough', {
      source: 'rate_limit_dialog',
      action: 'build_your_own',
      url: 'https://platform.valyu.ai/?utm_source=patents.valyu.ai&utm_medium=rate_limit_dialog'
    });

    window.open('https://platform.valyu.ai/?utm_source=patents.valyu.ai&utm_medium=rate_limit_dialog', '_blank');
  };

  const handleCreateAccount = () => {
    track('Auth Modal Opened', {
      source: 'rate_limit_dialog',
      trigger: 'create_account'
    });

    onShowAuth?.();
    onOpenChange(false);
  };

  const codeSnippet = `curl -X POST "https://api.valyu.ai/v1/deepsearch" \\
  -H "Authorization: x-api-key your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "transformer neural network patents", "max_num_results": 10}'`;

  return (
    <AnimatePresence>
      {open && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[90vw] max-w-md translate-x-[-50%] translate-y-[-50%]">
            <DialogTitle className="sr-only">Daily Rate Limit Reached</DialogTitle>

            <div className="text-center space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-xl font-light text-foreground mb-2">
                  Daily limit reached
                </h2>
                <p className="text-muted-foreground text-sm">
                  Resets in <span className="font-medium">{formatResetTime(resetTime)}</span>
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {!user ? (
                  <Button
                    onClick={handleCreateAccount}
                    className="w-full"
                  >
                    Sign in with Valyu
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    Your usage is billed through your Valyu account. Add credits at{' '}
                    <a
                      href="https://platform.valyu.ai/user/account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      platform.valyu.ai
                    </a>
                  </div>
                )}

                {/* Enterprise Option */}
                {user && process.env.NEXT_PUBLIC_APP_MODE !== 'development' && (
                  <div className="mt-4 p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-start gap-3 mb-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-sm text-foreground mb-1">
                          Need enterprise deployment?
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Deploy Valyu&apos;s infrastructure in your organization with custom data integrations and AI agents
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setShowEnterpriseModal(true);
                        track('Enterprise CTA Clicked', { source: 'rate_limit_dialog' });
                      }}
                      variant="outline"
                      className="w-full text-sm border-border hover:bg-muted"
                    >
                      <Building2 className="mr-2 h-4 w-4" />
                      Book a Demo
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      track('GitHub CTA Click', {
                        source: 'rate_limit_dialog',
                        url: 'https://github.com/yorkeccak/patents'
                      });
                      window.open('https://github.com/yorkeccak/patents', '_blank');
                    }}
                    variant="ghost"
                    className="flex-1 text-sm"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Host Yourself
                  </Button>
                  <Button
                    onClick={handleBuildYourOwn}
                    variant="ghost"
                    className="flex-1 text-sm"
                  >
                    <Code className="mr-2 h-4 w-4" />
                    Build with Valyu
                  </Button>
                </div>
              </div>

              {/* Simple code example */}
              <div className="bg-muted rounded-lg p-4 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">API Example</span>
                  <Button
                    onClick={() => handleCopy(codeSnippet)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <pre className="text-xs font-mono text-foreground overflow-x-auto">
                  {codeSnippet}
                </pre>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <EnterpriseContactModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />
    </AnimatePresence>
  );
}
