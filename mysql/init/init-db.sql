CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('email', 'sms', 'push') NOT NULL DEFAULT 'email',
    status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL DEFAULT NULL,
    error TEXT NULL,
    attempts INT DEFAULT 0,
    last_attempt TIMESTAMP NULL DEFAULT NULL,
    important BOOLEAN DEFAULT FALSE,
    visibility ENUM('public', 'private') NOT NULL DEFAULT 'private',
    priority INT DEFAULT 1,
    tags JSON,
    metadata JSON,
    sent BOOLEAN DEFAULT FALSE,
    size DECIMAL(10, 6) DEFAULT 0.0001
);

CREATE TABLE attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size DECIMAL(10, 6) DEFAULT 0.0001,
    type VARCHAR(50) NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
