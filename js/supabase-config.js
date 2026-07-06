// ============================================================
// SUPABASE CONFIG — Shopping das Academias
// ============================================================

const SUPABASE_URL  = 'https://mpyakbkgqraryjypsuki.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1weWFrYmtncXJhcnlqeXBzdWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMTk0ODQsImV4cCI6MjA5ODg5NTQ4NH0.ro5UXYwH2dvd0VyNZyFBaJA_jPBqsH9FccE7XbqdJ-M';

// Inicializa o cliente Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    realtime: { params: { eventsPerSecond: 10 } }
});
