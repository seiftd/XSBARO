-- SBRFARM Database Schema
-- SQLite Database for Telegram farming simulation game

-- Users table - Main user data
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT DEFAULT 'en',
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    total_referrals INTEGER DEFAULT 0,
    FOREIGN KEY (referred_by) REFERENCES users (telegram_id)
);

-- User resources - Water drops, boosters, coins
CREATE TABLE IF NOT EXISTS user_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    water_drops INTEGER DEFAULT 10,
    heavy_water_drops INTEGER DEFAULT 0,
    boosters INTEGER DEFAULT 0,
    sbr_coins INTEGER DEFAULT 0,
    last_daily_claim DATETIME,
    ads_watched_today INTEGER DEFAULT 0,
    ads_watched_total INTEGER DEFAULT 0,
    last_ad_watch DATETIME,
    joined_channel BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Patches - User farm patches
CREATE TABLE IF NOT EXISTS patches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    patch_number INTEGER NOT NULL,
    is_unlocked BOOLEAN DEFAULT TRUE,
    crop_type TEXT,
    plant_time DATETIME,
    harvest_time DATETIME,
    boosters_used INTEGER DEFAULT 0,
    is_ready BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
    UNIQUE(telegram_id, patch_number)
);

-- Patch parts - For expanding farm
CREATE TABLE IF NOT EXISTS patch_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    parts_owned INTEGER DEFAULT 0,
    total_patches_unlocked INTEGER DEFAULT 3,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Seedlings inventory
CREATE TABLE IF NOT EXISTS seedlings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    potato_seeds INTEGER DEFAULT 1,
    tomato_seeds INTEGER DEFAULT 0,
    onion_seeds INTEGER DEFAULT 0,
    carrot_seeds INTEGER DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- VIP subscriptions
CREATE TABLE IF NOT EXISTS vip_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    tier INTEGER NOT NULL,
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    auto_renew BOOLEAN DEFAULT FALSE,
    payment_method TEXT,
    transaction_id TEXT,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- VIP daily rewards tracking
CREATE TABLE IF NOT EXISTS vip_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    reward_date DATE DEFAULT (DATE('now')),
    tier INTEGER NOT NULL,
    rewards_claimed TEXT, -- JSON string of claimed rewards
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
    UNIQUE(telegram_id, reward_date)
);

-- Contests
CREATE TABLE IF NOT EXISTS contests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    entry_cost INTEGER NOT NULL,
    ads_required INTEGER NOT NULL,
    prize_pool TEXT, -- JSON string
    max_participants INTEGER,
    status TEXT DEFAULT 'active', -- 'active', 'ended', 'cancelled'
    winners TEXT -- JSON array of winner telegram_ids
);

-- Contest participants
CREATE TABLE IF NOT EXISTS contest_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contest_id INTEGER NOT NULL,
    telegram_id INTEGER NOT NULL,
    entry_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    ads_watched INTEGER DEFAULT 0,
    qualified BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (contest_id) REFERENCES contests (id),
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
    UNIQUE(contest_id, telegram_id)
);

-- Transactions - All financial transactions
CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'purchase', 'reward', 'referral'
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL, -- 'USDT', 'TON', 'SBRcoin'
    status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    payment_method TEXT,
    transaction_hash TEXT,
    wallet_address TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Withdrawals - Special tracking for withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    processed_by INTEGER, -- Admin telegram_id
    transaction_id INTEGER,
    notes TEXT,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions (id)
);

-- Game statistics
CREATE TABLE IF NOT EXISTS game_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    crops_planted INTEGER DEFAULT 0,
    crops_harvested INTEGER DEFAULT 0,
    total_water_used INTEGER DEFAULT 0,
    total_boosters_used INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    contests_won INTEGER DEFAULT 0,
    referral_earnings DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    referral_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    level INTEGER DEFAULT 1,
    bonus_earned DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (referrer_id) REFERENCES users (telegram_id),
    FOREIGN KEY (referred_id) REFERENCES users (telegram_id)
);

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER UNIQUE NOT NULL,
    username TEXT,
    role TEXT DEFAULT 'admin', -- 'admin', 'moderator', 'support'
    permissions TEXT, -- JSON array of permissions
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER,
    FOREIGN KEY (created_by) REFERENCES admin_users (telegram_id)
);

-- System settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES admin_users (telegram_id)
);

-- Crop definitions
CREATE TABLE IF NOT EXISTS crop_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    emoji TEXT NOT NULL,
    growth_time_hours INTEGER NOT NULL,
    water_requirement INTEGER NOT NULL,
    selling_price INTEGER NOT NULL,
    max_booster_reduction INTEGER NOT NULL,
    seed_price_sbr INTEGER,
    seed_price_usdt DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE
);

-- Initialize crop types
INSERT OR IGNORE INTO crop_types (name, emoji, growth_time_hours, water_requirement, selling_price, max_booster_reduction, seed_price_sbr, seed_price_usdt) VALUES
('potato', '🥔', 24, 10, 100, 12, 50, NULL),
('tomato', '🍅', 48, 20, 150, 24, 100, NULL),
('onion', '🧅', 96, 50, 250, 48, NULL, 1.0),
('carrot', '🥕', 144, 100, 1300, 72, NULL, 5.0);

-- Initialize system settings
INSERT OR IGNORE INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('maintenance_mode', 'false', 'boolean', 'Enable/disable maintenance mode'),
('maintenance_message', 'SBRFARM is currently under maintenance. Please try again later.', 'string', 'Maintenance mode message'),
('max_patches', '8', 'number', 'Maximum number of patches per user'),
('max_water_drops', '100', 'number', 'Maximum water drops per user'),
('max_boosters', '10', 'number', 'Maximum boosters per user'),
('max_heavy_water', '5', 'number', 'Maximum heavy water drops per user'),
('sbrcoin_to_usdt_rate', '200', 'number', 'SBRcoin to USDT conversion rate'),
('ton_to_usdt_rate', '3.5', 'number', 'TON to USDT conversion rate'),
('daily_water_reward', '10', 'number', 'Daily check-in water reward'),
('ad_water_reward', '1', 'number', 'Water reward per ad watched'),
('channel_join_reward', '5', 'number', 'One-time channel join reward'),
('ad_cooldown_minutes', '1', 'number', 'Cooldown between ad watches'),
('referral_bonus_percentage', '10', 'number', 'Referral bonus percentage');

-- Notifications table for admin messages and system notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'admin', -- 'admin', 'system', 'payment', 'contest'
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    FOREIGN KEY (telegram_id) REFERENCES users (telegram_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patches_telegram_id ON patches(telegram_id);
CREATE INDEX IF NOT EXISTS idx_patches_harvest_time ON patches(harvest_time);
CREATE INDEX IF NOT EXISTS idx_transactions_telegram_id ON transactions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_telegram_id ON vip_subscriptions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_vip_subscriptions_active ON vip_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_contests_type ON contests(type);
CREATE INDEX IF NOT EXISTS idx_contests_status ON contests(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_notifications_telegram_id ON notifications(telegram_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);