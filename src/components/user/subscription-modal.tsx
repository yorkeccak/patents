'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client-wrapper';
import { useSubscription } from '@/hooks/use-subscription';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, Clock, Shield, Sparkles, Check, Crown, BarChart3, Building2 } from 'lucide-react';
import { track } from '@vercel/analytics';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ open, onClose }: SubscriptionModalProps) {
  const user = useAuthStore((state) => state.user);
  const subscription = useSubscription();
  const [loading, setLoading] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const handleEnterpriseClick = () => {
    track('Enterprise CTA Clicked', { source: 'subscription_modal' });
    onClose(); // Close subscription modal
    // Use a small delay to prevent both modals from closing
    setTimeout(() => {
      setShowEnterpriseModal(true);
    }, 100);
  };

  const handleUpgrade = async (planType: string) => {
    // Track plan selection
    track('Plan Selected', {
      plan: planType,
      source: 'subscription_modal'
    });

    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Create Polar checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ plan: planType })
      });

      if (response.ok) {
        const { checkoutUrl } = await response.json();

        // Track checkout started
        track('Checkout Started', {
          plan: planType,
          source: 'subscription_modal'
        });

        window.location.href = checkoutUrl;
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  // If user has an active subscription, show current plan info
  if (subscription.isPaid) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="!max-w-2xl bg-card border-border">
          <DialogHeader className="space-y-3 pb-6">
            <DialogTitle className="text-2xl font-semibold text-foreground text-center">
              Your Subscription
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Plan Card */}
            <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary rounded-lg">
                    {subscription.tier === 'unlimited' ? (
                      <Crown className="h-6 w-6 text-white" />
                    ) : (
                      <Zap className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {subscription.tier === 'unlimited' ? 'Pro Unlimited' : 'Pay-As-You-Go'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Status: <span className="font-semibold text-primary">Active</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Unlimited queries</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Full tool access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-foreground">Download reports</span>
                </div>
                {subscription.tier === 'unlimited' && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-foreground">Priority support</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="text-foreground">Early access to features</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Manage Subscription Button */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => window.open('https://polar.sh/dashboard', '_blank')}
                className="w-full"
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Manage Subscription on Polar
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                View billing history, update payment method, or cancel subscription
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show upgrade options for free users
  return (
    <>
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!max-w-5xl sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl !w-[95vw] sm:!w-[90vw] md:!w-[85vw] lg:!w-[1000px] bg-card border-border">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl font-semibold text-foreground text-center">
            Unlock Professional-Grade Biomedical Research
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto">
            Access institutional-quality research tools that save hours of analysis time. Choose the plan that fits your workflow.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Value Props Banner */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col items-center text-center p-3 bg-muted rounded-lg border border-border">
              <Clock className="h-5 w-5 text-muted-foreground mb-1.5" />
              <p className="text-xs font-semibold text-foreground">Save 100+ hrs/month</p>
              <p className="text-[10px] text-muted-foreground">On research & analysis</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-muted rounded-lg border border-border">
              <TrendingUp className="h-5 w-5 text-muted-foreground mb-1.5" />
              <p className="text-xs font-semibold text-foreground">Instant insights</p>
              <p className="text-[10px] text-muted-foreground">From multiple sources</p>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-muted rounded-lg border border-border">
              <Shield className="h-5 w-5 text-muted-foreground mb-1.5" />
              <p className="text-xs font-semibold text-foreground">Data accuracy</p>
              <p className="text-[10px] text-muted-foreground">Verified sources only</p>
            </div>
          </div>

          {/* Hint for individuals vs enterprises */}
          {process.env.NEXT_PUBLIC_APP_MODE !== 'development' && process.env.NEXT_PUBLIC_ENTERPRISE === 'true' && (
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Individual plans below.</span> Need enterprise deployment? <button onClick={handleEnterpriseClick} className="text-foreground hover:text-foreground underline underline-offset-2 font-medium">Book a demo</button> to explore custom infrastructure for your organization.
              </p>
            </div>
          )}

          {/* Plans Grid */}
          <div className={`grid gap-4 ${(process.env.NEXT_PUBLIC_APP_MODE === 'development' || process.env.NEXT_PUBLIC_ENTERPRISE !== 'true') ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {/* Pay Per Use - For Occasional Users */}
            <motion.div
              className="relative group cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleUpgrade('pay_per_use')}
            >
              <div className="h-full border-2 border-primary/30 bg-card rounded-xl p-6 hover:border-primary/50 hover:shadow-xl transition-all duration-200 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary rounded-lg">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">Pay-As-You-Go</h3>
                      <p className="text-xs text-muted-foreground">Perfect for ad-hoc research</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Unlimited queries</span> – No daily caps</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Full tool access</span> – Biomedical data, charts, analysis</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Predictable costs</span> – Only pay for actual usage</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Download reports</span> – Export as PDF</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-2xl font-bold text-foreground">Usage-based</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Model costs + 20% platform fee</p>

                  <button className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                    <span>Start with Pay-As-You-Go</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Unlimited - For Power Users */}
            <motion.div
              className="relative group cursor-pointer"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              onClick={() => handleUpgrade('unlimited')}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-lg">
                <Crown className="h-3 w-3" />
                <span>Most Popular</span>
              </div>

              <div className="h-full border-2 border-primary/30 bg-primary/10 rounded-xl p-6 hover:border-primary/50 hover:shadow-2xl transition-all duration-200 flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary rounded-lg">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">Pro Unlimited</h3>
                      <p className="text-xs text-primary">For serious researchers</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-6 flex-1">
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Everything in Pay-As-You-Go</span>, plus:</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Fixed monthly cost</span> – No surprise bills</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Priority support</span> – Dedicated assistance</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Early access</span> – New features first</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-foreground"><span className="font-medium">Best for power users</span> – Heavy usage = big savings</p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="pt-4 border-t border-primary/20">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-3xl font-bold text-foreground">$15</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">~$0.50/day for unlimited research</p>

                  <button className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group shadow-lg">
                    <span>Upgrade to Pro Unlimited</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Enterprise - For Teams */}
            {process.env.NEXT_PUBLIC_APP_MODE !== 'development' && process.env.NEXT_PUBLIC_ENTERPRISE === 'true' && (
              <motion.div
                className="relative group cursor-pointer"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                onClick={handleEnterpriseClick}
              >
                <div className="h-full border-2 border-border bg-muted rounded-xl p-6 hover:border-border hover:shadow-xl transition-all duration-200 flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-muted rounded-lg">
                        <Building2 className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">Enterprise</h3>
                        <p className="text-xs text-muted-foreground">For organizations</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">Everything in Pro Unlimited</span>, plus:</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">Custom data integrations</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">Tailored AI agents & workflows</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">On-premise or cloud deployment</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">White-label capabilities</span></p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-foreground"><span className="font-medium">& much more tailored to your needs</span></p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-bold text-foreground">Custom</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">Built specifically for your organization</p>

                    <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group">
                      <span>Book a Demo</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Trust Signals */}
          <div className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground border-t border-border">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              <span>Secure checkout via Polar</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Enterprise modal rendered outside to prevent state loss */}
    <EnterpriseContactModal
      open={showEnterpriseModal}
      onClose={() => setShowEnterpriseModal(false)}
    />
    </>
  );
}