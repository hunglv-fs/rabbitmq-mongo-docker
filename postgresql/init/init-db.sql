CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('email', 'sms', 'push')) DEFAULT 'email',
    status TEXT CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMPTZ NULL DEFAULT NULL,
    error TEXT NULL,
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMPTZ NULL DEFAULT NULL,
    important BOOLEAN DEFAULT FALSE,
    visibility TEXT CHECK (visibility IN ('public', 'private')) DEFAULT 'private',
    priority INT DEFAULT 1,
    tags TEXT[] NOT NULL DEFAULT ARRAY['tag1', 'tag2'],
    metadata JSONB NOT NULL DEFAULT '{"source": "rabbitmq-mongo-docker", "version": "1.0.0", "timestamp": "2025-03-22T00:00:00Z"}',
    sent BOOLEAN DEFAULT FALSE,
    size NUMERIC(10, 6) DEFAULT 0.0001
);

CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    message_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size NUMERIC(10, 6) DEFAULT 0.0001,
    type VARCHAR(50) NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
