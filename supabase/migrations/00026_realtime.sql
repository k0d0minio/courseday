-- =============================================================================
-- Migration 00026: Enable Supabase Realtime for day-view tables
-- =============================================================================
--
-- REPLICA IDENTITY FULL ensures that UPDATE and DELETE events include the
-- complete old row in the realtime payload, not just the primary key.
--
-- Limitation: realtime subscriptions are scoped to the day view only.
-- Calendar aggregate counts are NOT updated in real-time.

ALTER TABLE activity REPLICA IDENTITY FULL;
ALTER TABLE reservation REPLICA IDENTITY FULL;
ALTER TABLE breakfast_configuration REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE activity;
ALTER PUBLICATION supabase_realtime ADD TABLE reservation;
ALTER PUBLICATION supabase_realtime ADD TABLE breakfast_configuration;
