# 🌾 SBRFARM - Telegram Farming Simulation Game

A comprehensive Telegram-based farming simulation game where users cultivate crops, manage resources, and compete in contests. Built with Node.js, SQLite, and Telegraf.

## 🎮 Game Features

### 🌱 Core Farming System
- **4 Crop Types**: Potato (24h), Tomato (48h), Onion (96h), Carrot (144h)
- **Growth Boosters**: Reduce growth time by 2 hours per booster
- **Water Management**: Regular drops + heavy water for premium crops
- **Farm Expansion**: Start with 3 patches, expand to 8 total

### 💰 Economy System
- **SBRcoin Currency**: Earn by harvesting crops
- **Multi-Currency Support**: USDT, TON blockchain integration
- **Withdrawal Options**: Binance Pay, TON Wallet, TRC20
- **Exchange Rates**: 200 SBRcoin = 1 USDT, 1 TON = 3.5 USDT

### 🌟 VIP Subscription System
| Tier | Price | Benefits |
|------|-------|----------|
| 1 | $7/month | +1 patch, 2 potato seeds daily |
| 2 | $15/month | +1 patch, 5 patch parts, 2 potatoes, 10 water drops daily, tomato every 2 days |
| 3 | $30/month | +2 patches, 2 potatoes, 20 water drops daily, onion every 2 days |
| 4 | $99/month | +3 patches, 2 potatoes + 2 onions daily, carrot every 3 days |

### 🏆 Contest System
- **Daily Contests**: 20 SBRcoin entry, 5 ads required
- **Weekly Contests**: 100 SBRcoin entry, 30 ads required  
- **Monthly Contests**: 200 SBRcoin entry, 100 ads required, VIP tier prizes

### 👥 Social Features
- **Referral System**: Earn water drops for successful referrals
- **Leaderboards**: Track top farmers and referrers
- **Community Contests**: Special events and competitions

## 🛠️ Technical Architecture

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram Bot  │────│   Game Engine   │────│   Database      │
│   (Telegraf)    │    │   (Core Logic)  │    │   (SQLite)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐             │
         │              │  Cron Scheduler │             │
         │              │  (Background)   │             │
         │              └─────────────────┘             │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Admin Dashboard │    │ Payment Gateway │    │ Analytics       │
│ (Express.js)    │    │ (Multi-currency)│    │ (Metrics)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack
- **Backend**: Node.js with Express.js
- **Bot Framework**: Telegraf (Telegram Bot API)
- **Database**: SQLite with comprehensive schema
- **Scheduling**: node-cron for automated tasks
- **Frontend**: HTML/CSS/JS for admin dashboard
- **Payment**: Integration ready for multiple gateways

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Telegram Bot Token (from @BotFather)
- Basic understanding of Telegram bots

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd sbrfarm-telegram-game
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Initialize database**
```bash
npm run init-db
```

5. **Start the application**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Essential Configuration
BOT_TOKEN=your_telegram_bot_token_here
DB_PATH=./data/sbrfarm.db
ADMIN_PORT=3001

# Payment Integration (Optional)
BINANCE_PAY_API_KEY=your_key
TON_WALLET_API=your_key

# Game Settings
MAX_WATER_DROPS=100
MAX_PATCHES=8
SBRCOIN_TO_USDT_RATE=200
```

## 📁 Project Structure

```
sbrfarm-telegram-game/
├── src/
│   ├── app.js                 # Main application entry
│   ├── bot/
│   │   ├── bot.js            # Telegram bot setup
│   │   └── handlers.js       # Command handlers
│   ├── database/
│   │   ├── init.js           # Database initialization
│   │   ├── manager.js        # Database operations
│   │   └── schema.sql        # Database schema
│   ├── game/
│   │   └── engine.js         # Core game logic
│   ├── admin/
│   │   └── server.js         # Admin dashboard
│   ├── cron/
│   │   └── scheduler.js      # Background jobs
│   └── utils/
├── data/                     # Database files
├── logs/                     # Application logs
├── public/                   # Static assets
├── package.json
├── .env.example
└── README.md
```

## 🎯 Core Game Commands

### Player Commands
- `/start` - Initialize account & welcome
- `/farm` - View farm status
- `/plant` - Plant crops on patches
- `/harvest` - Harvest ready crops
- `/water` - Water management options
- `/daily` - Claim daily rewards
- `/shop` - Buy seeds and items
- `/vip` - VIP subscription info
- `/contests` - View active contests
- `/referral` - Referral program
- `/wallet` - Balance and withdrawals
- `/stats` - Player statistics
- `/help` - Command help

### Admin Commands
- `/admin` - Admin panel access
- `/admin_stats` - System statistics
- `/admin_broadcast` - Send announcements

## 🔧 Game Mechanics

### Crop Growth System
```javascript
// Crop timing and requirements
const cropTypes = {
    potato: { time: 24, water: 10, price: 100 },
    tomato: { time: 48, water: 20, price: 150 },
    onion: { time: 96, water: 50, price: 250 },
    carrot: { time: 144, water: 100, price: 1300 }
};
```

### Water Sources
- **Daily Check-in**: 10 drops (resets 00:00 UTC)
- **Ad Watching**: 1 drop per ad (1-min cooldown)
- **Channel Join**: 5 drops (one-time)
- **Referrals**: 1-10 drops based on activity

### Resource Limits
- Water Drops: 100 maximum
- Heavy Water: 5 maximum  
- Boosters: 10 maximum
- Patches: 8 maximum

## 🔄 Automated Systems

### Cron Jobs Schedule
- **Crop Monitor**: Every minute - Check harvest readiness
- **VIP Rewards**: Daily 00:01 - Distribute VIP benefits
- **Contests**: Daily 00:00 - Create new contests
- **Winners**: Daily 23:30 - Select contest winners
- **Cleanup**: Daily 02:00 - Remove old data
- **Backup**: Daily 03:00 - Database backup

### Background Processing
```bash
# Start scheduler separately
node src/cron/scheduler.js start

# Run specific tasks
node src/cron/scheduler.js crop-check
node src/cron/scheduler.js vip-rewards
```

## 📊 Admin Dashboard Features

- **User Management**: View, ban, manage user accounts
- **VIP Control**: Subscription management and benefits
- **Contest Administration**: Create and manage competitions
- **Financial Oversight**: Transaction and withdrawal approval
- **Analytics**: User growth, revenue, engagement metrics
- **System Settings**: Configure game parameters

Access: `http://localhost:3001/admin`

## 💳 Payment Integration

### Supported Methods
- **Binance Pay**: Minimum 5 USDT
- **TON Blockchain**: Minimum 1 TON
- **TRC20 (Tron)**: Minimum 4 USDT

### Security Features
- Transaction verification
- Withdrawal approval system
- Rate limiting
- Fraud detection

## 📈 Analytics & Monitoring

### Key Metrics Tracked
- User registration and retention
- Crop planting and harvesting rates
- Contest participation
- VIP subscription trends
- Revenue and transaction volume
- Referral effectiveness

### Performance Monitoring
- Response time tracking
- Error rate monitoring
- Database performance
- Bot uptime statistics

## 🛡️ Security Considerations

### Data Protection
- User data encryption
- Secure password handling
- SQL injection prevention
- Rate limiting implementation

### Financial Security
- Transaction verification
- Withdrawal limits
- Admin approval workflows
- Audit trail maintenance

## 🚀 Deployment

### Development
```bash
npm run dev        # Start with nodemon
npm run admin      # Start admin dashboard
npm run cron       # Start background jobs
```

### Production
```bash
npm start          # Production bot
npm run admin      # Admin dashboard
pm2 start ecosystem.config.js  # PM2 process manager
```

### Docker Deployment
```dockerfile
# Coming soon - Docker configuration
# Multi-container setup with bot, admin, and cron
```

## 🔌 API Endpoints

### Admin API
- `GET /api/stats` - System statistics
- `GET /api/users` - User management
- `POST /api/broadcast` - Send announcements
- `GET /api/transactions` - Financial data

### Webhook Support
- `POST /webhook` - Telegram webhook endpoint
- Payment gateway webhooks for transaction updates

## 🧪 Testing

```bash
npm test           # Run test suite
npm run test:unit  # Unit tests
npm run test:integration  # Integration tests
```

### Test Coverage
- Database operations
- Game logic validation
- Bot command handling
- Payment processing
- Contest mechanics

## 📋 TODO & Roadmap

### Completed ✅
- [x] Database schema and management
- [x] Core game engine
- [x] Telegram bot implementation
- [x] Cron job scheduling
- [x] VIP system
- [x] Contest mechanics

### In Progress 🔄
- [ ] Admin dashboard
- [ ] Payment gateway integration
- [ ] Advanced analytics

### Planned 📅
- [ ] Mobile web app
- [ ] Advanced contest types
- [ ] NFT integration
- [ ] Multi-language support
- [ ] Social features expansion

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation
- Ensure backward compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

### Issues & Bugs
- GitHub Issues: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check README and code comments

### Community
- Telegram Channel: @sbrfarm_announcements
- Developer Group: @sbrfarm_devs

## 🙏 Acknowledgments

- Telegraf.js team for excellent bot framework
- SQLite for reliable database solution
- Node.js community for ecosystem support
- Telegram for Bot API platform

---

**Happy Farming! 🌾🎮**

> *SBRFARM - Where virtual farming meets real rewards*