const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

class DatabaseManager {
    constructor() {
        this.dbPath = process.env.DB_PATH || './data/sbrfarm.db';
        this.db = null;
    }

    connect() {
        if (!this.db) {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('❌ Database connection failed:', err);
                } else {
                    console.log('✅ Connected to database');
                }
            });
        }
        return this.db;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    // Helper method to run queries with promises
    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().run(query, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.connect().all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // User Management
    async createUser(telegramId, userData = {}) {
        const referralCode = this.generateReferralCode();
        
        const userQuery = `
            INSERT INTO users (telegram_id, username, first_name, last_name, language_code, referral_code, referred_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        try {
            await this.run(userQuery, [
                telegramId,
                userData.username || null,
                userData.first_name || null,
                userData.last_name || null,
                userData.language_code || 'en',
                referralCode,
                userData.referred_by || null
            ]);

            // Create user resources
            await this.run(`
                INSERT INTO user_resources (telegram_id) VALUES (?)
            `, [telegramId]);

            // Create default patches (3 patches)
            for (let i = 1; i <= 3; i++) {
                await this.run(`
                    INSERT INTO patches (telegram_id, patch_number, is_unlocked) VALUES (?, ?, ?)
                `, [telegramId, i, true]);
            }

            // Create patch parts record
            await this.run(`
                INSERT INTO patch_parts (telegram_id) VALUES (?)
            `, [telegramId]);

            // Create seedlings inventory with 1 potato seed
            await this.run(`
                INSERT INTO seedlings (telegram_id) VALUES (?)
            `, [telegramId]);

            // Create game stats
            await this.run(`
                INSERT INTO game_stats (telegram_id) VALUES (?)
            `, [telegramId]);

            console.log(`👤 New user created: ${telegramId}`);
            return this.getUser(telegramId);
        } catch (error) {
            console.error('❌ Failed to create user:', error);
            throw error;
        }
    }

    async getUser(telegramId) {
        return await this.get(`
            SELECT * FROM users WHERE telegram_id = ?
        `, [telegramId]);
    }

    async getUserWithResources(telegramId) {
        const query = `
            SELECT 
                u.*,
                ur.water_drops,
                ur.heavy_water_drops,
                ur.boosters,
                ur.sbr_coins,
                ur.last_daily_claim,
                ur.ads_watched_today,
                ur.ads_watched_total,
                ur.last_ad_watch,
                ur.joined_channel,
                pp.parts_owned,
                pp.total_patches_unlocked,
                s.potato_seeds,
                s.tomato_seeds,
                s.onion_seeds,
                s.carrot_seeds
            FROM users u
            LEFT JOIN user_resources ur ON u.telegram_id = ur.telegram_id
            LEFT JOIN patch_parts pp ON u.telegram_id = pp.telegram_id
            LEFT JOIN seedlings s ON u.telegram_id = s.telegram_id
            WHERE u.telegram_id = ?
        `;
        
        return await this.get(query, [telegramId]);
    }

    async updateUserActivity(telegramId) {
        return await this.run(`
            UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE telegram_id = ?
        `, [telegramId]);
    }

    async updateUserResources(telegramId, resources) {
        const fields = [];
        const values = [];
        
        Object.keys(resources).forEach(key => {
            if (resources[key] !== undefined) {
                fields.push(`${key} = ?`);
                values.push(resources[key]);
            }
        });
        
        if (fields.length === 0) return;
        
        values.push(telegramId);
        
        return await this.run(`
            UPDATE user_resources SET ${fields.join(', ')} WHERE telegram_id = ?
        `, values);
    }

    // Patch Management
    async getUserPatches(telegramId) {
        return await this.all(`
            SELECT * FROM patches WHERE telegram_id = ? ORDER BY patch_number
        `, [telegramId]);
    }

    async plantCrop(telegramId, patchNumber, cropType) {
        const now = new Date();
        const cropData = await this.getCropType(cropType);
        const harvestTime = new Date(now.getTime() + (cropData.growth_time_hours * 60 * 60 * 1000));
        
        return await this.run(`
            UPDATE patches 
            SET crop_type = ?, plant_time = ?, harvest_time = ?, is_ready = FALSE, boosters_used = 0
            WHERE telegram_id = ? AND patch_number = ?
        `, [cropType, now.toISOString(), harvestTime.toISOString(), telegramId, patchNumber]);
    }

    async harvestCrop(telegramId, patchNumber) {
        const patch = await this.get(`
            SELECT * FROM patches WHERE telegram_id = ? AND patch_number = ?
        `, [telegramId, patchNumber]);
        
        if (!patch || !patch.is_ready) {
            throw new Error('Crop is not ready for harvest');
        }
        
        const cropData = await this.getCropType(patch.crop_type);
        
        // Clear the patch
        await this.run(`
            UPDATE patches 
            SET crop_type = NULL, plant_time = NULL, harvest_time = NULL, is_ready = FALSE, boosters_used = 0
            WHERE telegram_id = ? AND patch_number = ?
        `, [telegramId, patchNumber]);
        
        // Add coins to user
        await this.run(`
            UPDATE user_resources 
            SET sbr_coins = sbr_coins + ?
            WHERE telegram_id = ?
        `, [cropData.selling_price, telegramId]);
        
        // Update stats
        await this.run(`
            UPDATE game_stats 
            SET crops_harvested = crops_harvested + 1, total_earnings = total_earnings + ?
            WHERE telegram_id = ?
        `, [cropData.selling_price, telegramId]);
        
        return cropData.selling_price;
    }

    async useBooster(telegramId, patchNumber) {
        const patch = await this.get(`
            SELECT * FROM patches WHERE telegram_id = ? AND patch_number = ?
        `, [telegramId, patchNumber]);
        
        if (!patch || !patch.crop_type || patch.is_ready) {
            throw new Error('No crop to boost or already ready');
        }
        
        const cropData = await this.getCropType(patch.crop_type);
        const maxReduction = cropData.max_booster_reduction;
        const currentBoostersUsed = patch.boosters_used;
        
        if (currentBoostersUsed * 2 >= maxReduction) {
            throw new Error('Maximum boosters already used for this crop');
        }
        
        // Reduce harvest time by 2 hours
        const currentHarvestTime = new Date(patch.harvest_time);
        const newHarvestTime = new Date(currentHarvestTime.getTime() - (2 * 60 * 60 * 1000));
        const isReady = newHarvestTime <= new Date();
        
        await this.run(`
            UPDATE patches 
            SET harvest_time = ?, boosters_used = boosters_used + 1, is_ready = ?
            WHERE telegram_id = ? AND patch_number = ?
        `, [newHarvestTime.toISOString(), isReady, telegramId, patchNumber]);
        
        // Reduce booster count
        await this.run(`
            UPDATE user_resources 
            SET boosters = boosters - 1
            WHERE telegram_id = ?
        `, [telegramId]);
        
        return newHarvestTime;
    }

    // Crop Types
    async getCropType(name) {
        return await this.get(`
            SELECT * FROM crop_types WHERE name = ?
        `, [name]);
    }

    async getAllCropTypes() {
        return await this.all(`
            SELECT * FROM crop_types WHERE is_active = TRUE ORDER BY growth_time_hours
        `);
    }

    // VIP Management
    async getActiveVIPSubscription(telegramId) {
        return await this.get(`
            SELECT * FROM vip_subscriptions 
            WHERE telegram_id = ? AND is_active = TRUE AND end_date > CURRENT_TIMESTAMP
            ORDER BY tier DESC LIMIT 1
        `, [telegramId]);
    }

    async createVIPSubscription(telegramId, tier, durationDays, paymentData = {}) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + durationDays);
        
        return await this.run(`
            INSERT INTO vip_subscriptions (telegram_id, tier, end_date, payment_method, transaction_id)
            VALUES (?, ?, ?, ?, ?)
        `, [telegramId, tier, endDate.toISOString(), paymentData.method, paymentData.transaction_id]);
    }

    // Contest Management
    async getActiveContests() {
        return await this.all(`
            SELECT * FROM contests WHERE status = 'active' AND end_date > CURRENT_TIMESTAMP
        `);
    }

    async joinContest(telegramId, contestId) {
        return await this.run(`
            INSERT OR IGNORE INTO contest_participants (contest_id, telegram_id)
            VALUES (?, ?)
        `, [contestId, telegramId]);
    }

    async getContestParticipation(telegramId, contestId) {
        return await this.get(`
            SELECT * FROM contest_participants 
            WHERE telegram_id = ? AND contest_id = ?
        `, [telegramId, contestId]);
    }

    // Transaction Management
    async createTransaction(telegramId, type, amount, currency, description = '', additionalData = {}) {
        return await this.run(`
            INSERT INTO transactions (telegram_id, type, amount, currency, description, payment_method, wallet_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            telegramId, 
            type, 
            amount, 
            currency, 
            description,
            additionalData.payment_method || null,
            additionalData.wallet_address || null
        ]);
    }

    async updateTransactionStatus(transactionId, status, transactionHash = null) {
        const updates = ['status = ?'];
        const values = [status];
        
        if (transactionHash) {
            updates.push('transaction_hash = ?');
            values.push(transactionHash);
        }
        
        if (status === 'completed') {
            updates.push('completed_at = CURRENT_TIMESTAMP');
        }
        
        values.push(transactionId);
        
        return await this.run(`
            UPDATE transactions SET ${updates.join(', ')} WHERE id = ?
        `, values);
    }

    // Withdrawal Management
    async createWithdrawalRequest(telegramId, amount, currency, walletAddress) {
        return await this.run(`
            INSERT INTO withdrawals (telegram_id, amount, currency, wallet_address)
            VALUES (?, ?, ?, ?)
        `, [telegramId, amount, currency, walletAddress]);
    }

    async getPendingWithdrawals() {
        return await this.all(`
            SELECT w.*, u.username, u.first_name 
            FROM withdrawals w
            JOIN users u ON w.telegram_id = u.telegram_id
            WHERE w.status = 'pending'
            ORDER BY w.requested_at ASC
        `);
    }

    // Referral System
    async processReferral(referrerCode, newUserId) {
        const referrer = await this.get(`
            SELECT telegram_id FROM users WHERE referral_code = ?
        `, [referrerCode]);
        
        if (!referrer) return null;
        
        // Update new user's referrer
        await this.run(`
            UPDATE users SET referred_by = ? WHERE telegram_id = ?
        `, [referrer.telegram_id, newUserId]);
        
        // Create referral record
        await this.run(`
            INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)
        `, [referrer.telegram_id, newUserId]);
        
        // Update referrer's total referrals
        await this.run(`
            UPDATE users SET total_referrals = total_referrals + 1 WHERE telegram_id = ?
        `, [referrer.telegram_id]);
        
        // Give referral bonus water
        const bonusWater = 5; // Configurable
        await this.run(`
            UPDATE user_resources 
            SET water_drops = MIN(water_drops + ?, ?)
            WHERE telegram_id = ?
        `, [bonusWater, 100, referrer.telegram_id]); // Max 100 water drops
        
        return referrer.telegram_id;
    }

    // Daily Claims
    async claimDailyReward(telegramId) {
        const today = new Date().toDateString();
        const user = await this.get(`
            SELECT last_daily_claim FROM user_resources WHERE telegram_id = ?
        `, [telegramId]);
        
        if (user && user.last_daily_claim) {
            const lastClaim = new Date(user.last_daily_claim).toDateString();
            if (lastClaim === today) {
                throw new Error('Daily reward already claimed today');
            }
        }
        
        const dailyWater = 10;
        await this.run(`
            UPDATE user_resources 
            SET water_drops = MIN(water_drops + ?, ?), 
                last_daily_claim = CURRENT_TIMESTAMP,
                ads_watched_today = 0
            WHERE telegram_id = ?
        `, [dailyWater, 100, telegramId]);
        
        return dailyWater;
    }

    // Ad Watching
    async watchAd(telegramId) {
        const now = new Date();
        const user = await this.get(`
            SELECT last_ad_watch, ads_watched_today FROM user_resources WHERE telegram_id = ?
        `, [telegramId]);
        
        if (user && user.last_ad_watch) {
            const lastWatch = new Date(user.last_ad_watch);
            const timeDiff = now - lastWatch;
            const cooldownMs = 1 * 60 * 1000; // 1 minute
            
            if (timeDiff < cooldownMs) {
                throw new Error('Ad cooldown active');
            }
        }
        
        if (user && user.ads_watched_today >= 50) {
            throw new Error('Daily ad limit reached');
        }
        
        await this.run(`
            UPDATE user_resources 
            SET water_drops = MIN(water_drops + 1, 100),
                last_ad_watch = CURRENT_TIMESTAMP,
                ads_watched_today = ads_watched_today + 1,
                ads_watched_total = ads_watched_total + 1
            WHERE telegram_id = ?
        `, [telegramId]);
        
        return 1; // Water drops earned
    }

    // Utility Methods
    generateReferralCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    async checkReadyCrops() {
        return await this.all(`
            SELECT * FROM patches 
            WHERE crop_type IS NOT NULL 
            AND harvest_time <= CURRENT_TIMESTAMP 
            AND is_ready = FALSE
        `);
    }

    async markCropsReady(patches) {
        if (patches.length === 0) return;
        
        const patchIds = patches.map(p => p.id);
        const placeholders = patchIds.map(() => '?').join(',');
        
        return await this.run(`
            UPDATE patches SET is_ready = TRUE WHERE id IN (${placeholders})
        `, patchIds);
    }

    // Admin Functions
    async getUserStats() {
        return await this.get(`
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN DATE(registration_date) = DATE('now') THEN 1 END) as new_today,
                COUNT(CASE WHEN DATE(last_activity) = DATE('now') THEN 1 END) as active_today
            FROM users
        `);
    }

    async getGameStats() {
        return await this.get(`
            SELECT 
                SUM(crops_planted) as total_crops_planted,
                SUM(crops_harvested) as total_crops_harvested,
                SUM(total_earnings) as total_earnings_sbr,
                COUNT(DISTINCT telegram_id) as active_farmers
            FROM game_stats
        `);
    }

    async banUser(telegramId, reason, bannedBy) {
        return await this.run(`
            UPDATE users SET is_banned = TRUE, ban_reason = ? WHERE telegram_id = ?
        `, [reason, telegramId]);
    }

    async unbanUser(telegramId) {
        return await this.run(`
            UPDATE users SET is_banned = FALSE, ban_reason = NULL WHERE telegram_id = ?
        `, [telegramId]);
    }
}

module.exports = DatabaseManager;