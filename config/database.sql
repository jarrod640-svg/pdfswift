-- PDFSwift Database Schema

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'free', -- free, pro, business
    subscription_status VARCHAR(50) DEFAULT 'active', -- active, cancelled, past_due
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    credits INTEGER DEFAULT 0, -- for pay-as-you-go
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversions table (track usage)
CREATE TABLE conversions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255), -- for anonymous users
    conversion_type VARCHAR(100) NOT NULL, -- pdf_to_image, image_to_pdf, merge, split, compress, etc.
    file_size_mb DECIMAL(10, 2),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage tracking (daily limits)
CREATE TABLE daily_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    session_id VARCHAR(255),
    usage_date DATE NOT NULL,
    conversion_count INTEGER DEFAULT 0,
    UNIQUE(user_id, usage_date),
    UNIQUE(session_id, usage_date)
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    stripe_payment_id VARCHAR(255),
    amount DECIMAL(10, 2),
    currency VARCHAR(10) DEFAULT 'usd',
    status VARCHAR(50), -- succeeded, failed, pending
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX idx_conversions_user ON conversions(user_id);
CREATE INDEX idx_conversions_session ON conversions(session_id);
CREATE INDEX idx_conversions_date ON conversions(created_at);
CREATE INDEX idx_daily_usage_user_date ON daily_usage(user_id, usage_date);
CREATE INDEX idx_daily_usage_session_date ON daily_usage(session_id, usage_date);
