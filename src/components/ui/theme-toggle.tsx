'use client';

import { useTheme } from 'next-themes';
import { ThemeSwitcher } from './theme-switcher';
import { useRateLimit } from '@/lib/hooks/use-rate-limit';

export function ThemeSelector() {
  const { setTheme, theme } = useTheme();
  const { tier } = useRateLimit();

  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="dark"
      requiresSubscription={false}
      hasSubscription={true}
    />
  );
}

export function CompactThemeSelector({
  onUpgradeClick,
  sessionId
}: {
  onUpgradeClick?: () => void;
  sessionId?: string;
}) {
  const { setTheme, theme } = useTheme();
  const { tier, userId } = useRateLimit();

  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="dark"
      className="h-8 scale-75"
      requiresSubscription={false}
      hasSubscription={true}
      onUpgradeClick={onUpgradeClick}
      userId={userId}
      sessionId={sessionId}
      tier={tier}
    />
  );
}

export function ThemeMenuItem() {
  const { setTheme, theme } = useTheme();
  const { tier } = useRateLimit();

  const hasSubscription = tier !== 'free' && tier !== 'anonymous';

  return (
    <ThemeSwitcher
      value={theme as 'light' | 'dark' | 'system'}
      onChange={(newTheme) => setTheme(newTheme)}
      defaultValue="dark"
      requiresSubscription={false}
      hasSubscription={true}
    />
  );
}
