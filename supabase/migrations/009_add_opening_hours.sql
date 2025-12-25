-- Add opening hours to clients table
-- Default hours: 9:00 - 17:00 (9 AM - 5 PM)

ALTER TABLE clients
  ADD COLUMN opening_time TIME DEFAULT '09:00:00',
  ADD COLUMN closing_time TIME DEFAULT '17:00:00';

-- Add comments for documentation
COMMENT ON COLUMN clients.opening_time IS 'Client opening time (format HH:MM:SS). Visits must be scheduled after this time.';
COMMENT ON COLUMN clients.closing_time IS 'Client closing time (format HH:MM:SS). Visits must be scheduled before this time.';
