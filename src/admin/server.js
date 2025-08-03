const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const DatabaseManager = require('../database/manager');
const CronScheduler = require('../cron/scheduler');
require('dotenv').config();

class AdminDashboard {
    constructor() {
        this.app = express();
        this.db = new DatabaseManager();
        this.cronScheduler = new CronScheduler();
        this.setupMiddleware();
        this.setupRoutes();
        this.port = process.env.ADMIN_PORT || 3001;
    }

    setupMiddleware() {
        // Security and performance
        this.app.use(helmet({
            contentSecurityPolicy: false, // Allow inline scripts for dashboard
        }));
        this.app.use(compression());
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use('/static', express.static(path.join(__dirname, '../../public')));
        this.app.use('/assets', express.static(path.join(__dirname, 'assets')));

        // Logging middleware
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Dashboard routes
        this.app.get('/', (req, res) => this.serveDashboard(req, res));
        this.app.get('/admin', (req, res) => this.serveDashboard(req, res));
        this.app.get('/login', (req, res) => this.serveLogin(req, res));

        // Authentication
        this.app.post('/api/auth/login', (req, res) => this.handleLogin(req, res));
        this.app.post('/api/auth/logout', (req, res) => this.handleLogout(req, res));

        // Protected API routes
        this.app.use('/api', this.authenticateToken.bind(this));

        // Statistics
        this.app.get('/api/stats/overview', (req, res) => this.getOverviewStats(req, res));
        this.app.get('/api/stats/users', (req, res) => this.getUserStats(req, res));
        this.app.get('/api/stats/revenue', (req, res) => this.getRevenueStats(req, res));
        this.app.get('/api/stats/games', (req, res) => this.getGameStats(req, res));

        // User Management
        this.app.get('/api/users', (req, res) => this.getUsers(req, res));
        this.app.get('/api/users/:id', (req, res) => this.getUser(req, res));
        this.app.post('/api/users/:id/ban', (req, res) => this.banUser(req, res));
        this.app.post('/api/users/:id/unban', (req, res) => this.unbanUser(req, res));
        this.app.post('/api/users/:id/gift', (req, res) => this.sendGift(req, res));

        // VIP Management
        this.app.get('/api/vip/subscriptions', (req, res) => this.getVIPSubscriptions(req, res));
        this.app.post('/api/vip/create', (req, res) => this.createVIPSubscription(req, res));
        this.app.post('/api/vip/:id/extend', (req, res) => this.extendVIPSubscription(req, res));

        // Payment Management
        this.app.get('/api/payments/pending', (req, res) => this.getPendingPayments(req, res));
        this.app.post('/api/payments/:id/approve', (req, res) => this.approvePayment(req, res));
        this.app.post('/api/payments/:id/reject', (req, res) => this.rejectPayment(req, res));
        this.app.get('/api/payments/history', (req, res) => this.getPaymentHistory(req, res));

        // Contest Management
        this.app.get('/api/contests', (req, res) => this.getContests(req, res));
        this.app.post('/api/contests/create', (req, res) => this.createContest(req, res));
        this.app.post('/api/contests/:id/end', (req, res) => this.endContest(req, res));
        this.app.get('/api/contests/:id/participants', (req, res) => this.getContestParticipants(req, res));

        // Notification System
        this.app.post('/api/notifications/broadcast', (req, res) => this.broadcastMessage(req, res));
        this.app.post('/api/notifications/user', (req, res) => this.sendUserNotification(req, res));
        this.app.get('/api/notifications/history', (req, res) => this.getNotificationHistory(req, res));

        // System Management
        this.app.get('/api/system/status', (req, res) => this.getSystemStatus(req, res));
        this.app.post('/api/system/restart-bot', (req, res) => this.restartBot(req, res));
        this.app.post('/api/system/restart-cron', (req, res) => this.restartCron(req, res));
        this.app.post('/api/system/backup', (req, res) => this.createBackup(req, res));

        // Settings
        this.app.get('/api/settings', (req, res) => this.getSettings(req, res));
        this.app.post('/api/settings', (req, res) => this.updateSettings(req, res));

        // Error handling
        this.app.use((err, req, res, next) => {
            console.error('Admin dashboard error:', err);
            res.status(500).json({ error: 'Internal server error' });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    // Authentication middleware
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }

        jwt.verify(token, process.env.ADMIN_JWT_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({ error: 'Invalid or expired token' });
            }
            req.user = user;
            next();
        });
    }

    // Serve dashboard HTML
    serveDashboard(req, res) {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    }

    // Serve login page
    serveLogin(req, res) {
        res.sendFile(path.join(__dirname, 'login.html'));
    }

    // Authentication handlers
    async handleLogin(req, res) {
        try {
            const { username, password } = req.body;
            
            // In production, this should check against a proper admin database
            // For now, using environment variables
            const adminUsername = 'admin';
            const adminPassword = 'sbrfarm2024'; // Change this!

            if (username === adminUsername && password === adminPassword) {
                const token = jwt.sign(
                    { username, role: 'admin' },
                    process.env.ADMIN_JWT_SECRET,
                    { expiresIn: process.env.ADMIN_SESSION_TIMEOUT || '24h' }
                );

                res.json({ 
                    success: true, 
                    token,
                    user: { username, role: 'admin' }
                });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    handleLogout(req, res) {
        // In a production environment, you might want to blacklist the token
        res.json({ success: true, message: 'Logged out successfully' });
    }

    // Statistics endpoints
    async getOverviewStats(req, res) {
        try {
            const userStats = await this.db.getUserStats();
            const gameStats = await this.db.getGameStats();
            
            const totalRevenue = await this.db.get(`
                SELECT SUM(amount) as total FROM transactions 
                WHERE type = 'deposit' AND status = 'completed'
            `);

            const activeVIPs = await this.db.get(`
                SELECT COUNT(*) as count FROM vip_subscriptions 
                WHERE is_active = TRUE AND end_date > CURRENT_TIMESTAMP
            `);

            const pendingPayments = await this.db.get(`
                SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'
            `);

            res.json({
                users: {
                    total: userStats.total_users || 0,
                    new_today: userStats.new_today || 0,
                    active_today: userStats.active_today || 0
                },
                game: {
                    crops_planted: gameStats.total_crops_planted || 0,
                    crops_harvested: gameStats.total_crops_harvested || 0,
                    active_farmers: gameStats.active_farmers || 0
                },
                revenue: {
                    total: totalRevenue?.total || 0,
                    currency: 'USDT'
                },
                vip: {
                    active_subscriptions: activeVIPs?.count || 0
                },
                pending: {
                    payments: pendingPayments?.count || 0
                }
            });
        } catch (error) {
            console.error('Overview stats error:', error);
            res.status(500).json({ error: 'Failed to fetch overview stats' });
        }
    }

    async getUserStats(req, res) {
        try {
            const dailyUsers = await this.db.all(`
                SELECT DATE(registration_date) as date, COUNT(*) as count
                FROM users 
                WHERE registration_date >= DATE('now', '-30 days')
                GROUP BY DATE(registration_date)
                ORDER BY date DESC
            `);

            const topReferrers = await this.db.all(`
                SELECT u.username, u.first_name, u.total_referrals
                FROM users u
                WHERE u.total_referrals > 0
                ORDER BY u.total_referrals DESC
                LIMIT 10
            `);

            res.json({
                daily_registrations: dailyUsers,
                top_referrers: topReferrers
            });
        } catch (error) {
            console.error('User stats error:', error);
            res.status(500).json({ error: 'Failed to fetch user stats' });
        }
    }

    async getRevenueStats(req, res) {
        try {
            const dailyRevenue = await this.db.all(`
                SELECT DATE(created_at) as date, 
                       SUM(CASE WHEN currency = 'USDT' THEN amount ELSE amount/200 END) as usdt_amount
                FROM transactions 
                WHERE type = 'deposit' AND status = 'completed'
                AND created_at >= DATE('now', '-30 days')
                GROUP BY DATE(created_at)
                ORDER BY date DESC
            `);

            const vipRevenue = await this.db.all(`
                SELECT vs.tier, COUNT(*) as subscriptions, 
                       COUNT(*) * (CASE vs.tier 
                           WHEN 1 THEN 7 
                           WHEN 2 THEN 15 
                           WHEN 3 THEN 30 
                           WHEN 4 THEN 99 
                           ELSE 0 END) as revenue
                FROM vip_subscriptions vs
                WHERE vs.start_date >= DATE('now', '-30 days')
                GROUP BY vs.tier
            `);

            res.json({
                daily_revenue: dailyRevenue,
                vip_revenue: vipRevenue
            });
        } catch (error) {
            console.error('Revenue stats error:', error);
            res.status(500).json({ error: 'Failed to fetch revenue stats' });
        }
    }

    async getGameStats(req, res) {
        try {
            const cropStats = await this.db.all(`
                SELECT crop_type, COUNT(*) as planted, 
                       SUM(CASE WHEN is_ready = TRUE THEN 1 ELSE 0 END) as harvested
                FROM patches 
                WHERE crop_type IS NOT NULL
                GROUP BY crop_type
            `);

            const contestStats = await this.db.all(`
                SELECT type, COUNT(*) as total_contests,
                       AVG(JSON_ARRAY_LENGTH(COALESCE(winners, '[]'))) as avg_participants
                FROM contests 
                WHERE created_at >= DATE('now', '-30 days')
                GROUP BY type
            `);

            res.json({
                crop_statistics: cropStats,
                contest_statistics: contestStats
            });
        } catch (error) {
            console.error('Game stats error:', error);
            res.status(500).json({ error: 'Failed to fetch game stats' });
        }
    }

    // User management endpoints
    async getUsers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;

            let whereClause = '';
            let params = [];

            if (search) {
                whereClause = 'WHERE u.username LIKE ? OR u.first_name LIKE ? OR u.telegram_id = ?';
                params = [`%${search}%`, `%${search}%`, search];
            }

            const users = await this.db.all(`
                SELECT u.*, ur.sbr_coins, ur.water_drops, pp.total_patches_unlocked,
                       vs.tier as vip_tier, vs.end_date as vip_end_date
                FROM users u
                LEFT JOIN user_resources ur ON u.telegram_id = ur.telegram_id
                LEFT JOIN patch_parts pp ON u.telegram_id = pp.telegram_id
                LEFT JOIN vip_subscriptions vs ON u.telegram_id = vs.telegram_id 
                    AND vs.is_active = TRUE AND vs.end_date > CURRENT_TIMESTAMP
                ${whereClause}
                ORDER BY u.registration_date DESC
                LIMIT ? OFFSET ?
            `, [...params, limit, offset]);

            const totalCount = await this.db.get(`
                SELECT COUNT(*) as count FROM users u ${whereClause}
            `, params);

            res.json({
                users,
                pagination: {
                    page,
                    limit,
                    total: totalCount.count,
                    pages: Math.ceil(totalCount.count / limit)
                }
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    }

    async getUser(req, res) {
        try {
            const telegramId = req.params.id;
            
            const user = await this.db.getUserWithResources(telegramId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            const patches = await this.db.getUserPatches(telegramId);
            const gameStats = await this.db.get(`
                SELECT * FROM game_stats WHERE telegram_id = ?
            `, [telegramId]);

            const transactions = await this.db.all(`
                SELECT * FROM transactions WHERE telegram_id = ? 
                ORDER BY created_at DESC LIMIT 20
            `, [telegramId]);

            res.json({
                user,
                patches,
                stats: gameStats,
                recent_transactions: transactions
            });
        } catch (error) {
            console.error('Get user error:', error);
            res.status(500).json({ error: 'Failed to fetch user details' });
        }
    }

    async banUser(req, res) {
        try {
            const telegramId = req.params.id;
            const { reason } = req.body;

            await this.db.banUser(telegramId, reason, req.user.username);
            
            // Send notification to user
            await this.sendUserNotification(telegramId, `Your account has been banned. Reason: ${reason}`);

            res.json({ success: true, message: 'User banned successfully' });
        } catch (error) {
            console.error('Ban user error:', error);
            res.status(500).json({ error: 'Failed to ban user' });
        }
    }

    async unbanUser(req, res) {
        try {
            const telegramId = req.params.id;
            
            await this.db.unbanUser(telegramId);
            
            // Send notification to user
            await this.sendUserNotification(telegramId, 'Your account has been unbanned. Welcome back to SBRFARM!');

            res.json({ success: true, message: 'User unbanned successfully' });
        } catch (error) {
            console.error('Unban user error:', error);
            res.status(500).json({ error: 'Failed to unban user' });
        }
    }

    async sendGift(req, res) {
        try {
            const telegramId = req.params.id;
            const { type, amount, message } = req.body;

            const user = await this.db.getUserWithResources(telegramId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Process gift based on type
            const updates = {};
            let giftMessage = message || `🎁 Admin Gift: `;

            switch (type) {
                case 'sbr_coins':
                    updates.sbr_coins = user.sbr_coins + parseInt(amount);
                    giftMessage += `${amount} SBRcoins`;
                    break;
                case 'water_drops':
                    updates.water_drops = Math.min(user.water_drops + parseInt(amount), 100);
                    giftMessage += `${amount} water drops`;
                    break;
                case 'boosters':
                    updates.boosters = Math.min(user.boosters + parseInt(amount), 10);
                    giftMessage += `${amount} boosters`;
                    break;
                case 'heavy_water':
                    updates.heavy_water_drops = Math.min(user.heavy_water_drops + parseInt(amount), 5);
                    giftMessage += `${amount} heavy water drops`;
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid gift type' });
            }

            await this.db.updateUserResources(telegramId, updates);
            
            // Send notification to user
            await this.sendUserNotification(telegramId, giftMessage);

            res.json({ success: true, message: 'Gift sent successfully' });
        } catch (error) {
            console.error('Send gift error:', error);
            res.status(500).json({ error: 'Failed to send gift' });
        }
    }

    // Payment management
    async getPendingPayments(req, res) {
        try {
            const pendingPayments = await this.db.all(`
                SELECT w.*, u.username, u.first_name
                FROM withdrawals w
                JOIN users u ON w.telegram_id = u.telegram_id
                WHERE w.status = 'pending'
                ORDER BY w.requested_at ASC
            `);

            // Also get pending VIP purchases
            const pendingVIPs = await this.db.all(`
                SELECT t.*, u.username, u.first_name
                FROM transactions t
                JOIN users u ON t.telegram_id = u.telegram_id
                WHERE t.type = 'vip_purchase' AND t.status = 'pending'
                ORDER BY t.created_at ASC
            `);

            res.json({
                withdrawals: pendingPayments,
                vip_purchases: pendingVIPs
            });
        } catch (error) {
            console.error('Get pending payments error:', error);
            res.status(500).json({ error: 'Failed to fetch pending payments' });
        }
    }

    async approvePayment(req, res) {
        try {
            const paymentId = req.params.id;
            const { type, notes } = req.body; // type: 'withdrawal' or 'vip_purchase'

            if (type === 'withdrawal') {
                await this.db.run(`
                    UPDATE withdrawals 
                    SET status = 'approved', processed_at = CURRENT_TIMESTAMP, 
                        processed_by = ?, notes = ?
                    WHERE id = ?
                `, [req.user.username, notes, paymentId]);

                const withdrawal = await this.db.get(`
                    SELECT w.*, u.first_name FROM withdrawals w
                    JOIN users u ON w.telegram_id = u.telegram_id
                    WHERE w.id = ?
                `, [paymentId]);

                if (withdrawal) {
                    await this.sendUserNotification(
                        withdrawal.telegram_id, 
                        `✅ Your withdrawal of ${withdrawal.amount} ${withdrawal.currency} has been approved and processed.`
                    );
                }
            } else if (type === 'vip_purchase') {
                const transaction = await this.db.get(`
                    SELECT * FROM transactions WHERE id = ?
                `, [paymentId]);

                if (transaction) {
                    // Create VIP subscription
                    const vipTier = parseInt(transaction.description.match(/Tier (\d+)/)?.[1] || '1');
                    await this.db.createVIPSubscription(
                        transaction.telegram_id, 
                        vipTier, 
                        30, 
                        { method: 'manual_approval', transaction_id: paymentId }
                    );

                    await this.db.updateTransactionStatus(paymentId, 'completed');

                    await this.sendUserNotification(
                        transaction.telegram_id, 
                        `🌟 Your VIP Tier ${vipTier} subscription has been activated! Enjoy your premium benefits.`
                    );
                }
            }

            res.json({ success: true, message: 'Payment approved successfully' });
        } catch (error) {
            console.error('Approve payment error:', error);
            res.status(500).json({ error: 'Failed to approve payment' });
        }
    }

    async rejectPayment(req, res) {
        try {
            const paymentId = req.params.id;
            const { type, reason } = req.body;

            if (type === 'withdrawal') {
                await this.db.run(`
                    UPDATE withdrawals 
                    SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, 
                        processed_by = ?, notes = ?
                    WHERE id = ?
                `, [req.user.username, reason, paymentId]);

                const withdrawal = await this.db.get(`
                    SELECT w.*, u.first_name FROM withdrawals w
                    JOIN users u ON w.telegram_id = u.telegram_id
                    WHERE w.id = ?
                `, [paymentId]);

                if (withdrawal) {
                    await this.sendUserNotification(
                        withdrawal.telegram_id, 
                        `❌ Your withdrawal request has been rejected. Reason: ${reason}`
                    );
                }
            } else if (type === 'vip_purchase') {
                await this.db.updateTransactionStatus(paymentId, 'failed');
                
                const transaction = await this.db.get(`
                    SELECT * FROM transactions WHERE id = ?
                `, [paymentId]);

                if (transaction) {
                    await this.sendUserNotification(
                        transaction.telegram_id, 
                        `❌ Your VIP purchase has been rejected. Reason: ${reason}`
                    );
                }
            }

            res.json({ success: true, message: 'Payment rejected successfully' });
        } catch (error) {
            console.error('Reject payment error:', error);
            res.status(500).json({ error: 'Failed to reject payment' });
        }
    }

    // Notification system
    async sendUserNotification(telegramId, message) {
        try {
            // Queue notification in database - it will be processed by the bot's notification system
            await this.db.run(`
                INSERT INTO notifications (telegram_id, message, sent_at, type)
                VALUES (?, ?, CURRENT_TIMESTAMP, 'admin')
            `, [telegramId, message]);

            console.log(`Notification queued for ${telegramId}: ${message}`);
        } catch (error) {
            console.error('Send notification error:', error);
        }
    }

    async broadcastMessage(req, res) {
        try {
            const { message, target_group } = req.body; // target_group: 'all', 'vip', 'active'

            let whereClause = '';
            if (target_group === 'vip') {
                whereClause = `JOIN vip_subscriptions vs ON u.telegram_id = vs.telegram_id 
                              WHERE vs.is_active = TRUE AND vs.end_date > CURRENT_TIMESTAMP`;
            } else if (target_group === 'active') {
                whereClause = `WHERE u.last_activity >= DATE('now', '-7 days')`;
            } else {
                whereClause = `WHERE u.is_banned = FALSE`;
            }

            const users = await this.db.all(`
                SELECT u.telegram_id FROM users u ${whereClause}
            `);

            // Queue notifications for all users
            for (const user of users) {
                await this.sendUserNotification(user.telegram_id, `📢 ${message}`);
            }

            res.json({ 
                success: true, 
                message: `Broadcast sent to ${users.length} users`,
                count: users.length 
            });
        } catch (error) {
            console.error('Broadcast error:', error);
            res.status(500).json({ error: 'Failed to send broadcast' });
        }
    }

    // System management
    async getSystemStatus(req, res) {
        try {
            const cronStatus = this.cronScheduler.getJobStatus();
            const dbStats = await this.db.get(`
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM patches WHERE crop_type IS NOT NULL) as active_crops,
                    (SELECT COUNT(*) FROM contests WHERE status = 'active') as active_contests
            `);

            res.json({
                status: 'running',
                uptime: process.uptime(),
                memory_usage: process.memoryUsage(),
                cron_jobs: cronStatus,
                database: dbStats,
                version: require('../../package.json').version
            });
        } catch (error) {
            console.error('System status error:', error);
            res.status(500).json({ error: 'Failed to get system status' });
        }
    }

    async restartBot(req, res) {
        try {
            // In a production environment, you would use PM2 or similar
            console.log('Bot restart requested by admin');
            res.json({ success: true, message: 'Bot restart initiated' });
            
            // TODO: Implement actual bot restart logic
        } catch (error) {
            console.error('Restart bot error:', error);
            res.status(500).json({ error: 'Failed to restart bot' });
        }
    }

    async restartCron(req, res) {
        try {
            this.cronScheduler.stop();
            setTimeout(() => {
                this.cronScheduler.start();
            }, 1000);

            res.json({ success: true, message: 'Cron scheduler restarted' });
        } catch (error) {
            console.error('Restart cron error:', error);
            res.status(500).json({ error: 'Failed to restart cron scheduler' });
        }
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`🚀 SBRFARM Admin Dashboard running on port ${this.port}`);
            console.log(`📊 Dashboard URL: http://localhost:${this.port}/admin`);
        });
    }
}

// Start the admin dashboard
if (require.main === module) {
    const dashboard = new AdminDashboard();
    dashboard.start();
}

module.exports = AdminDashboard;