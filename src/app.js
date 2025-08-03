const SBRFarmBot = require('./bot/bot');
const DatabaseInitializer = require('./database/init');
require('dotenv').config();

async function startApplication() {
    console.log('🌾 Starting SBRFARM Application...');
    
    try {
        // Initialize database
        console.log('📂 Initializing database...');
        const dbInit = new DatabaseInitializer();
        await dbInit.initialize();
        await dbInit.verifyDatabase();
        
        // Create bot instance
        console.log('🤖 Creating bot instance...');
        const bot = new SBRFarmBot();
        
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT, shutting down gracefully...');
            bot.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
            bot.stop();
            process.exit(0);
        });

        process.on('uncaughtException', (error) => {
            console.error('💥 Uncaught Exception:', error);
            bot.stop();
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
            bot.stop();
            process.exit(1);
        });

        // Start the bot
        bot.launch();
        
        console.log('🎉 SBRFARM Application started successfully!');
        console.log(`
📋 Application Info:
• Bot Token: ${process.env.BOT_TOKEN ? '✅ Configured' : '❌ Missing'}
• Database: ${process.env.DB_PATH || './data/sbrfarm.db'}
• Environment: ${process.env.NODE_ENV || 'development'}
• Admin Port: ${process.env.ADMIN_PORT || '3001'}

🚀 Ready to serve farmers!
        `);

    } catch (error) {
        console.error('💥 Failed to start application:', error);
        process.exit(1);
    }
}

// Start the application
if (require.main === module) {
    startApplication();
}

module.exports = { startApplication };