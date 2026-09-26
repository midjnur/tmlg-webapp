-- Create document_requests table
CREATE TABLE IF NOT EXISTS document_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  car_id TEXT NOT NULL,
  visitor_name TEXT,
  created_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email ON document_requests(email);
CREATE INDEX IF NOT EXISTS idx_car_id ON document_requests(car_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON document_requests(created_at);
