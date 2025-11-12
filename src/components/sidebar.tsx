'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { createClient } from '@/utils/supabase/client-wrapper';
import {
  MessageSquare,
  MessagesSquare,
  MessageCirclePlus,
  History,
  Settings,
  LogOut,
  Trash2,
  CreditCard,
  BarChart3,
  Plus,
  Building2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { SettingsModal } from '@/components/user/settings-modal';
import { SubscriptionModal } from '@/components/user/subscription-modal';
import { useSubscription } from '@/hooks/use-subscription';
import { EnterpriseContactModal } from '@/components/enterprise/enterprise-contact-modal';

interface SidebarProps {
  currentSessionId?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export function Sidebar({
  currentSessionId,
  onSessionSelect,
  onNewChat,
  hasMessages = false,
}: SidebarProps) {
  const { user } = useAuthStore();
  const signOut = useAuthStore((state) => state.signOut);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isDevelopment = process.env.NEXT_PUBLIC_APP_MODE === 'development';

  // Keep dock open by default for everyone
  const [isOpen, setIsOpen] = useState(true);
  const [alwaysOpen, setAlwaysOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  // Fetch chat sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/chat/sessions', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      const { sessions } = await response.json();
      return sessions;
    },
    enabled: !!user
  });

  // Delete session mutation
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      return sessionId;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (currentSessionId === sessionId) {
        onNewChat?.();
      }
    }
  });

  const handleSessionSelect = useCallback((sessionId: string) => {
    onSessionSelect?.(sessionId);
    setShowHistory(false);
  }, [onSessionSelect]);

  const handleNewChat = useCallback(() => {
    onNewChat?.();
    setShowHistory(false);
  }, [onNewChat]);

  const toggleSidebar = () => {
    if (alwaysOpen) return; // Don't allow closing if always open is enabled
    setIsOpen(!isOpen);
    if (isOpen) {
      setShowHistory(false); // Close history when closing sidebar
    }
  };

  // Keep sidebar open if alwaysOpen is enabled
  useEffect(() => {
    if (alwaysOpen) {
      setIsOpen(true);
    }
  }, [alwaysOpen]);

  // Listen for upgrade modal trigger from rate limit banner
  useEffect(() => {
    const handleShowUpgradeModal = () => setShowSubscription(true);
    window.addEventListener('show-upgrade-modal', handleShowUpgradeModal);
    return () => window.removeEventListener('show-upgrade-modal', handleShowUpgradeModal);
  }, []);

  const handleLogoClick = () => {
    // If there's an active chat (either with session ID or just messages), warn before leaving
    if (currentSessionId || hasMessages) {
      const confirmed = window.confirm(
        user
          ? 'Leave this conversation? Your chat history will be saved.'
          : 'Start a new chat? Your current conversation will be lost.'
      );

      if (confirmed) {
        // Only close sidebar if not in alwaysOpen mode
        if (!alwaysOpen) {
          setIsOpen(false);
        }
        setShowHistory(false);
        onNewChat?.(); // Call onNewChat to properly reset the chat interface
      }
      return;
    }

    // If on homepage without active chat, collapse sidebar only if not in alwaysOpen mode
    if (pathname === '/') {
      if (!alwaysOpen) {
        setIsOpen(false);
      }
      setShowHistory(false);
      return;
    }

    // If on other pages, warn before leaving
    const confirmed = window.confirm(
      'Leave this page? Your current session will be saved, but any unsaved changes will be lost.'
    );

    if (confirmed) {
      // Only close sidebar if not in alwaysOpen mode
      if (!alwaysOpen) {
        setIsOpen(false);
      }
      setShowHistory(false);
      router.push('/');
    }
  };

  const handleViewUsage = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/customer-portal', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        const { redirectUrl } = await response.json();
        window.open(redirectUrl, '_blank');
      }
    } catch (error) {
    }
  };

  // Get subscription status from database
  const subscription = useSubscription();
  const { isPaid } = subscription;

  return (
    <>
      {/* Chevron Toggle Button - Left Edge, Centered */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={toggleSidebar}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-10 h-16 flex items-center justify-center bg-card border-r-2 border-t-2 border-b-2 border-border hover:border-border rounded-r-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:w-12 group"
          title="Open Menu"
        >
          <svg
            className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </motion.button>
      )}

      {/* macOS Dock-Style Navigation - Left Side */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300
            }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 bg-card/80 dark:bg-card/80 backdrop-blur-2xl border border-border rounded-[32px] shadow-2xl py-4 px-3"
          >
            <div className="flex flex-col items-center gap-2">
              {/* Always Open Toggle */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => setAlwaysOpen(!alwaysOpen)}
                  className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                    alwaysOpen
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  }`}
                >
                  <svg
                    className={`w-6 h-6 transition-colors ${
                      alwaysOpen
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {alwaysOpen ? 'Always Open (On)' : 'Always Open (Off)'}
                </div>
              </div>

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Logo */}
              <div className="relative group/tooltip">
                <button
                  onClick={handleLogoClick}
                  className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95"
                >
                  <Image
                    src="/nabla.png"
                    alt="Home"
                    width={28}
                    height={28}
                    className="rounded-lg"
                  />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Home
                </div>
              </div>

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* New Chat */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={handleNewChat}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <MessageCirclePlus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    New Chat
                  </div>
                </div>
              )}

                      {/* History */}
              <div className="relative group/tooltip">
                <button
                  onClick={() => {
                    if (!user) {
                      window.dispatchEvent(new CustomEvent('show-auth-modal'));
                    } else {
                      setShowHistory(!showHistory);
                    }
                  }}
                  className={`w-12 h-12 flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 ${
                    !user
                      ? 'opacity-50 cursor-not-allowed hover:bg-muted'
                      : showHistory
                        ? 'bg-card dark:bg-muted shadow-lg'
                        : 'hover:bg-muted'
                  }`}
                >
                  <MessagesSquare className={`h-6 w-6 transition-colors ${
                    !user
                      ? 'text-muted-foreground'
                      : showHistory
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground'
                  }`} />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {!user ? 'Sign up (free) for history' : 'History'}
                </div>
              </div>

              {/* Divider */}
              {user && !isDevelopment && <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent my-1" />}

              {/* Billing/Subscription - Hidden in development mode */}
              {user && !isDevelopment && (
                <>
                  {!isPaid ? (
                    <div className="relative group/tooltip">
                      <button
                        onClick={() => setShowSubscription(true)}
                        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                      >
                        <CreditCard className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        Upgrade
                      </div>
                    </div>
                  ) : (
                    <div className="relative group/tooltip">
                      <button
                        onClick={handleViewUsage}
                        className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                      >
                        <BarChart3 className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        Usage & Billing
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Enterprise */}
              {user && process.env.NEXT_PUBLIC_APP_MODE !== 'development' && process.env.NEXT_PUBLIC_ENTERPRISE === 'true' && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowEnterpriseModal(true)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <Building2 className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Enterprise Solutions
                  </div>
                </div>
              )}

              {/* Settings */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 group hover:scale-110 active:scale-95"
                  >
                    <Settings className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Settings
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent mt-1" />

              {/* Log In Button for unauthenticated users */}
              {!user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('show-auth-modal'));
                    }}
                    className="w-12 h-12 flex items-center justify-center bg-primary/10 hover:bg-primary/15 rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 border border-primary/30 relative"
                  >
                    <LogOut className="h-6 w-6 text-primary rotate-180" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    Log in
                  </div>
                </div>
              )}

              {/* User Avatar with Dropdown */}
              {user && (
                <div className="relative group/tooltip">
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    <Avatar className="h-9 w-9 ring-2 ring-transparent hover:ring-border transition-all">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary text-primary-foreground font-semibold">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  {/* Only show tooltip when menu is NOT open */}
                  {!showProfileMenu && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Account
                    </div>
                  )}

                  {/* Profile Dropdown */}
                  <AnimatePresence>
                    {showProfileMenu && (
                      <>
                        {/* Backdrop to close on click away */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowProfileMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, x: -10, scale: 0.95 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-full ml-4 bottom-0 bg-card/95 dark:bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl py-2 px-1 min-w-[220px] z-50"
                        >
                        {/* User Email */}
                        <div className="px-3 py-2.5 mb-1">
                          <p className="text-xs text-muted-foreground mb-1">Signed in as</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.email}
                          </p>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-muted my-1" />

                        {/* Sign Out */}
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            const confirmed = window.confirm('Are you sure you want to sign out?');
                            if (confirmed) {
                              signOut();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
                        >
                          <LogOut className="h-4 w-4" />
                          <span className="font-medium">Sign out</span>
                        </button>
                      </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Close Dock Button - Only show if not always open */}
              {!alwaysOpen && (
                <>
                  <div className="w-10 h-px bg-gradient-to-r from-transparent via-border to-transparent mt-2" />
                  <div className="relative group/tooltip">
                    <button
                      onClick={toggleSidebar}
                      className="w-12 h-12 flex items-center justify-center hover:bg-muted rounded-[20px] transition-all duration-200 hover:scale-110 active:scale-95 mt-2"
                    >
                      <svg
                        className="w-5 h-5 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                      Close
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && user && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
              onClick={() => setShowHistory(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300
              }}
              className="fixed left-20 top-4 bottom-4 w-64 bg-card rounded-3xl z-50 shadow-xl ml-2 flex flex-col border border-border"
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Chat History</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewChat}
                    className="h-8 w-8 p-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Sessions List */}
              <ScrollArea className="flex-1 px-2">
                {loadingSessions ? (
                  <div className="space-y-2 p-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <p className="text-sm text-muted-foreground text-center">
                      No chat history yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 py-2">
                    {sessions.map((session: ChatSession) => (
                      <div
                        key={session.id}
                        onClick={() => handleSessionSelect(session.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted group cursor-pointer transition-colors ${
                          currentSessionId === session.id ? 'bg-muted' : ''
                        }`}
                      >
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {session.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {new Date(session.last_message_at || session.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(session.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-destructive/10 transition-all"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />

      <SubscriptionModal
        open={showSubscription}
        onClose={() => setShowSubscription(false)}
      />

      <EnterpriseContactModal
        open={showEnterpriseModal}
        onClose={() => setShowEnterpriseModal(false)}
      />
    </>
  );
}
