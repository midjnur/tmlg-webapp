-- Create contact_requests table
CREATE TABLE IF NOT EXISTS contact_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  preferred_contact TEXT NOT NULL DEFAULT 'email',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'new'
);

CREATE INDEX IF NOT EXISTS idx_contact_created_at ON contact_requests(created_at);
