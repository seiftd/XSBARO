const DatabaseManager = require('../database/manager');
const moment = require('moment');

class GameEngine {
    constructor() {
        this.db = new DatabaseManager();
        this.cropTypes = {
            potato: { emoji: '🥔', growth_hours: 24, water_needed: 10, selling_price: 100, max_boost: 12 },
            tomato: { emoji: '🍅', growth_hours: 48, water_needed: 20, selling_price: 150, max_boost: 24 },
            onion: { emoji: '🧅', growth_hours: 96, water_needed: 50, selling_price: 250, max_boost: 48 },
            carrot: { emoji: '🥕', growth_hours: 144, water_needed: 100, selling_price: 1300, max_boost: 72 }
        };
        
        this.vipBenefits = {
            1: { patches: 1, daily_potatoes: 2, daily_water: 0, daily_parts: 0 },
            2: { patches: 1, daily_potatoes: 2, daily_water: 10, daily_parts: 5, tomato_days: 2 },
            3: { patches: 2, daily_potatoes: 2, daily_water: 20, daily_parts: 0, onion_days: 2 },
            4: { patches: 3, daily_potatoes: 2, daily_water: 0, daily_parts: 0, daily_onions: 2, carrot_days: 3 }
        };
    }

    // User Management
    async initializeUser(telegramId, userData = {}) {
        try {
            // Check if user already exists
            let user = await this.db.getUser(telegramId);
            if (user) {
                await this.db.updateUserActivity(telegramId);
                return user;
            }

            // Create new user
            user = await this.db.createUser(telegramId, userData);
            
            // Process referral if provided
            if (userData.referral_code) {
                await this.processReferral(userData.referral_code, telegramId);
            }

            return user;
        } catch (error) {
            console.error(`❌ Failed to initialize user ${telegramId}:`, error);
            throw error;
        }
    }

    async getUserProfile(telegramId) {
        try {
            const user = await this.db.getUserWithResources(telegramId);
            if (!user) {
                throw new Error('User not found');
            }

            const patches = await this.db.getUserPatches(telegramId);
            const vipSubscription = await this.db.getActiveVIPSubscription(telegramId);
            
            return {
                ...user,
                patches,
                vip: vipSubscription,
                is_vip: !!vipSubscription
            };
        } catch (error) {
            console.error(`❌ Failed to get user profile ${telegramId}:`, error);
            throw error;
        }
    }

    // Farm Management
    async getFarmStatus(telegramId) {
        try {
            const user = await this.getUserProfile(telegramId);
            const patches = user.patches.map(patch => {
                if (patch.crop_type) {
                    const cropData = this.cropTypes[patch.crop_type];
                    const timeRemaining = this.getTimeRemaining(patch.harvest_time);
                    
                    return {
                        ...patch,
                        crop_emoji: cropData.emoji,
                        time_remaining: timeRemaining,
                        is_ready: patch.is_ready || timeRemaining <= 0,
                        progress_percent: this.getGrowthProgress(patch.plant_time, patch.harvest_time)
                    };
                }
                return { ...patch, crop_emoji: '🌱', is_empty: true };
            });

            return {
                user_info: {
                    name: user.first_name || user.username || 'Farmer',
                    water_drops: user.water_drops,
                    heavy_water: user.heavy_water_drops,
                    boosters: user.boosters,
                    sbr_coins: user.sbr_coins,
                    total_patches: user.total_patches_unlocked,
                    is_vip: user.is_vip,
                    vip_tier: user.vip?.tier
                },
                patches,
                available_crops: this.getAvailableCrops(user),
                can_expand: user.total_patches_unlocked < 8 && user.parts_owned >= 10
            };
        } catch (error) {
            console.error(`❌ Failed to get farm status ${telegramId}:`, error);
            throw error;
        }
    }

    async plantCrop(telegramId, patchNumber, cropType) {
        try {
            // Validate crop type
            if (!this.cropTypes[cropType]) {
                throw new Error('Invalid crop type');
            }

            const user = await this.getUserProfile(telegramId);
            const patch = user.patches.find(p => p.patch_number === patchNumber);
            
            if (!patch) {
                throw new Error('Patch not found');
            }

            if (!patch.is_unlocked) {
                throw new Error('Patch is locked');
            }

            if (patch.crop_type) {
                throw new Error('Patch already has a crop');
            }

            // Check if user has seeds
            const seedField = `${cropType}_seeds`;
            if (user[seedField] <= 0) {
                throw new Error(`No ${cropType} seeds available`);
            }

            // Check water requirement
            const waterNeeded = this.cropTypes[cropType].water_needed;
            if (cropType === 'carrot') {
                // Carrot needs heavy water
                if (user.heavy_water_drops <= 0) {
                    throw new Error('Need heavy water for carrots');
                }
            } else {
                if (user.water_drops < waterNeeded) {
                    throw new Error(`Need ${waterNeeded} water drops to plant ${cropType}`);
                }
            }

            // Plant the crop
            await this.db.plantCrop(telegramId, patchNumber, cropType);

            // Deduct resources
            if (cropType === 'carrot') {
                await this.db.updateUserResources(telegramId, {
                    heavy_water_drops: user.heavy_water_drops - 1,
                    carrot_seeds: user.carrot_seeds - 1
                });
            } else {
                await this.db.updateUserResources(telegramId, {
                    water_drops: user.water_drops - waterNeeded,
                    [seedField]: user[seedField] - 1
                });
            }

            // Update stats
            await this.db.run(`
                UPDATE game_stats 
                SET crops_planted = crops_planted + 1, total_water_used = total_water_used + ?
                WHERE telegram_id = ?
            `, [waterNeeded, telegramId]);

            return {
                success: true,
                message: `${this.cropTypes[cropType].emoji} ${cropType} planted successfully!`,
                harvest_time: moment().add(this.cropTypes[cropType].growth_hours, 'hours').format('YYYY-MM-DD HH:mm:ss')
            };
        } catch (error) {
            console.error(`❌ Failed to plant crop ${telegramId}:`, error);
            throw error;
        }
    }

    async harvestCrop(telegramId, patchNumber) {
        try {
            const earnings = await this.db.harvestCrop(telegramId, patchNumber);
            
            return {
                success: true,
                message: `Crop harvested! Earned ${earnings} SBRcoins`,
                earnings
            };
        } catch (error) {
            console.error(`❌ Failed to harvest crop ${telegramId}:`, error);
            throw error;
        }
    }

    async useBooster(telegramId, patchNumber) {
        try {
            const user = await this.getUserProfile(telegramId);
            
            if (user.boosters <= 0) {
                throw new Error('No boosters available');
            }

            const newHarvestTime = await this.db.useBooster(telegramId, patchNumber);
            
            // Update stats
            await this.db.run(`
                UPDATE game_stats SET total_boosters_used = total_boosters_used + 1 WHERE telegram_id = ?
            `, [telegramId]);

            return {
                success: true,
                message: '⚡ Booster used! Crop growth accelerated by 2 hours',
                new_harvest_time: moment(newHarvestTime).format('YYYY-MM-DD HH:mm:ss')
            };
        } catch (error) {
            console.error(`❌ Failed to use booster ${telegramId}:`, error);
            throw error;
        }
    }

    // Water Management
    async claimDailyWater(telegramId) {
        try {
            const waterEarned = await this.db.claimDailyReward(telegramId);
            
            return {
                success: true,
                message: `💧 Daily reward claimed! Earned ${waterEarned} water drops`,
                water_earned: waterEarned
            };
        } catch (error) {
            console.error(`❌ Failed to claim daily water ${telegramId}:`, error);
            throw error;
        }
    }

    async watchAd(telegramId) {
        try {
            const waterEarned = await this.db.watchAd(telegramId);
            
            return {
                success: true,
                message: '📺 Ad watched! Earned 1 water drop',
                water_earned: waterEarned
            };
        } catch (error) {
            console.error(`❌ Failed to watch ad ${telegramId}:`, error);
            throw error;
        }
    }

    async convertToHeavyWater(telegramId, amount = 1) {
        try {
            const user = await this.getUserProfile(telegramId);
            const waterNeeded = amount * 100;
            
            if (user.water_drops < waterNeeded) {
                throw new Error(`Need ${waterNeeded} water drops to create ${amount} heavy water`);
            }

            if (user.heavy_water_drops + amount > 5) {
                throw new Error('Heavy water storage is full (max 5)');
            }

            await this.db.updateUserResources(telegramId, {
                water_drops: user.water_drops - waterNeeded,
                heavy_water_drops: user.heavy_water_drops + amount
            });

            return {
                success: true,
                message: `💧➡️💧 Converted ${waterNeeded} water drops to ${amount} heavy water`,
                heavy_water_created: amount
            };
        } catch (error) {
            console.error(`❌ Failed to convert heavy water ${telegramId}:`, error);
            throw error;
        }
    }

    // Patch Expansion
    async expandFarm(telegramId) {
        try {
            const user = await this.getUserProfile(telegramId);
            
            if (user.parts_owned < 10) {
                throw new Error(`Need 10 patch parts. You have ${user.parts_owned}`);
            }

            if (user.total_patches_unlocked >= 8) {
                throw new Error('Maximum patches reached');
            }

            const newPatchNumber = user.total_patches_unlocked + 1;
            
            // Create new patch
            await this.db.run(`
                INSERT INTO patches (telegram_id, patch_number, is_unlocked) VALUES (?, ?, ?)
            `, [telegramId, newPatchNumber, true]);

            // Update patch parts and total
            await this.db.run(`
                UPDATE patch_parts 
                SET parts_owned = parts_owned - 10, total_patches_unlocked = total_patches_unlocked + 1
                WHERE telegram_id = ?
            `, [telegramId]);

            return {
                success: true,
                message: `🎉 Farm expanded! New patch #${newPatchNumber} unlocked`,
                new_patch_number: newPatchNumber
            };
        } catch (error) {
            console.error(`❌ Failed to expand farm ${telegramId}:`, error);
            throw error;
        }
    }

    // Shop Management
    async buySeeds(telegramId, cropType, quantity = 1) {
        try {
            const cropData = await this.db.getCropType(cropType);
            if (!cropData) {
                throw new Error('Invalid crop type');
            }

            const user = await this.getUserProfile(telegramId);
            const totalCost = cropData.seed_price_sbr ? 
                cropData.seed_price_sbr * quantity : 
                cropData.seed_price_usdt * quantity;

            if (cropData.seed_price_sbr) {
                // Pay with SBRcoins
                if (user.sbr_coins < totalCost) {
                    throw new Error(`Not enough SBRcoins. Need ${totalCost}, have ${user.sbr_coins}`);
                }

                await this.db.updateUserResources(telegramId, {
                    sbr_coins: user.sbr_coins - totalCost,
                    [`${cropType}_seeds`]: user[`${cropType}_seeds`] + quantity
                });
            } else {
                // Pay with USDT (requires payment processing)
                throw new Error('USDT payments not implemented in this demo');
            }

            return {
                success: true,
                message: `🛒 Purchased ${quantity}x ${cropData.emoji} ${cropType} seeds for ${totalCost} ${cropData.seed_price_sbr ? 'SBRcoins' : 'USDT'}`,
                cost: totalCost,
                currency: cropData.seed_price_sbr ? 'SBRcoins' : 'USDT'
            };
        } catch (error) {
            console.error(`❌ Failed to buy seeds ${telegramId}:`, error);
            throw error;
        }
    }

    async buyPatchParts(telegramId, quantity = 1) {
        try {
            const user = await this.getUserProfile(telegramId);
            const costPerPart = 100; // SBRcoins
            const totalCost = costPerPart * quantity;

            if (user.sbr_coins < totalCost) {
                throw new Error(`Not enough SBRcoins. Need ${totalCost}, have ${user.sbr_coins}`);
            }

            await this.db.updateUserResources(telegramId, {
                sbr_coins: user.sbr_coins - totalCost
            });

            await this.db.run(`
                UPDATE patch_parts SET parts_owned = parts_owned + ? WHERE telegram_id = ?
            `, [quantity, telegramId]);

            return {
                success: true,
                message: `🧩 Purchased ${quantity}x patch parts for ${totalCost} SBRcoins`,
                cost: totalCost,
                parts_owned: user.parts_owned + quantity
            };
        } catch (error) {
            console.error(`❌ Failed to buy patch parts ${telegramId}:`, error);
            throw error;
        }
    }

    // VIP System
    async getVIPInfo(telegramId) {
        try {
            const vipSubscription = await this.db.getActiveVIPSubscription(telegramId);
            
            if (!vipSubscription) {
                return {
                    is_vip: false,
                    available_tiers: [
                        { tier: 1, price: 7, benefits: 'Extra patch + 2 daily potatoes' },
                        { tier: 2, price: 15, benefits: 'Extra patch + daily rewards + tomato every 2 days' },
                        { tier: 3, price: 30, benefits: '2 extra patches + enhanced rewards + onion every 2 days' },
                        { tier: 4, price: 99, benefits: '3 extra patches + premium rewards + carrot every 3 days' }
                    ]
                };
            }

            const benefits = this.vipBenefits[vipSubscription.tier];
            const timeRemaining = moment(vipSubscription.end_date).diff(moment(), 'days');

            return {
                is_vip: true,
                current_tier: vipSubscription.tier,
                days_remaining: timeRemaining,
                benefits,
                can_claim_daily: await this.canClaimVIPDailyReward(telegramId)
            };
        } catch (error) {
            console.error(`❌ Failed to get VIP info ${telegramId}:`, error);
            throw error;
        }
    }

    async claimVIPDailyReward(telegramId) {
        try {
            const vipSubscription = await this.db.getActiveVIPSubscription(telegramId);
            if (!vipSubscription) {
                throw new Error('No active VIP subscription');
            }

            const today = moment().format('YYYY-MM-DD');
            const existingReward = await this.db.get(`
                SELECT * FROM vip_rewards WHERE telegram_id = ? AND reward_date = ?
            `, [telegramId, today]);

            if (existingReward) {
                throw new Error('VIP daily reward already claimed today');
            }

            const benefits = this.vipBenefits[vipSubscription.tier];
            const rewards = {};

            // Daily potatoes
            if (benefits.daily_potatoes) {
                rewards.potato_seeds = benefits.daily_potatoes;
            }

            // Daily water
            if (benefits.daily_water) {
                rewards.water_drops = benefits.daily_water;
            }

            // Daily patch parts
            if (benefits.daily_parts) {
                rewards.patch_parts = benefits.daily_parts;
            }

            // Special crop rewards (tomato every 2 days, etc.)
            const daysSinceStart = moment().diff(moment(vipSubscription.start_date), 'days');
            
            if (benefits.tomato_days && daysSinceStart % benefits.tomato_days === 0) {
                rewards.tomato_seeds = 1;
            }

            if (benefits.onion_days && daysSinceStart % benefits.onion_days === 0) {
                rewards.onion_seeds = 1;
            }

            if (benefits.carrot_days && daysSinceStart % benefits.carrot_days === 0) {
                rewards.carrot_seeds = 1;
            }

            if (benefits.daily_onions) {
                rewards.onion_seeds = benefits.daily_onions;
            }

            // Apply rewards
            const user = await this.getUserProfile(telegramId);
            const updateData = {};

            if (rewards.potato_seeds) updateData.potato_seeds = user.potato_seeds + rewards.potato_seeds;
            if (rewards.tomato_seeds) updateData.tomato_seeds = user.tomato_seeds + rewards.tomato_seeds;
            if (rewards.onion_seeds) updateData.onion_seeds = user.onion_seeds + rewards.onion_seeds;
            if (rewards.carrot_seeds) updateData.carrot_seeds = user.carrot_seeds + rewards.carrot_seeds;
            if (rewards.water_drops) updateData.water_drops = Math.min(user.water_drops + rewards.water_drops, 100);

            if (Object.keys(updateData).length > 0) {
                await this.db.updateUserResources(telegramId, updateData);
            }

            if (rewards.patch_parts) {
                await this.db.run(`
                    UPDATE patch_parts SET parts_owned = parts_owned + ? WHERE telegram_id = ?
                `, [rewards.patch_parts, telegramId]);
            }

            // Record the reward claim
            await this.db.run(`
                INSERT INTO vip_rewards (telegram_id, tier, rewards_claimed) VALUES (?, ?, ?)
            `, [telegramId, vipSubscription.tier, JSON.stringify(rewards)]);

            return {
                success: true,
                message: '🌟 VIP daily rewards claimed!',
                rewards
            };
        } catch (error) {
            console.error(`❌ Failed to claim VIP reward ${telegramId}:`, error);
            throw error;
        }
    }

    // Contest System
    async getActiveContests(telegramId) {
        try {
            const contests = await this.db.getActiveContests();
            const userParticipations = await Promise.all(
                contests.map(contest => 
                    this.db.getContestParticipation(telegramId, contest.id)
                )
            );

            return contests.map((contest, index) => ({
                ...contest,
                user_participation: userParticipations[index],
                time_remaining: moment(contest.end_date).diff(moment(), 'hours')
            }));
        } catch (error) {
            console.error(`❌ Failed to get contests ${telegramId}:`, error);
            throw error;
        }
    }

    // Referral System
    async processReferral(referralCode, newUserId) {
        try {
            const referrerId = await this.db.processReferral(referralCode, newUserId);
            return referrerId;
        } catch (error) {
            console.error(`❌ Failed to process referral:`, error);
            throw error;
        }
    }

    async getReferralInfo(telegramId) {
        try {
            const user = await this.db.getUser(telegramId);
            const referrals = await this.db.all(`
                SELECT COUNT(*) as count FROM referrals WHERE referrer_id = ?
            `, [telegramId]);

            return {
                referral_code: user.referral_code,
                total_referrals: user.total_referrals,
                referral_link: `https://t.me/sbrfarm_bot?start=ref_${user.referral_code}`
            };
        } catch (error) {
            console.error(`❌ Failed to get referral info ${telegramId}:`, error);
            throw error;
        }
    }

    // Utility Methods
    getTimeRemaining(harvestTime) {
        if (!harvestTime) return 0;
        const now = moment();
        const harvest = moment(harvestTime);
        return Math.max(0, harvest.diff(now, 'seconds'));
    }

    getGrowthProgress(plantTime, harvestTime) {
        if (!plantTime || !harvestTime) return 0;
        
        const plant = moment(plantTime);
        const harvest = moment(harvestTime);
        const now = moment();
        
        const totalDuration = harvest.diff(plant);
        const elapsed = now.diff(plant);
        
        return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    }

    getAvailableCrops(user) {
        return Object.keys(this.cropTypes).filter(crop => {
            const seedField = `${crop}_seeds`;
            return user[seedField] > 0;
        }).map(crop => ({
            type: crop,
            emoji: this.cropTypes[crop].emoji,
            seeds_available: user[`${crop}_seeds`],
            water_needed: this.cropTypes[crop].water_needed,
            growth_time: this.cropTypes[crop].growth_hours,
            selling_price: this.cropTypes[crop].selling_price
        }));
    }

    async canClaimVIPDailyReward(telegramId) {
        const today = moment().format('YYYY-MM-DD');
        const existingReward = await this.db.get(`
            SELECT * FROM vip_rewards WHERE telegram_id = ? AND reward_date = ?
        `, [telegramId, today]);

        return !existingReward;
    }

    // Currency conversion
    convertSBRtoUSDT(sbrAmount) {
        const rate = 200; // 200 SBR = 1 USDT
        return sbrAmount / rate;
    }

    convertUSDTtoTON(usdtAmount) {
        const rate = 3.5; // 1 TON = 3.5 USDT
        return usdtAmount / rate;
    }

    // Game validation
    async validateUser(telegramId) {
        const user = await this.db.getUser(telegramId);
        if (!user) {
            throw new Error('User not found. Please start the game first.');
        }
        if (user.is_banned) {
            throw new Error(`Account banned: ${user.ban_reason || 'Violation of terms'}`);
        }
        return user;
    }
}

module.exports = GameEngine;