-- =============================================================================
-- Floate WhatsApp AI Commerce Engine
-- Migration 001: WhatsApp Synced Storefront & Order-Bound Checkout Schema
-- Compatible with PostgreSQL 13+ and MySQL 8+
-- =============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) UNIQUE,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(32) NOT NULL DEFAULT 'customer', -- 'customer' | 'vendor' | 'admin'
    vendor_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
    id VARCHAR(64) PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    owner_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    phone VARCHAR(32) NOT NULL UNIQUE,
    category VARCHAR(128) DEFAULT 'General Merchandise',
    city VARCHAR(128) DEFAULT 'Lagos',
    state VARCHAR(128) DEFAULT 'Lagos',
    is_verified BOOLEAN DEFAULT TRUE,
    verified_tier VARCHAR(32) DEFAULT 'TIER_1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vendors_phone ON vendors(phone);
CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city);

-- 3. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    escrow_ref VARCHAR(64) UNIQUE NOT NULL,
    vendor_id VARCHAR(64) NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    customer_id VARCHAR(64) NOT NULL,
    buyer_phone VARCHAR(32) NOT NULL,
    vendor_phone VARCHAR(32) NOT NULL,
    item_description TEXT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    buyer_fee_amount DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT', -- 'PENDING_PAYMENT' | 'PAID' | 'IN_ESCROW' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
    checkout_url TEXT,
    delivery_code VARCHAR(32),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_escrow_ref ON orders(escrow_ref);

-- 4. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64),
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    reference VARCHAR(128) UNIQUE NOT NULL,
    provider VARCHAR(32) NOT NULL DEFAULT 'flutterwave', -- 'flutterwave' | 'paystack' | 'monnify'
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'NGN',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'SUCCESS' | 'FAILED' | 'ABANDONED'
    raw_response JSONB,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- 6. WHATSAPP AUTH TOKENS TABLE (Cryptographically Hashed Deep Link Tokens)
CREATE TABLE IF NOT EXISTS whatsapp_auth_tokens (
    id VARCHAR(64) PRIMARY KEY,
    token_hash VARCHAR(128) UNIQUE NOT NULL, -- SHA-256 hash of raw token (NEVER store raw tokens)
    type VARCHAR(32) NOT NULL, -- 'storefront' | 'checkout'
    user_id VARCHAR(64),
    vendor_id VARCHAR(64),
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE, -- Single-use enforcement timestamp
    ip VARCHAR(45),
    ua TEXT,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_tokens_hash ON whatsapp_auth_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_wa_tokens_order_id ON whatsapp_auth_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_wa_tokens_expires ON whatsapp_auth_tokens(expires_at);
