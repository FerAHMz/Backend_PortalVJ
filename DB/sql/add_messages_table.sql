CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    sender_role VARCHAR(32) NOT NULL,
    recipient_id INTEGER NOT NULL,
    recipient_role VARCHAR(32) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, recipient_role);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, sender_role);
