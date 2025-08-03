const GameEngine = require('../game/engine');
const moment = require('moment');

class BotHandlers {
    constructor() {
        this.game = new GameEngine();
    }

    // Command: /start
    async handleStart(ctx) {
        try {
            const telegramId = ctx.from.id;
            const userData = {
                username: ctx.from.username,
                first_name: ctx.from.first_name,
                last_name: ctx.from.last_name,
                language_code: ctx.from.language_code
            };

            // Check for referral code
            const startPayload = ctx.message.text.split(' ')[1];
            if (startPayload && startPayload.startsWith('ref_')) {
                userData.referral_code = startPayload.replace('ref_', '');
            }

            const user = await this.game.initializeUser(telegramId, userData);
            
            const welcomeMessage = `
🌾 Welcome to SBRFARM! 🌾

👋 Hello ${userData.first_name || 'Farmer'}!

You've just started your farming journey with:
🥔 1 Potato seed
💧 10 Water drops
🏡 3 Farm patches

🎯 Your Mission:
• Plant and harvest crops
• Expand your farm
• Earn SBRcoins
• Compete in contests
• Become a VIP farmer!

🌱 Ready to start farming? Use the menu below or type /help for commands.
            `;

            const keyboard = this.getMainKeyboard();
            await ctx.reply(welcomeMessage, { reply_markup: keyboard });

            // Send referral bonus message if applicable
            if (userData.referral_code) {
                await ctx.reply('🎁 Referral bonus: +5 water drops for your referrer!');
            }
        } catch (error) {
            console.error('Start command error:', error);
            await ctx.reply('❌ Welcome failed. Please try again later.');
        }
    }

    // Command: /farm
    async handleFarm(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const farmStatus = await this.game.getFarmStatus(telegramId);
            const message = this.formatFarmStatus(farmStatus);
            const keyboard = this.getFarmKeyboard();
            
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Farm command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /plant
    async handlePlant(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const farmStatus = await this.game.getFarmStatus(telegramId);
            const availablePatches = farmStatus.patches.filter(p => p.is_empty);
            
            if (availablePatches.length === 0) {
                await ctx.reply('🚫 No empty patches available! Harvest ready crops or expand your farm.');
                return;
            }

            if (farmStatus.available_crops.length === 0) {
                await ctx.reply('🚫 No seeds available! Buy seeds from the shop first.');
                return;
            }

            const message = '🌱 Select a crop to plant:';
            const keyboard = this.getPlantKeyboard(farmStatus.available_crops);
            
            await ctx.reply(message, { reply_markup: keyboard });
        } catch (error) {
            console.error('Plant command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /harvest
    async handleHarvest(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const farmStatus = await this.game.getFarmStatus(telegramId);
            const readyPatches = farmStatus.patches.filter(p => p.is_ready && !p.is_empty);
            
            if (readyPatches.length === 0) {
                await ctx.reply('🚫 No crops ready for harvest!');
                return;
            }

            let totalEarnings = 0;
            let harvestedCount = 0;

            for (const patch of readyPatches) {
                try {
                    const result = await this.game.harvestCrop(telegramId, patch.patch_number);
                    totalEarnings += result.earnings;
                    harvestedCount++;
                } catch (error) {
                    console.error(`Harvest error for patch ${patch.patch_number}:`, error);
                }
            }

            if (harvestedCount > 0) {
                await ctx.reply(`🎉 Harvested ${harvestedCount} crops! Earned ${totalEarnings} SBRcoins 💰`);
            } else {
                await ctx.reply('❌ Failed to harvest crops. Please try again.');
            }
        } catch (error) {
            console.error('Harvest command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /water
    async handleWater(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const user = await this.game.getUserProfile(telegramId);
            const message = `
💧 <b>Water Management</b>

<b>Your Water:</b>
💧 Regular: ${user.water_drops}/100
💧 Heavy: ${user.heavy_water_drops}/5

<b>Water Sources:</b>
• Daily Check-in: 10 drops
• Watch Ads: 1 drop per ad
• Join Channel: 5 drops (one-time)
• Referrals: 1-10 drops

<b>Heavy Water:</b>
• Convert 100 regular drops → 1 heavy drop
• Required for carrot farming
            `;

            const keyboard = this.getWaterKeyboard(user);
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Water command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /daily
    async handleDaily(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const result = await this.game.claimDailyWater(telegramId);
            await ctx.reply(result.message);
        } catch (error) {
            console.error('Daily command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /ad
    async handleWatchAd(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            // Simulate ad watching (in real implementation, integrate with ad network)
            await ctx.reply('📺 Watching ad... Please wait 30 seconds...');
            
            setTimeout(async () => {
                try {
                    const result = await this.game.watchAd(telegramId);
                    await ctx.reply(result.message);
                } catch (error) {
                    await ctx.reply(`❌ ${error.message}`);
                }
            }, 3000); // Simulated 3 second ad
        } catch (error) {
            console.error('Watch ad error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /shop
    async handleShop(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const user = await this.game.getUserProfile(telegramId);
            const crops = await this.game.db.getAllCropTypes();
            
            let message = `
🛒 <b>SBRFARM Shop</b>

💰 Your SBRcoins: ${user.sbr_coins}

<b>🌱 Seeds:</b>
`;

            crops.forEach(crop => {
                const price = crop.seed_price_sbr || `${crop.seed_price_usdt} USDT`;
                message += `${crop.emoji} ${crop.name}: ${price} ${crop.seed_price_sbr ? 'SBRcoins' : ''}\n`;
            });

            message += `
<b>🧩 Farm Expansion:</b>
🧩 Patch Parts: 100 SBRcoins each
(10 parts = 1 new patch)

<b>⚡ Boosters:</b>
⚡ Growth Booster: 50 SBRcoins
(Reduces growth time by 2 hours)
            `;

            const keyboard = this.getShopKeyboard();
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Shop command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /vip
    async handleVIP(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const vipInfo = await this.game.getVIPInfo(telegramId);
            let message = '';

            if (vipInfo.is_vip) {
                message = `
🌟 <b>VIP Status: Tier ${vipInfo.current_tier}</b>

⏰ Days Remaining: ${vipInfo.days_remaining}

<b>🎁 Your Benefits:</b>
${this.formatVIPBenefits(vipInfo.benefits)}

${vipInfo.can_claim_daily ? '✅ Daily reward available!' : '❌ Daily reward already claimed'}
                `;
            } else {
                message = `
🌟 <b>VIP Subscription</b>

Unlock premium farming benefits!

<b>📦 Available Tiers:</b>
`;
                vipInfo.available_tiers.forEach(tier => {
                    message += `\n💎 Tier ${tier.tier}: $${tier.price}/month\n${tier.benefits}\n`;
                });
            }

            const keyboard = this.getVIPKeyboard(vipInfo);
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('VIP command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /contests
    async handleContests(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const contests = await this.game.getActiveContests(telegramId);
            
            if (contests.length === 0) {
                await ctx.reply('🏆 No active contests at the moment. Check back later!');
                return;
            }

            let message = '🏆 <b>Active Contests</b>\n\n';
            
            contests.forEach(contest => {
                const timeRemaining = moment(contest.end_date).fromNow();
                const isParticipating = !!contest.user_participation;
                
                message += `
<b>${contest.type.toUpperCase()} CONTEST</b>
💰 Entry: ${contest.entry_cost} SBRcoins
📺 Ads Required: ${contest.ads_required}
⏰ Ends: ${timeRemaining}
${isParticipating ? '✅ Participating' : '❌ Not participating'}

`;
            });

            const keyboard = this.getContestKeyboard(contests);
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Contests command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /referral
    async handleReferral(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const referralInfo = await this.game.getReferralInfo(telegramId);
            
            const message = `
👥 <b>Referral Program</b>

<b>Your Referral Code:</b> <code>${referralInfo.referral_code}</code>

<b>Your Referral Link:</b>
${referralInfo.referral_link}

<b>Total Referrals:</b> ${referralInfo.total_referrals}

<b>💰 Rewards:</b>
• 1-10 water drops per active referral
• Bonus coins for active friends
• Special contest entries

Share your link and earn rewards! 🎉
            `;

            const keyboard = {
                inline_keyboard: [
                    [{ text: '📤 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(referralInfo.referral_link)}&text=Join%20me%20in%20SBRFARM!` }],
                    [{ text: '📊 View Stats', callback_data: 'referral_stats' }]
                ]
            };

            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Referral command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /wallet
    async handleWallet(ctx) {
        try {
            const telegramId = ctx.from.id;
            await this.game.validateUser(telegramId);
            
            const user = await this.game.getUserProfile(telegramId);
            const usdtValue = this.game.convertSBRtoUSDT(user.sbr_coins);
            const tonValue = this.game.convertUSDTtoTON(usdtValue);
            
            const message = `
💰 <b>Your Wallet</b>

<b>💎 SBRcoins:</b> ${user.sbr_coins}
<b>💵 USDT Value:</b> ${usdtValue.toFixed(4)}
<b>🔷 TON Value:</b> ${tonValue.toFixed(6)}

<b>📊 Conversion Rates:</b>
• 200 SBRcoin = 1 USDT
• 1 TON = 3.5 USDT

<b>💸 Minimum Withdrawals:</b>
• Binance Pay: 5 USDT
• TON Wallet: 1 TON
• TRC20: 4 USDT
            `;

            const keyboard = this.getWalletKeyboard(user);
            await ctx.reply(message, { 
                reply_markup: keyboard,
                parse_mode: 'HTML'
            });
        } catch (error) {
            console.error('Wallet command error:', error);
            await ctx.reply(`❌ ${error.message}`);
        }
    }

    // Command: /help
    async handleHelp(ctx) {
        const helpMessage = `
📖 <b>SBRFARM Commands</b>

<b>🌾 Farming:</b>
/farm - View your farm
/plant - Plant crops
/harvest - Harvest ready crops
/water - Water management

<b>🛒 Economy:</b>
/shop - Buy seeds & items
/wallet - View balance & withdraw
/daily - Claim daily rewards

<b>🌟 Premium:</b>
/vip - VIP subscription
/contests - Join contests
/referral - Invite friends

<b>ℹ️ Info:</b>
/help - This help menu
/stats - Game statistics

<b>🎮 Game Rules:</b>
• Plant crops and wait for harvest
• Use water drops to plant
• Heavy water needed for carrots
• Boosters reduce growth time
• VIP unlocks extra features
• Contests offer big prizes!

Happy farming! 🌱
        `;

        await ctx.reply(helpMessage, { parse_mode: 'HTML' });
    }

    // Callback handlers for inline keyboards
    async handleCallback(ctx) {
        const data = ctx.callbackQuery.data;
        const telegramId = ctx.from.id;

        try {
            await this.game.validateUser(telegramId);

            if (data.startsWith('plant_')) {
                await this.handlePlantCallback(ctx, data);
            } else if (data.startsWith('harvest_')) {
                await this.handleHarvestCallback(ctx, data);
            } else if (data.startsWith('boost_')) {
                await this.handleBoostCallback(ctx, data);
            } else if (data.startsWith('buy_')) {
                await this.handleBuyCallback(ctx, data);
            } else if (data.startsWith('vip_')) {
                await this.handleVIPCallback(ctx, data);
            } else if (data.startsWith('contest_')) {
                await this.handleContestCallback(ctx, data);
            } else if (data === 'convert_heavy_water') {
                await this.handleConvertHeavyWater(ctx);
            } else if (data === 'expand_farm') {
                await this.handleExpandFarm(ctx);
            }

            await ctx.answerCbQuery();
        } catch (error) {
            console.error('Callback error:', error);
            await ctx.answerCbQuery(`❌ ${error.message}`);
        }
    }

    async handlePlantCallback(ctx, data) {
        const [, cropType, patchNumber] = data.split('_');
        const telegramId = ctx.from.id;

        try {
            const result = await this.game.plantCrop(telegramId, parseInt(patchNumber), cropType);
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleHarvestCallback(ctx, data) {
        const patchNumber = parseInt(data.split('_')[1]);
        const telegramId = ctx.from.id;

        try {
            const result = await this.game.harvestCrop(telegramId, patchNumber);
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleBoostCallback(ctx, data) {
        const patchNumber = parseInt(data.split('_')[1]);
        const telegramId = ctx.from.id;

        try {
            const result = await this.game.useBooster(telegramId, patchNumber);
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleBuyCallback(ctx, data) {
        const [, type, item, quantity] = data.split('_');
        const telegramId = ctx.from.id;
        const qty = parseInt(quantity) || 1;

        try {
            let result;
            if (type === 'seeds') {
                result = await this.game.buySeeds(telegramId, item, qty);
            } else if (type === 'parts') {
                result = await this.game.buyPatchParts(telegramId, qty);
            }
            
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleVIPCallback(ctx, data) {
        const telegramId = ctx.from.id;

        if (data === 'vip_claim_daily') {
            try {
                const result = await this.game.claimVIPDailyReward(telegramId);
                await ctx.editMessageText(result.message);
            } catch (error) {
                await ctx.editMessageText(`❌ ${error.message}`);
            }
        }
    }

    async handleContestCallback(ctx, data) {
        const contestId = parseInt(data.split('_')[1]);
        const telegramId = ctx.from.id;

        try {
            await this.game.db.joinContest(telegramId, contestId);
            await ctx.editMessageText('🎉 Successfully joined the contest!');
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleConvertHeavyWater(ctx) {
        const telegramId = ctx.from.id;

        try {
            const result = await this.game.convertToHeavyWater(telegramId, 1);
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    async handleExpandFarm(ctx) {
        const telegramId = ctx.from.id;

        try {
            const result = await this.game.expandFarm(telegramId);
            await ctx.editMessageText(result.message);
        } catch (error) {
            await ctx.editMessageText(`❌ ${error.message}`);
        }
    }

    // Keyboard generators
    getMainKeyboard() {
        return {
            keyboard: [
                [{ text: '🌾 My Farm' }, { text: '🛒 Shop' }],
                [{ text: '💧 Water' }, { text: '🌟 VIP' }],
                [{ text: '🏆 Contests' }, { text: '💰 Wallet' }],
                [{ text: '👥 Referrals' }, { text: '📖 Help' }]
            ],
            resize_keyboard: true,
            persistent: true
        };
    }

    getFarmKeyboard() {
        return {
            inline_keyboard: [
                [{ text: '🌱 Plant', callback_data: 'show_plant_menu' }, { text: '🌾 Harvest All', callback_data: 'harvest_all' }],
                [{ text: '⚡ Use Booster', callback_data: 'show_boost_menu' }, { text: '🏗️ Expand Farm', callback_data: 'expand_farm' }],
                [{ text: '🔄 Refresh', callback_data: 'refresh_farm' }]
            ]
        };
    }

    getPlantKeyboard(availableCrops) {
        const keyboard = [];
        
        for (let i = 0; i < availableCrops.length; i += 2) {
            const row = [];
            row.push({ 
                text: `${availableCrops[i].emoji} ${availableCrops[i].type} (${availableCrops[i].seeds_available})`, 
                callback_data: `plant_${availableCrops[i].type}` 
            });
            
            if (i + 1 < availableCrops.length) {
                row.push({ 
                    text: `${availableCrops[i + 1].emoji} ${availableCrops[i + 1].type} (${availableCrops[i + 1].seeds_available})`, 
                    callback_data: `plant_${availableCrops[i + 1].type}` 
                });
            }
            
            keyboard.push(row);
        }

        return { inline_keyboard: keyboard };
    }

    getWaterKeyboard(user) {
        const keyboard = [
            [{ text: '💧 Claim Daily (10)', callback_data: 'claim_daily' }],
            [{ text: '📺 Watch Ad (1)', callback_data: 'watch_ad' }]
        ];

        if (user.water_drops >= 100) {
            keyboard.push([{ text: '💧➡️💧 Convert to Heavy Water', callback_data: 'convert_heavy_water' }]);
        }

        return { inline_keyboard: keyboard };
    }

    getShopKeyboard() {
        return {
            inline_keyboard: [
                [{ text: '🥔 Potato Seeds', callback_data: 'buy_seeds_potato_1' }, { text: '🍅 Tomato Seeds', callback_data: 'buy_seeds_tomato_1' }],
                [{ text: '🧅 Onion Seeds', callback_data: 'buy_seeds_onion_1' }, { text: '🥕 Carrot Seeds', callback_data: 'buy_seeds_carrot_1' }],
                [{ text: '🧩 Patch Parts', callback_data: 'buy_parts_part_1' }, { text: '⚡ Boosters', callback_data: 'buy_boosters_booster_1' }]
            ]
        };
    }

    getVIPKeyboard(vipInfo) {
        if (vipInfo.is_vip) {
            const keyboard = [];
            if (vipInfo.can_claim_daily) {
                keyboard.push([{ text: '🎁 Claim Daily Reward', callback_data: 'vip_claim_daily' }]);
            }
            keyboard.push([{ text: '📊 VIP Stats', callback_data: 'vip_stats' }]);
            return { inline_keyboard: keyboard };
        } else {
            return {
                inline_keyboard: [
                    [{ text: '💎 Tier 1 ($7)', callback_data: 'vip_buy_1' }, { text: '💎 Tier 2 ($15)', callback_data: 'vip_buy_2' }],
                    [{ text: '💎 Tier 3 ($30)', callback_data: 'vip_buy_3' }, { text: '💎 Tier 4 ($99)', callback_data: 'vip_buy_4' }]
                ]
            };
        }
    }

    getContestKeyboard(contests) {
        const keyboard = [];
        contests.forEach(contest => {
            if (!contest.user_participation) {
                keyboard.push([{ 
                    text: `🏆 Join ${contest.type} Contest`, 
                    callback_data: `contest_${contest.id}` 
                }]);
            }
        });
        return { inline_keyboard: keyboard };
    }

    getWalletKeyboard(user) {
        const canWithdrawUSDT = this.game.convertSBRtoUSDT(user.sbr_coins) >= 5;
        const canWithdrawTON = this.game.convertUSDTtoTON(this.game.convertSBRtoUSDT(user.sbr_coins)) >= 1;

        const keyboard = [];
        
        if (canWithdrawUSDT) {
            keyboard.push([{ text: '💵 Withdraw USDT', callback_data: 'withdraw_usdt' }]);
        }
        
        if (canWithdrawTON) {
            keyboard.push([{ text: '🔷 Withdraw TON', callback_data: 'withdraw_ton' }]);
        }

        keyboard.push([{ text: '📊 Transaction History', callback_data: 'transaction_history' }]);

        return { inline_keyboard: keyboard };
    }

    // Formatting helpers
    formatFarmStatus(farmStatus) {
        const user = farmStatus.user_info;
        let message = `
🌾 <b>${user.name}'s Farm</b>

💰 SBRcoins: ${user.sbr_coins}
💧 Water: ${user.water_drops}/100
💧 Heavy Water: ${user.heavy_water}/5
⚡ Boosters: ${user.boosters}
🏡 Patches: ${user.total_patches}/8
${user.is_vip ? `🌟 VIP Tier ${user.vip_tier}` : ''}

<b>🌱 Your Patches:</b>
`;

        farmStatus.patches.forEach(patch => {
            if (patch.is_empty) {
                message += `Patch ${patch.patch_number}: 🌱 Empty\n`;
            } else {
                const timeStr = patch.is_ready ? 'Ready!' : this.formatTimeRemaining(patch.time_remaining);
                message += `Patch ${patch.patch_number}: ${patch.crop_emoji} ${patch.crop_type} - ${timeStr}\n`;
            }
        });

        return message;
    }

    formatVIPBenefits(benefits) {
        let message = '';
        if (benefits.patches) message += `• +${benefits.patches} extra patches\n`;
        if (benefits.daily_potatoes) message += `• ${benefits.daily_potatoes} potato seeds daily\n`;
        if (benefits.daily_water) message += `• ${benefits.daily_water} water drops daily\n`;
        if (benefits.daily_parts) message += `• ${benefits.daily_parts} patch parts daily\n`;
        if (benefits.daily_onions) message += `• ${benefits.daily_onions} onion seeds daily\n`;
        if (benefits.tomato_days) message += `• 1 tomato seed every ${benefits.tomato_days} days\n`;
        if (benefits.onion_days) message += `• 1 onion seed every ${benefits.onion_days} days\n`;
        if (benefits.carrot_days) message += `• 1 carrot seed every ${benefits.carrot_days} days\n`;
        return message;
    }

    formatTimeRemaining(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

module.exports = BotHandlers;