import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // Only create profiles for logged-in users
    capture_pageview: true,
    capture_pageleave: true,
    // Console capture (rrweb console-record) buffers every console.* call and
    // is NOT flushed while a tab is backgrounded - on a long streaming chat it
    // grows unbounded and crashes the renderer ("Aw, Snap! Error code: 5").
    // Keep it off; DOM session replay still works.
    enable_recording_console_log: false,
    session_recording: {
      maskAllInputs: true, // Mask sensitive inputs
      maskTextSelector: '.sensitive', // Mask elements with this class
      recordCrossOriginIframes: false,
    },
    autocapture: false, // Disable to save quota - only track what we need
  });
}
