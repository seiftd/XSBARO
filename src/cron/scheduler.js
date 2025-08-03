const cron = require('node-cron');
const DatabaseManager = require('../database/manager');
const moment = require('moment');
require('dotenv').config();

class CronScheduler {
    constructor() {
        this.db = new DatabaseManager();
        this.jobs = new Map();
        this.isRunning = false;
    }

    // Start all cron jobs
    start() {
        if (this.isRunning) {
            console.log('⚠️ Cron scheduler already running');
            return;
        }

        console.log('⏰ Starting SBRFARM Cron Scheduler...');

        // Crop growth monitoring - every minute
        this.scheduleJob('crop-monitor', '* * * * *', () => this.monitorCropGrowth());

        // VIP daily rewards - every day at 00:01
        this.scheduleJob('vip-rewards', '1 0 * * *', () => this.processVIPDailyRewards());

        // Daily contest creation - every day at 00:00
        this.scheduleJob('daily-contest', '0 0 * * *', () => this.createDailyContest());

        // Weekly contest creation - every Monday at 00:00
        this.scheduleJob('weekly-contest', '0 0 * * 1', () => this.createWeeklyContest());

        // Monthly contest creation - first day of month at 00:00
        this.scheduleJob('monthly-contest', '0 0 1 * *', () => this.createMonthlyContest());

        // Contest winner selection - every day at 23:30
        this.scheduleJob('contest-winners', '30 23 * * *', () => this.selectContestWinners());

        // Expire VIP subscriptions - every hour
        this.scheduleJob('vip-expiry', '0 * * * *', () => this.expireVIPSubscriptions());

        // Daily statistics update - every day at 23:59
        this.scheduleJob('daily-stats', '59 23 * * *', () => this.updateDailyStatistics());

        // Cleanup old data - every day at 02:00
        this.scheduleJob('cleanup', '0 2 * * *', () => this.cleanupOldData());

        // Database backup - every day at 03:00
        this.scheduleJob('backup', '0 3 * * *', () => this.createDatabaseBackup());

        this.isRunning = true;
        console.log('✅ All cron jobs scheduled successfully');
    }

    // Stop all cron jobs
    stop() {
        console.log('🛑 Stopping cron scheduler...');
        
        this.jobs.forEach((job, name) => {
            job.destroy();
            console.log(`❌ Stopped job: ${name}`);
        });
        
        this.jobs.clear();
        this.isRunning = false;
        console.log('✅ Cron scheduler stopped');
    }

    // Schedule a job
    scheduleJob(name, schedule, task) {
        if (this.jobs.has(name)) {
            console.log(`⚠️ Job ${name} already exists, skipping`);
            return;
        }

        const job = cron.schedule(schedule, async () => {
            try {
                console.log(`⏰ Running job: ${name}`);
                await task();
                console.log(`✅ Completed job: ${name}`);
            } catch (error) {
                console.error(`❌ Job ${name} failed:`, error);
            }
        }, {
            scheduled: false,
            timezone: 'UTC'
        });

        job.start();
        this.jobs.set(name, job);
        console.log(`📅 Scheduled job: ${name} (${schedule})`);
    }

    // Monitor crop growth and update ready status
    async monitorCropGrowth() {
        try {
            const readyCrops = await this.db.checkReadyCrops();
            
            if (readyCrops.length > 0) {
                await this.db.markCropsReady(readyCrops);
                console.log(`🌾 Marked ${readyCrops.length} crops as ready for harvest`);
            }
        } catch (error) {
            console.error('❌ Crop monitoring error:', error);
        }
    }

    // Process VIP daily rewards for all active VIP users
    async processVIPDailyRewards() {
        try {
            const vipUsers = await this.db.all(`
                SELECT vs.telegram_id, vs.tier 
                FROM vip_subscriptions vs 
                WHERE vs.is_active = TRUE AND vs.end_date > CURRENT_TIMESTAMP
            `);

            let processedCount = 0;

            for (const vipUser of vipUsers) {
                try {
                    const today = moment().format('YYYY-MM-DD');
                    const existingReward = await this.db.get(`
                        SELECT * FROM vip_rewards 
                        WHERE telegram_id = ? AND reward_date = ?
                    `, [vipUser.telegram_id, today]);

                    if (!existingReward) {
                        await this.processVIPUserReward(vipUser.telegram_id, vipUser.tier);
                        processedCount++;
                    }
                } catch (error) {
                    console.error(`❌ VIP reward error for user ${vipUser.telegram_id}:`, error);
                }
            }

            console.log(`🌟 Processed VIP rewards for ${processedCount} users`);
        } catch (error) {
            console.error('❌ VIP daily rewards error:', error);
        }
    }

    // Process individual VIP user reward
    async processVIPUserReward(telegramId, tier) {
        const benefits = {
            1: { daily_potatoes: 2 },
            2: { daily_potatoes: 2, daily_water: 10, daily_parts: 5 },
            3: { daily_potatoes: 2, daily_water: 20 },
            4: { daily_potatoes: 2, daily_onions: 2 }
        };

        const userBenefits = benefits[tier];
        if (!userBenefits) return;

        const user = await this.db.getUserWithResources(telegramId);
        if (!user) return;

        const updates = {};
        const rewards = {};

        // Add potato seeds
        if (userBenefits.daily_potatoes) {
            updates.potato_seeds = user.potato_seeds + userBenefits.daily_potatoes;
            rewards.potato_seeds = userBenefits.daily_potatoes;
        }

        // Add water drops
        if (userBenefits.daily_water) {
            updates.water_drops = Math.min(user.water_drops + userBenefits.daily_water, 100);
            rewards.water_drops = userBenefits.daily_water;
        }

        // Add onion seeds (Tier 4)
        if (userBenefits.daily_onions) {
            updates.onion_seeds = user.onion_seeds + userBenefits.daily_onions;
            rewards.onion_seeds = userBenefits.daily_onions;
        }

        // Apply updates
        if (Object.keys(updates).length > 0) {
            await this.db.updateUserResources(telegramId, updates);
        }

        // Add patch parts
        if (userBenefits.daily_parts) {
            await this.db.run(`
                UPDATE patch_parts SET parts_owned = parts_owned + ? WHERE telegram_id = ?
            `, [userBenefits.daily_parts, telegramId]);
            rewards.patch_parts = userBenefits.daily_parts;
        }

        // Record the reward
        await this.db.run(`
            INSERT INTO vip_rewards (telegram_id, tier, rewards_claimed) VALUES (?, ?, ?)
        `, [telegramId, tier, JSON.stringify(rewards)]);
    }

    // Create daily contest
    async createDailyContest() {
        try {
            const startDate = moment().utc().startOf('day');
            const endDate = moment().utc().set({ hour: 23, minute: 30, second: 0 });

            const prizePool = JSON.stringify({
                first: { sbr_coins: 1000, water_drops: 50 },
                second: { sbr_coins: 500, water_drops: 25 },
                third: { sbr_coins: 250, water_drops: 10 }
            });

            await this.db.run(`
                INSERT INTO contests (type, start_date, end_date, entry_cost, ads_required, prize_pool, max_participants)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['daily', startDate.toISOString(), endDate.toISOString(), 20, 5, prizePool, 1000]);

            console.log('🏆 Created daily contest');
        } catch (error) {
            console.error('❌ Daily contest creation error:', error);
        }
    }

    // Create weekly contest
    async createWeeklyContest() {
        try {
            const startDate = moment().utc().startOf('week');
            const endDate = moment().utc().endOf('week').set({ hour: 23, minute: 30, second: 0 });

            const prizePool = JSON.stringify({
                first: { sbr_coins: 5000, water_drops: 100, boosters: 5 },
                second: { sbr_coins: 3000, water_drops: 75, boosters: 3 },
                third: { sbr_coins: 2000, water_drops: 50, boosters: 2 },
                participation: { sbr_coins: 100, water_drops: 10 }
            });

            await this.db.run(`
                INSERT INTO contests (type, start_date, end_date, entry_cost, ads_required, prize_pool, max_participants)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['weekly', startDate.toISOString(), endDate.toISOString(), 100, 30, prizePool, 5000]);

            console.log('🏆 Created weekly contest');
        } catch (error) {
            console.error('❌ Weekly contest creation error:', error);
        }
    }

    // Create monthly contest
    async createMonthlyContest() {
        try {
            const startDate = moment().utc().startOf('month');
            const endDate = moment().utc().endOf('month').set({ hour: 23, minute: 30, second: 0 });

            const prizePool = JSON.stringify({
                first: { vip_tier: 1, duration_days: 30 },
                second: { vip_tier: 1, duration_days: 30 },
                third: { vip_tier: 1, duration_days: 30 },
                participation: { sbr_coins: 500, water_drops: 50 }
            });

            await this.db.run(`
                INSERT INTO contests (type, start_date, end_date, entry_cost, ads_required, prize_pool, max_participants)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, ['monthly', startDate.toISOString(), endDate.toISOString(), 200, 100, prizePool, 10000]);

            console.log('🏆 Created monthly contest');
        } catch (error) {
            console.error('❌ Monthly contest creation error:', error);
        }
    }

    // Select contest winners
    async selectContestWinners() {
        try {
            const endingContests = await this.db.all(`
                SELECT * FROM contests 
                WHERE status = 'active' AND end_date <= CURRENT_TIMESTAMP
            `);

            for (const contest of endingContests) {
                await this.processContestWinners(contest);
            }

            console.log(`🏆 Processed ${endingContests.length} ending contests`);
        } catch (error) {
            console.error('❌ Contest winner selection error:', error);
        }
    }

    // Process winners for a specific contest
    async processContestWinners(contest) {
        try {
            // Get qualified participants
            const participants = await this.db.all(`
                SELECT cp.telegram_id, cp.ads_watched, u.username 
                FROM contest_participants cp
                JOIN users u ON cp.telegram_id = u.telegram_id
                WHERE cp.contest_id = ? AND cp.ads_watched >= ?
                ORDER BY RANDOM()
            `, [contest.id, contest.ads_required]);

            if (participants.length === 0) {
                await this.db.run(`
                    UPDATE contests SET status = 'ended', winners = '[]' WHERE id = ?
                `, [contest.id]);
                return;
            }

            const prizePool = JSON.parse(contest.prize_pool);
            const winners = [];

            // Select top 3 winners
            const topWinners = participants.slice(0, 3);
            const positions = ['first', 'second', 'third'];

            for (let i = 0; i < topWinners.length; i++) {
                const winner = topWinners[i];
                const position = positions[i];
                const prize = prizePool[position];

                if (prize) {
                    await this.awardPrize(winner.telegram_id, prize, contest.type, position);
                    winners.push({
                        telegram_id: winner.telegram_id,
                        username: winner.username,
                        position: i + 1,
                        prize
                    });
                }
            }

            // Award participation prizes
            if (prizePool.participation) {
                for (const participant of participants) {
                    if (!winners.find(w => w.telegram_id === participant.telegram_id)) {
                        await this.awardPrize(participant.telegram_id, prizePool.participation, contest.type, 'participation');
                    }
                }
            }

            // Update contest status
            await this.db.run(`
                UPDATE contests SET status = 'ended', winners = ? WHERE id = ?
            `, [JSON.stringify(winners), contest.id]);

            console.log(`🎉 Contest ${contest.type} ended with ${winners.length} winners`);
        } catch (error) {
            console.error(`❌ Contest ${contest.id} winner processing error:`, error);
        }
    }

    // Award prize to user
    async awardPrize(telegramId, prize, contestType, position) {
        try {
            const user = await this.db.getUserWithResources(telegramId);
            if (!user) return;

            // Award SBR coins
            if (prize.sbr_coins) {
                await this.db.updateUserResources(telegramId, {
                    sbr_coins: user.sbr_coins + prize.sbr_coins
                });
            }

            // Award water drops
            if (prize.water_drops) {
                await this.db.updateUserResources(telegramId, {
                    water_drops: Math.min(user.water_drops + prize.water_drops, 100)
                });
            }

            // Award boosters
            if (prize.boosters) {
                await this.db.updateUserResources(telegramId, {
                    boosters: Math.min(user.boosters + prize.boosters, 10)
                });
            }

            // Award VIP subscription
            if (prize.vip_tier && prize.duration_days) {
                await this.db.createVIPSubscription(telegramId, prize.vip_tier, prize.duration_days, {
                    method: 'contest_prize',
                    transaction_id: `contest_${contestType}_${Date.now()}`
                });
            }

            // Update game stats
            if (position !== 'participation') {
                await this.db.run(`
                    UPDATE game_stats SET contests_won = contests_won + 1 WHERE telegram_id = ?
                `, [telegramId]);
            }

            console.log(`🏆 Awarded ${position} prize to user ${telegramId}`);
        } catch (error) {
            console.error(`❌ Prize award error for user ${telegramId}:`, error);
        }
    }

    // Expire VIP subscriptions
    async expireVIPSubscriptions() {
        try {
            const result = await this.db.run(`
                UPDATE vip_subscriptions 
                SET is_active = FALSE 
                WHERE is_active = TRUE AND end_date <= CURRENT_TIMESTAMP
            `);

            if (result.changes > 0) {
                console.log(`🌟 Expired ${result.changes} VIP subscriptions`);
            }
        } catch (error) {
            console.error('❌ VIP expiry error:', error);
        }
    }

    // Update daily statistics
    async updateDailyStatistics() {
        try {
            // Reset daily ad counts
            await this.db.run(`
                UPDATE user_resources SET ads_watched_today = 0
            `);

            // Log daily stats (could be enhanced with more metrics)
            const userStats = await this.db.getUserStats();
            const gameStats = await this.db.getGameStats();

            console.log('📊 Daily statistics updated:', {
                total_users: userStats.total_users,
                new_today: userStats.new_today,
                active_today: userStats.active_today,
                total_crops_harvested: gameStats.total_crops_harvested
            });
        } catch (error) {
            console.error('❌ Daily statistics error:', error);
        }
    }

    // Cleanup old data
    async cleanupOldData() {
        try {
            // Delete old VIP reward records (older than 30 days)
            const thirtyDaysAgo = moment().subtract(30, 'days').format('YYYY-MM-DD');
            
            const rewardCleanup = await this.db.run(`
                DELETE FROM vip_rewards WHERE reward_date < ?
            `, [thirtyDaysAgo]);

            // Delete old ended contests (older than 30 days)
            const contestCleanup = await this.db.run(`
                DELETE FROM contests WHERE status = 'ended' AND end_date < datetime('now', '-30 days')
            `);

            console.log(`🧹 Cleaned up ${rewardCleanup.changes} old VIP rewards and ${contestCleanup.changes} old contests`);
        } catch (error) {
            console.error('❌ Cleanup error:', error);
        }
    }

    // Create database backup
    async createDatabaseBackup() {
        try {
            const DatabaseInitializer = require('../database/init');
            const dbInit = new DatabaseInitializer();
            await dbInit.backup();
            console.log('💾 Database backup completed');
        } catch (error) {
            console.error('❌ Backup error:', error);
        }
    }

    // Get job status
    getJobStatus() {
        const status = {};
        this.jobs.forEach((job, name) => {
            status[name] = {
                running: job.running,
                scheduled: job.scheduled
            };
        });
        return status;
    }
}

// CLI execution
if (require.main === module) {
    const scheduler = new CronScheduler();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            scheduler.start();
            console.log('Press Ctrl+C to stop the scheduler');
            break;
            
        case 'crop-check':
            scheduler.monitorCropGrowth()
                .then(() => {
                    console.log('✅ Crop check completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Crop check failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'vip-rewards':
            scheduler.processVIPDailyRewards()
                .then(() => {
                    console.log('✅ VIP rewards processed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ VIP rewards failed:', error);
                    process.exit(1);
                });
            break;
            
        default:
            console.log(`
⏰ SBRFARM Cron Scheduler

Usage: node src/cron/scheduler.js [command]

Commands:
  start       - Start all scheduled jobs
  crop-check  - Run crop growth check once
  vip-rewards - Process VIP rewards once

Examples:
  node src/cron/scheduler.js start
  node src/cron/scheduler.js crop-check
            `);
            process.exit(0);
    }
}

module.exports = CronScheduler;