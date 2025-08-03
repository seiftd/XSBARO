const { Telegraf } = require('telegraf');
const BotHandlers = require('./handlers');
const NotificationSystem = require('./notification');
require('dotenv').config();

class SBRFarmBot {
    constructor() {
        this.bot = new Telegraf(process.env.BOT_TOKEN);
        this.handlers = new BotHandlers();
        this.notifications = new NotificationSystem(this.bot);
        this.setupMiddleware();
        this.setupCommands();
        this.setupCallbacks();
        this.setupTextHandlers();
    }

    setupMiddleware() {
        // Error handling middleware
        this.bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            if (ctx) {
                ctx.reply('❌ Something went wrong. Please try again later.').catch(console.error);
            }
        });

        // Rate limiting middleware
        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) return;

            // Simple rate limiting (can be enhanced with Redis in production)
            const now = Date.now();
            const userKey = `rate_limit_${userId}`;
            
            if (!this.rateLimitMap) {
                this.rateLimitMap = new Map();
            }

            const userData = this.rateLimitMap.get(userKey) || { count: 0, resetTime: now + 60000 };
            
            if (now > userData.resetTime) {
                userData.count = 0;
                userData.resetTime = now + 60000;
            }

            if (userData.count > 30) { // Max 30 requests per minute
                await ctx.reply('⏳ Please slow down. Try again in a minute.');
                return;
            }

            userData.count++;
            this.rateLimitMap.set(userKey, userData);

            return next();
        });

        // Logging middleware
        this.bot.use(async (ctx, next) => {
            const start = Date.now();
            const userId = ctx.from?.id;
            const username = ctx.from?.username || 'unknown';
            const command = ctx.message?.text || ctx.callbackQuery?.data || 'callback';
            
            console.log(`📥 ${username} (${userId}): ${command}`);
            
            await next();
            
            const duration = Date.now() - start;
            console.log(`📤 Response sent in ${duration}ms`);
        });
    }

    setupCommands() {
        // Core commands
        this.bot.command('start', (ctx) => this.handlers.handleStart(ctx));
        this.bot.command('help', (ctx) => this.handlers.handleHelp(ctx));
        
        // Farm commands
        this.bot.command('farm', (ctx) => this.handlers.handleFarm(ctx));
        this.bot.command('plant', (ctx) => this.handlers.handlePlant(ctx));
        this.bot.command('harvest', (ctx) => this.handlers.handleHarvest(ctx));
        
        // Water commands
        this.bot.command('water', (ctx) => this.handlers.handleWater(ctx));
        this.bot.command('daily', (ctx) => this.handlers.handleDaily(ctx));
        this.bot.command('ad', (ctx) => this.handlers.handleWatchAd(ctx));
        
        // Economy commands
        this.bot.command('shop', (ctx) => this.handlers.handleShop(ctx));
        this.bot.command('wallet', (ctx) => this.handlers.handleWallet(ctx));
        
        // Social features
        this.bot.command('vip', (ctx) => this.handlers.handleVIP(ctx));
        this.bot.command('contests', (ctx) => this.handlers.handleContests(ctx));
        this.bot.command('referral', (ctx) => this.handlers.handleReferral(ctx));
        
        // Stats and info
        this.bot.command('stats', (ctx) => this.handleStats(ctx));
        this.bot.command('profile', (ctx) => this.handleProfile(ctx));
        
        // Admin commands (if user is admin)
        this.bot.command('admin', (ctx) => this.handleAdmin(ctx));
    }

    setupCallbacks() {
        // Handle all callback queries
        this.bot.on('callback_query', (ctx) => this.handlers.handleCallback(ctx));
    }

    setupTextHandlers() {
        // Handle keyboard button presses
        this.bot.hears('🌾 My Farm', (ctx) => this.handlers.handleFarm(ctx));
        this.bot.hears('🛒 Shop', (ctx) => this.handlers.handleShop(ctx));
        this.bot.hears('💧 Water', (ctx) => this.handlers.handleWater(ctx));
        this.bot.hears('🌟 VIP', (ctx) => this.handlers.handleVIP(ctx));
        this.bot.hears('🏆 Contests', (ctx) => this.handlers.handleContests(ctx));
        this.bot.hears('💰 Wallet', (ctx) => this.handlers.handleWallet(ctx));
        this.bot.hears('👥 Referrals', (ctx) => this.handlers.handleReferral(ctx));
        this.bot.hears('📖 Help', (ctx) => this.handlers.handleHelp(ctx));

        // Handle patch-specific actions
        this.bot.hears(/^🌱 Plant Patch (\d+)$/, async (ctx) => {
            const patchNumber = parseInt(ctx.match[1]);
            // Show crop selection for specific patch
            await this.showCropSelection(ctx, patchNumber);
        });

        this.bot.hears(/^🌾 Harvest Patch (\d+)$/, async (ctx) => {
            const patchNumber = parseInt(ctx.match[1]);
            try {
                const result = await this.handlers.game.harvestCrop(ctx.from.id, patchNumber);
                await ctx.reply(result.message);
            } catch (error) {
                await ctx.reply(`❌ ${error.message}`);
            }
        });

        this.bot.hears(/^⚡ Boost Patch (\d+)$/, async (ctx) => {
            const patchNumber = parseInt(ctx.match[1]);
            try {
                const result = await this.handlers.game.useBooster(ctx.from.id, patchNumber);
                await ctx.reply(result.message);
            } catch (error) {
                await ctx.reply(`❌ ${error.message}`);
            }
        });
    }

    async handleStats(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.handlers.game.validateUser(telegramId);
            
            const user = await this.handlers.game.getUserProfile(telegramId);
            const gameStats = await this.handlers.game.db.get(`
                SELECT * FROM game_stats WHERE telegram_id = ?
            `, [telegramId]);

            const message = `
📊 <b>Your SBRFARM Statistics</b>

<b>🌾 Farming Stats:</b>
• Crops Planted: ${gameStats?.crops_planted || 0}
• Crops Harvested: ${gameStats?.crops_harvested || 0}
• Total Earnings: ${gameStats?.total_earnings || 0} SBRcoins
• Water Used: ${gameStats?.total_water_used || 0} drops
• Boosters Used: ${gameStats?.total_boosters_used || 0}

<b>🏆 Achievements:</b>
• Games Played: ${gameStats?.games_played || 0}
• Contests Won: ${gameStats?.contests_won || 0}
• Referral Earnings: ${gameStats?.referral_earnings || 0} SBRcoins

<b>👥 Social:</b>
• Total Referrals: ${user.total_referrals}
• Registration: ${new Date(user.registration_date).toLocaleDateString()}
• Last Activity: ${new Date(user.last_activity).toLocaleDateString()}
            `;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Stats error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    async handleProfile(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.handlers.game.validateUser(telegramId);
            
            const user = await this.handlers.game.getUserProfile(telegramId);
            const vipInfo = await this.handlers.game.getVIPInfo(telegramId);

            const message = `
👤 <b>Your Profile</b>

<b>📝 Basic Info:</b>
• Name: ${user.first_name || user.username || 'Farmer'}
• User ID: ${user.telegram_id}
• Language: ${user.language_code || 'en'}

<b>💰 Resources:</b>
• SBRcoins: ${user.sbr_coins}
• Water Drops: ${user.water_drops}/100
• Heavy Water: ${user.heavy_water_drops}/5
• Boosters: ${user.boosters}

<b>🏡 Farm:</b>
• Patches: ${user.total_patches_unlocked}/8
• Patch Parts: ${user.parts_owned}

<b>🌱 Seeds:</b>
• Potatoes: ${user.potato_seeds}
• Tomatoes: ${user.tomato_seeds}
• Onions: ${user.onion_seeds}
• Carrots: ${user.carrot_seeds}

<b>🌟 VIP Status:</b>
${vipInfo.is_vip ? `Tier ${vipInfo.current_tier} (${vipInfo.days_remaining} days left)` : 'Not VIP'}

<b>👥 Referrals:</b>
• Code: ${user.referral_code}
• Total Referred: ${user.total_referrals}
            `;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Profile error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    async handleAdmin(ctx) {
        try {
            const telegramId = ctx.from.id;
            
            // Check if user is admin
            const admin = await this.handlers.game.db.get(`
                SELECT * FROM admin_users WHERE telegram_id = ? AND is_active = TRUE
            `, [telegramId]);

            if (!admin) {
                await ctx.reply('❌ Access denied. Admin privileges required.');
                return;
            }

            const message = `
🔧 <b>Admin Panel</b>

Use the admin dashboard for full management:
${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:3001/admin'}

<b>Quick Commands:</b>
• /admin_stats - System statistics
• /admin_users - User management
• /admin_contests - Contest management
• /admin_broadcast - Send broadcast message

<b>Your Permissions:</b>
${JSON.parse(admin.permissions || '[]').join(', ')}
            `;

            await ctx.reply(message, { parse_mode: 'HTML' });
        } catch (error) {
            console.error('Admin error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    async showCropSelection(ctx, patchNumber) {
        try {
            const telegramId = ctx.from.id;
            const farmStatus = await this.handlers.game.getFarmStatus(telegramId);
            
            if (farmStatus.available_crops.length === 0) {
                await ctx.reply('🚫 No seeds available! Buy seeds from the shop first.');
                return;
            }

            const keyboard = {
                inline_keyboard: farmStatus.available_crops.map(crop => [{
                    text: `${crop.emoji} ${crop.type} (${crop.seeds_available} seeds)`,
                    callback_data: `plant_${crop.type}_${patchNumber}`
                }])
            };

            await ctx.reply(`🌱 Select crop for Patch ${patchNumber}:`, { reply_markup: keyboard });
        } catch (error) {
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Broadcast message to all users (admin only)
    async broadcast(message, adminId) {
        try {
            const admin = await this.handlers.game.db.get(`
                SELECT * FROM admin_users WHERE telegram_id = ? AND is_active = TRUE
            `, [adminId]);

            if (!admin) {
                throw new Error('Unauthorized');
            }

            const users = await this.handlers.game.db.all(`
                SELECT telegram_id FROM users WHERE is_banned = FALSE
            `);

            let successCount = 0;
            let failCount = 0;

            for (const user of users) {
                try {
                    await this.bot.telegram.sendMessage(user.telegram_id, message, { parse_mode: 'HTML' });
                    successCount++;
                    
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    failCount++;
                    console.error(`Failed to send to ${user.telegram_id}:`, error.message);
                }
            }

            return { successCount, failCount, totalUsers: users.length };
        } catch (error) {
            console.error('Broadcast error:', error);
            throw error;
        }
    }

    // Start the bot
    launch() {
        console.log('🤖 Starting SBRFARM Telegram Bot...');
        
        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

        // Start bot
        if (process.env.NODE_ENV === 'production' && process.env.WEBHOOK_URL) {
            // Production with webhook
            const port = process.env.PORT || 3000;
            this.bot.telegram.setWebhook(`${process.env.WEBHOOK_URL}/webhook`);
            this.bot.startWebhook('/webhook', null, port);
            console.log(`🚀 Bot webhook started on port ${port}`);
        } else {
            // Development with polling
            this.bot.launch();
            console.log('🚀 Bot polling started');
        }

        console.log('✅ SBRFARM Bot is running!');
    }

    // Stop the bot
    stop() {
        console.log('🛑 Stopping SBRFARM Bot...');
        this.bot.stop();
        if (this.handlers.game.db) {
            this.handlers.game.db.close();
        }
        console.log('✅ Bot stopped');
    }

    // Get bot instance (for external use)
    getBot() {
        return this.bot;
    }
}

module.exports = SBRFarmBot;