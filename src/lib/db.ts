/**
 * Unified database interface that switches between Supabase (production)
 * and SQLite (development) based on NEXT_PUBLIC_APP_MODE
 */

import { createClient as createSupabaseClient } from "@/utils/supabase/server";
import { getLocalDb, DEV_USER_ID } from "./local-db/client";
import { getDevUser, isDevelopmentMode } from "./local-db/local-auth";
import { eq, desc, and } from "drizzle-orm";
import * as schema from "./local-db/schema";

// ============================================================================
// AUTH FUNCTIONS
// ============================================================================

export async function getUser() {
  if (isDevelopmentMode()) {
    return { data: { user: getDevUser() }, error: null };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getUser();
}

export async function getSession() {
  if (isDevelopmentMode()) {
    return {
      data: {
        session: {
          user: getDevUser(),
          access_token: "dev-access-token",
        },
      },
      error: null,
    };
  }

  const supabase = await createSupabaseClient();
  return await supabase.auth.getSession();
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

export async function getUserProfile(userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });
    return { data: user || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return { data, error };
}

// ============================================================================
// RATE LIMIT FUNCTIONS
// ============================================================================

export async function getUserRateLimit(userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const rateLimit = await db.query.userRateLimits.findFirst({
      where: eq(schema.userRateLimits.userId, userId),
    });
    return { data: rateLimit || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("user_rate_limits")
    .select("*")
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function updateUserRateLimit(
  userId: string,
  updates: { usage_count?: number; reset_date?: string; last_request_at?: Date }
) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .update(schema.userRateLimits)
      .set({
        usageCount: updates.usage_count,
        resetDate: updates.reset_date,
        lastRequestAt: updates.last_request_at,
      })
      .where(eq(schema.userRateLimits.userId, userId));
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("user_rate_limits")
    .update(updates)
    .eq("user_id", userId);
  return { error };
}

// ============================================================================
// CHAT SESSION FUNCTIONS
// ============================================================================

export async function getChatSessions(userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const sessions = await db.query.chatSessions.findMany({
      where: eq(schema.chatSessions.userId, userId),
      orderBy: [desc(schema.chatSessions.updatedAt)],
    });
    return { data: sessions, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return { data, error };
}

export async function getChatSession(sessionId: string, userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const session = await db.query.chatSessions.findFirst({
      where: and(
        eq(schema.chatSessions.id, sessionId),
        eq(schema.chatSessions.userId, userId)
      ),
    });
    return { data: session || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();
  return { data, error };
}

export async function createChatSession(session: {
  id: string;
  user_id: string;
  title: string;
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.chatSessions).values({
      id: session.id,
      userId: session.user_id,
      title: session.title,
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("chat_sessions").insert(session);
  return { error };
}

export async function updateChatSession(
  sessionId: string,
  userId: string,
  updates: { title?: string; last_message_at?: Date }
) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const updateData: any = {
      updatedAt: new Date(),
    };
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.last_message_at !== undefined)
      updateData.lastMessageAt = updates.last_message_at;

    await db
      .update(schema.chatSessions)
      .set(updateData)
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId)
        )
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", userId);
  return { error };
}

export async function deleteChatSession(sessionId: string, userId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .delete(schema.chatSessions)
      .where(
        and(
          eq(schema.chatSessions.id, sessionId),
          eq(schema.chatSessions.userId, userId)
        )
      );
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);
  return { error };
}

// ============================================================================
// CHAT MESSAGE FUNCTIONS
// ============================================================================

export async function getChatMessages(sessionId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const messages = await db.query.chatMessages.findMany({
      where: eq(schema.chatMessages.sessionId, sessionId),
      orderBy: [schema.chatMessages.createdAt],
    });
    return { data: messages, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  return { data, error };
}

export async function saveChatMessages(
  sessionId: string,
  messages: Array<{
    id: string;
    role: string;
    content: any;
    processing_time_ms?: number;
  }>
) {
  console.log('[DB] saveChatMessages called - sessionId:', sessionId, 'messageCount:', messages.length);

  if (isDevelopmentMode()) {
    const db = getLocalDb();

    // Delete existing messages
    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));

    // Insert new messages
    if (messages.length > 0) {
      await db.insert(schema.chatMessages).values(
        messages.map((msg) => ({
          id: msg.id,
          sessionId: sessionId,
          role: msg.role,
          content: JSON.stringify(msg.content),
          processingTimeMs: msg.processing_time_ms,
        }))
      );
    }
    console.log('[DB] Successfully saved messages to local SQLite');
    return { error: null };
  }

  console.log('[DB] Saving to Supabase (production mode)');
  const supabase = await createSupabaseClient();

  // Delete existing messages
  console.log('[DB] Deleting existing messages for session:', sessionId);
  const deleteResult = await supabase.from("chat_messages").delete().eq("session_id", sessionId);
  if (deleteResult.error) {
    console.error('[DB] Error deleting messages:', deleteResult.error);
  }

  // Insert new messages
  if (messages.length > 0) {
    console.log('[DB] Inserting', messages.length, 'messages');
    const messagesToInsert = messages.map((msg) => ({
      id: msg.id,
      session_id: sessionId,
      role: msg.role,
      content: msg.content,
      processing_time_ms: msg.processing_time_ms,
    }));
    console.log('[DB] First message to insert:', JSON.stringify(messagesToInsert[0]));

    const { error } = await supabase.from("chat_messages").insert(messagesToInsert);
    if (error) {
      console.error('[DB] Error inserting messages:', error);
    } else {
      console.log('[DB] Successfully inserted messages to Supabase');
    }
    return { error };
  }

  console.log('[DB] No messages to save');
  return { error: null };
}

export async function deleteChatMessages(sessionId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .delete(schema.chatMessages)
      .where(eq(schema.chatMessages.sessionId, sessionId));
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", sessionId);
  return { error };
}

// ============================================================================
// CHART FUNCTIONS
// ============================================================================

export async function getChart(chartId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const chart = await db.query.charts.findFirst({
      where: eq(schema.charts.id, chartId),
    });
    return { data: chart || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("charts")
    .select("*")
    .eq("id", chartId)
    .single();
  return { data, error };
}

export async function createChart(chart: {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  session_id: string;
  chart_data: any;
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.charts).values({
      id: chart.id,
      userId: chart.user_id || null,
      anonymousId: chart.anonymous_id || null,
      sessionId: chart.session_id,
      chartData: JSON.stringify(chart.chart_data),
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("charts").insert(chart);
  return { error };
}

// ============================================================================
// CSV FUNCTIONS
// ============================================================================

export async function getCSV(csvId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const csv = await db.query.csvs.findFirst({
      where: eq(schema.csvs.id, csvId),
    });
    return { data: csv || null, error: null };
  }

  const supabase = await createSupabaseClient();
  const { data, error } = await supabase
    .from("csvs")
    .select("*")
    .eq("id", csvId)
    .single();
  return { data, error };
}

export async function createCSV(csv: {
  id: string;
  user_id?: string;
  anonymous_id?: string;
  session_id: string;
  title: string;
  description?: string;
  headers: string[];
  rows: any[][];
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db.insert(schema.csvs).values({
      id: csv.id,
      userId: csv.user_id || null,
      anonymousId: csv.anonymous_id || null,
      sessionId: csv.session_id,
      title: csv.title,
      description: csv.description || null,
      headers: JSON.stringify(csv.headers),
      rows: JSON.stringify(csv.rows),
    });
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("csvs").insert(csv);
  return { error };
}

// ============================================================================
// PATENT CACHE FUNCTIONS
// ============================================================================

// Clear patent indices for a session (called before caching new search results)
export async function clearPatentIndices(sessionId: string) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    await db
      .update(schema.patentCache)
      .set({ patentIndex: -1 }) // Set to -1 to indicate "no current index"
      .where(eq(schema.patentCache.sessionId, sessionId));
    return { error: null };
  }

  const supabase = await createSupabaseClient();
  const { error } = await supabase
    .from("patent_cache")
    .update({ patent_index: -1 })
    .eq("session_id", sessionId);
  return { error };
}

export async function cachePatent(data: {
  session_id: string;
  patent_number: string;
  patent_index: number;
  title: string;
  url?: string;
  abstract: string;
  full_content: string;
  metadata?: any;
}) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    // Generate a unique ID for SQLite (using session + patent_number)
    const id = `${data.session_id}-${data.patent_number}`;

    // Check if patent already exists
    const existing = await db.query.patentCache.findFirst({
      where: and(
        eq(schema.patentCache.sessionId, data.session_id),
        eq(schema.patentCache.patentNumber, data.patent_number)
      ),
    });

    if (existing) {
      // Update existing patent (refresh expires_at and set NEW index from current search)
      await db
        .update(schema.patentCache)
        .set({
          patentIndex: data.patent_index, // Update to new index from current search
          title: data.title,
          url: data.url || null,
          abstract: data.abstract,
          fullContent: data.full_content,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        })
        .where(eq(schema.patentCache.id, existing.id));
    } else {
      // Insert new patent
      await db.insert(schema.patentCache).values({
        id: id,
        sessionId: data.session_id,
        patentNumber: data.patent_number,
        patentIndex: data.patent_index,
        title: data.title,
        url: data.url || null,
        abstract: data.abstract,
        fullContent: data.full_content,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      });
    }
    return { error: null };
  }

  const supabase = await createSupabaseClient();

  // Use upsert to handle the UNIQUE constraint on (session_id, patent_number)
  // This caches ALL unique patents across multiple searches in the session
  const { error } = await supabase.from("patent_cache")
    .upsert({
      session_id: data.session_id,
      patent_number: data.patent_number,
      patent_index: data.patent_index,
      title: data.title,
      url: data.url,
      abstract: data.abstract,
      full_content: data.full_content,
      metadata: data.metadata,
      // Update expires_at to extend cache when re-searching same patents
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    }, {
      onConflict: 'session_id,patent_number',
      ignoreDuplicates: false, // Update on conflict to refresh expires_at
    });

  if (error) {
    console.error('[cachePatent] Supabase error:', error);
    console.error('[cachePatent] Data attempted:', {
      session_id: data.session_id,
      patent_index: data.patent_index,
      patent_number: data.patent_number
    });
  } else {
    console.log('[cachePatent] Successfully cached to Supabase:', {
      session_id: data.session_id,
      patent_index: data.patent_index,
      patent_number: data.patent_number
    });
  }

  return { error };
}

export async function getFullPatent(sessionId: string, patentIndex: number) {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    // Get patent with this VALID index (>= 0) from the most recent search
    // (Indices are cleared to -1 when new search starts)
    const patents = await db.query.patentCache.findMany({
      where: and(
        eq(schema.patentCache.sessionId, sessionId),
        eq(schema.patentCache.patentIndex, patentIndex)
      ),
      orderBy: [desc(schema.patentCache.createdAt)],
      limit: 1,
    });

    const patent = patents[0] || null;

    // Check if index is invalid (cleared by new search)
    if (patent && patent.patentIndex < 0) {
      return { data: null, error: null };
    }

    // Check if expired (SQLite stores as unix timestamp)
    if (patent && patent.expiresAt && patent.expiresAt < new Date()) {
      // Expired - delete it
      await db
        .delete(schema.patentCache)
        .where(eq(schema.patentCache.id, patent.id));
      return { data: null, error: null };
    }

    return { data: patent || null, error: null };
  }

  const supabase = await createSupabaseClient();

  // Query for patents with this VALID index (>= 0) from the most recent search
  // (Indices are cleared to -1 when new search starts)
  const { data, error } = await supabase
    .from("patent_cache")
    .select("*")
    .eq("session_id", sessionId)
    .eq("patent_index", patentIndex)
    .gte("patent_index", 0) // Only valid indices
    .gt("expires_at", new Date().toISOString()) // Only get non-expired
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() to handle 0 or 1 results

  return { data, error };
}

export async function cleanupExpiredPatents() {
  if (isDevelopmentMode()) {
    const db = getLocalDb();
    const now = new Date();
    await db
      .delete(schema.patentCache)
      .where(
        // Using SQL comparison for timestamps in SQLite
        and()
      );
    // For SQLite, we'll use a simpler approach - delete all where expiresAt < now
    const allPatents = await db.query.patentCache.findMany();
    const expiredIds = allPatents
      .filter((p) => p.expiresAt && p.expiresAt < now)
      .map((p) => p.id);

    if (expiredIds.length > 0) {
      for (const id of expiredIds) {
        await db.delete(schema.patentCache).where(eq(schema.patentCache.id, id));
      }
    }

    return { error: null, deletedCount: expiredIds.length };
  }

  const supabase = await createSupabaseClient();
  const { error, count } = await supabase
    .from("patent_cache")
    .delete()
    .lt("expires_at", new Date().toISOString());

  return { error, deletedCount: count || 0 };
}
