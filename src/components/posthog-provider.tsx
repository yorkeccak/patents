'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import posthog from 'posthog-js';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      // Identify user when logged in
      posthog.identify(user.id, {
        email: user.email,
      });
    } else {
      // Reset when logged out
      posthog.reset();
    }
  }, [user]);

  // Pause session replay while the tab is hidden. rrweb keeps buffering DOM
  // mutations when backgrounded but cannot flush them (Chrome throttles timers),
  // so a long streaming response in a backgrounded tab grows the buffer until
  // the renderer is OOM-killed ("Aw, Snap! Error code: 5"). Stop on hide,
  // resume on show.
  useEffect(() => {
    const onVisibilityChange = () => {
      try {
        if (document.hidden) {
          posthog.stopSessionRecording();
        } else {
          posthog.startSessionRecording();
        }
      } catch {
        // posthog may not be initialized yet; ignore
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return <>{children}</>;
}
