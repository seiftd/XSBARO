const DatabaseManager = require('../database/manager');

class NotificationSystem {
    constructor(bot) {
        this.bot = bot;
        this.db = new DatabaseManager();
        this.startNotificationProcessor();
    }

    // Process pending notifications every 10 seconds
    startNotificationProcessor() {
        setInterval(async () => {
            await this.processPendingNotifications();
        }, 10000); // Check every 10 seconds
    }

    async processPendingNotifications() {
        try {
            // Get unprocessed notifications
            const notifications = await this.db.all(`
                SELECT * FROM notifications 
                WHERE read_at IS NULL 
                ORDER BY priority DESC, sent_at ASC 
                LIMIT 50
            `);

            for (const notification of notifications) {
                await this.sendNotification(notification);
            }
        } catch (error) {
            console.error('Error processing notifications:', error);
        }
    }

    async sendNotification(notification) {
        try {
            const { telegram_id, message, type, priority, id } = notification;

            // Format message based on type
            let formattedMessage = this.formatMessage(message, type, priority);

            // Send message to user
            await this.bot.telegram.sendMessage(telegram_id, formattedMessage, {
                parse_mode: 'HTML',
                disable_web_page_preview: true
            });

            // Mark notification as read/sent
            await this.db.run(`
                UPDATE notifications 
                SET read_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `, [id]);

            console.log(`Notification sent to ${telegram_id}: ${message.substring(0, 50)}...`);
        } catch (error) {
            console.error(`Failed to send notification to ${notification.telegram_id}:`, error);
            
            // If user blocked bot or chat not found, don't retry
            if (error.code === 403 || error.code === 400) {
                await this.db.run(`
                    UPDATE notifications 
                    SET read_at = CURRENT_TIMESTAMP 
                    WHERE id = ?
                `, [notification.id]);
            }
        }
    }

    formatMessage(message, type, priority) {
        let icon = '📢';
        let prefix = '';

        switch (type) {
            case 'admin':
                icon = '👨‍💼';
                prefix = '<b>Admin Message</b>';
                break;
            case 'system':
                icon = '⚙️';
                prefix = '<b>System Notification</b>';
                break;
            case 'payment':
                icon = '💳';
                prefix = '<b>Payment Update</b>';
                break;
            case 'contest':
                icon = '🏆';
                prefix = '<b>Contest News</b>';
                break;
            case 'vip':
                icon = '👑';
                prefix = '<b>VIP Notification</b>';
                break;
            default:
                icon = '📢';
                prefix = '<b>Notification</b>';
        }

        if (priority === 'urgent') {
            icon = '🚨';
            prefix = `<b>URGENT - ${prefix.replace('<b>', '').replace('</b>', '')}</b>`;
        } else if (priority === 'high') {
            icon = '⚡';
        }

        return `${icon} ${prefix}\n\n${message}`;
    }

    // Quick methods for common notifications
    async sendPaymentApprovalNotification(telegramId, amount, currency, type) {
        const message = type === 'withdrawal' 
            ? `✅ Your withdrawal of ${amount} ${currency} has been approved and processed!`
            : `🌟 Your VIP subscription has been activated! Welcome to premium farming!`;

        await this.queueNotification(telegramId, message, 'payment', 'high');
    }

    async sendPaymentRejectionNotification(telegramId, reason) {
        const message = `❌ Your payment request has been rejected.\n\n<b>Reason:</b> ${reason}`;
        await this.queueNotification(telegramId, message, 'payment', 'high');
    }

    async sendGiftNotification(telegramId, giftType, amount, customMessage) {
        const message = customMessage || `🎁 You received a gift from admin: ${amount} ${giftType}!`;
        await this.queueNotification(telegramId, message, 'admin', 'normal');
    }

    async sendBroadcastNotification(telegramIds, message) {
        for (const telegramId of telegramIds) {
            await this.queueNotification(telegramId, message, 'admin', 'normal');
        }
    }

    async sendVIPRewardNotification(telegramId, rewards) {
        const rewardsList = rewards.map(r => `• ${r.amount} ${r.type}`).join('\n');
        const message = `👑 <b>VIP Daily Rewards</b>\n\nYou received:\n${rewardsList}\n\nThank you for being a premium member! 🌟`;
        await this.queueNotification(telegramId, message, 'vip', 'normal');
    }

    async sendContestWinNotification(telegramId, contestType, prize) {
        const message = `🎉 <b>Congratulations!</b>\n\nYou won the ${contestType} contest!\n\n🏆 Prize: ${prize}\n\nGreat farming! 🌾`;
        await this.queueNotification(telegramId, message, 'contest', 'high');
    }

    async sendMaintenanceNotification(telegramIds, message, downtime) {
        const maintenanceMessage = `🔧 <b>Maintenance Notice</b>\n\n${message}\n\n⏰ Expected downtime: ${downtime}\n\nWe apologize for any inconvenience.`;
        
        for (const telegramId of telegramIds) {
            await this.queueNotification(telegramId, maintenanceMessage, 'system', 'urgent');
        }
    }

    async queueNotification(telegramId, message, type = 'admin', priority = 'normal') {
        try {
            await this.db.run(`
                INSERT INTO notifications (telegram_id, message, type, priority)
                VALUES (?, ?, ?, ?)
            `, [telegramId, message, type, priority]);
        } catch (error) {
            console.error('Error queuing notification:', error);
        }
    }

    // Get notification statistics for admin dashboard
    async getNotificationStats() {
        try {
            const stats = await this.db.get(`
                SELECT 
                    COUNT(*) as total_notifications,
                    COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as sent_notifications,
                    COUNT(CASE WHEN read_at IS NULL THEN 1 END) as pending_notifications,
                    COUNT(CASE WHEN type = 'admin' THEN 1 END) as admin_notifications,
                    COUNT(CASE WHEN type = 'payment' THEN 1 END) as payment_notifications,
                    COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_notifications
                FROM notifications 
                WHERE sent_at >= DATE('now', '-7 days')
            `);

            return stats;
        } catch (error) {
            console.error('Error getting notification stats:', error);
            return {
                total_notifications: 0,
                sent_notifications: 0,
                pending_notifications: 0,
                admin_notifications: 0,
                payment_notifications: 0,
                urgent_notifications: 0
            };
        }
    }

    // Get recent notifications for admin dashboard
    async getRecentNotifications(limit = 50) {
        try {
            return await this.db.all(`
                SELECT n.*, u.first_name, u.username
                FROM notifications n
                JOIN users u ON n.telegram_id = u.telegram_id
                ORDER BY n.sent_at DESC
                LIMIT ?
            `, [limit]);
        } catch (error) {
            console.error('Error getting recent notifications:', error);
            return [];
        }
    }

    // Test notification (for admin dashboard)
    async sendTestNotification(telegramId) {
        const message = `🧪 <b>Test Notification</b>\n\nThis is a test message from the SBRFARM admin dashboard.\n\n✅ Notification system is working correctly!\n\n${new Date().toLocaleString()}`;
        await this.queueNotification(telegramId, message, 'system', 'normal');
    }
}

module.exports = NotificationSystem;