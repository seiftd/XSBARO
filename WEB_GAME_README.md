# 🌾 SBRFARM Web Game

A beautiful, feature-rich web-based farming simulation game with stunning visual effects, immersive sound design, and dynamic environmental systems.

## 🎮 Game Features

### 🌱 Core Gameplay
- **Farm Management**: Plant, water, and harvest 3 different crop types
- **Resource Management**: Manage coins, water, and seeds efficiently
- **Progressive Gameplay**: Level up system with increasing rewards
- **Achievement System**: Unlock achievements for various milestones

### 🎨 Visual Effects
- **Advanced Particle System**: Dynamic particle effects for all game actions
- **Animated Background**: Floating clouds and seasonal elements
- **Visual Feedback**: Hover effects, animations, and transitions
- **Beautiful UI**: Modern farming-themed design with custom icons

### 🔊 Audio Experience
- **Procedural Sound Effects**: Generated using Web Audio API
- **Background Music**: Subtle melodic background tracks
- **Ambient Sounds**: Nature sounds including wind and birds
- **Interactive Audio**: Sound effects for all player actions

### 🌍 Environmental Systems
- **Day/Night Cycle**: Dynamic sky colors changing throughout the day
- **Seasonal Changes**: Four seasons with unique visual effects
- **Weather System**: Dynamic weather affecting gameplay
- **Environmental Bonuses**: Weather and time-based gameplay modifiers

### 🎯 Crop Types
| Crop | Growth Time | Water Cost | Purchase Price | Sell Value | XP Gained |
|------|-------------|------------|----------------|------------|-----------|
| 🥔 Potato | 30 seconds | 2 water | 10 coins | 20 coins | 5 XP |
| 🍅 Tomato | 60 seconds | 3 water | 25 coins | 50 coins | 12 XP |
| 🥕 Carrot | 120 seconds | 5 water | 50 coins | 100 coins | 25 XP |

## 🚀 Quick Start

### Method 1: Using the Launch Script
```bash
./launch_web_game.sh
```

### Method 2: Manual Setup
1. **Install a web server** (choose one):
   - Python 3: `python3 -m http.server 8080`
   - Node.js: `npx http-server -p 8080`

2. **Navigate to the public directory**:
   ```bash
   cd public
   ```

3. **Start the server and open** `http://localhost:8080/game.html`

### Method 3: Direct Browser Access
- Open `public/game.html` directly in your browser
- Note: Some features may be limited due to CORS restrictions

## 🎮 How to Play

### Basic Controls
1. **Click empty patches** to plant crops
2. **Choose crop type** from the modal
3. **Click planted crops** to water them (if not already watered)
4. **Click ready crops** (golden background) to harvest
5. **Use action buttons** for bulk operations

### Game Interface
- **Header**: Displays coins, water, level, and settings
- **Farm Grid**: 12 farm patches for planting crops
- **Shop Panel**: Purchase seeds for different crops
- **Inventory Panel**: View your current seed counts
- **Achievements Panel**: Track your progress

### Advanced Features
- **Bulk Actions**: Water All, Boost All, Harvest All buttons
- **Environmental Bonuses**: Take advantage of weather and time bonuses
- **Settings Panel**: Customize sound, music, and particle effects
- **Auto-Generation**: Passive income and water generation

## ⚙️ Settings & Controls

### Audio Settings
- **🔊 Sound Toggle**: Enable/disable all sound effects
- **🎵 Music Volume**: Adjust background music volume (0-100%)
- **🔊 SFX Volume**: Adjust sound effects volume (0-100%)

### Visual Settings
- **✨ Particle Effects**: Enable/disable particle effects
- **Environment**: Weather and seasonal effects (always on)

### Game Management
- **🔄 Reset Game**: Clear all saved progress (requires confirmation)
- **💾 Auto-Save**: Game automatically saves every 30 seconds

## 🌍 Environmental System

### Time of Day Effects
- **🌅 Morning (6:00-12:00)**: +10% crop growth bonus
- **☀️ Afternoon (12:00-18:00)**: Standard rates
- **🌅 Evening (18:00-20:00)**: Beautiful sunset colors
- **🌙 Night (20:00-6:00)**: Peaceful night ambiance

### Seasonal Effects
- **🌸 Spring**: +15% growth rate, flower petal effects
- **☀️ Summer**: +10% coin income, bright sunny weather
- **🍂 Autumn**: +20% coin income (harvest season), falling leaves
- **❄️ Winter**: -10% growth rate, snow effects

### Weather Effects
- **☀️ Sunny**: Standard rates, clear skies
- **☁️ Cloudy**: Standard rates, overcast atmosphere
- **🌧️ Rainy**: +50% water generation, +20% growth rate
- **❄️ Snowy**: Beautiful snow particle effects

## 🏆 Achievement System

### Available Achievements
- **🌱 First Plant**: Plant your first crop
- **🤏 First Harvest**: Harvest your first crop
- **💰 Rich Farmer**: Reach level 5
- **👑 Master Farmer**: Reach level 10

## 💾 Save System

### Auto-Save Features
- **Automatic**: Game saves every 30 seconds
- **On Exit**: Saves when closing the browser tab
- **Manual Reset**: Option to clear all data in settings

### Saved Data
- Coins, water, level, and XP
- Current crops and growth progress
- Achievement progress
- Game settings and preferences

## 🎨 Technical Features

### Advanced Systems
- **Web Audio API**: Procedural sound generation
- **Canvas Particle System**: Hardware-accelerated particle effects
- **CSS3 Animations**: Smooth transitions and hover effects
- **Local Storage**: Persistent game state
- **Responsive Design**: Works on desktop and mobile

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile Support**: Responsive design for touch devices
- **Progressive Enhancement**: Graceful degradation for older browsers

## 🐛 Troubleshooting

### Common Issues

**No Sound Playing**
- Check if audio is enabled in settings
- Ensure browser allows audio playback
- Try adjusting volume sliders

**Particles Not Showing**
- Check if particle effects are enabled in settings
- Ensure browser supports Canvas API
- Try refreshing the page

**Game Not Saving**
- Check if Local Storage is enabled in your browser
- Ensure you're not in private/incognito mode
- Try the manual reset option

**Performance Issues**
- Disable particle effects in settings
- Lower music/SFX volumes
- Close other browser tabs
- Try a different browser

### Performance Optimization
- Particle system automatically manages performance
- Sound effects are optimized for minimal CPU usage
- Visual effects scale based on device capabilities

## 🔧 Development

### File Structure
```
public/
├── game.html              # Main game file
├── assets/
│   ├── sounds.js          # Advanced sound system
│   ├── particles.js       # Particle effects system
│   └── environment.js     # Environmental effects
└── README.md             # This file
```

### Key Technologies
- **HTML5**: Semantic markup and Canvas API
- **CSS3**: Modern styling, animations, and responsive design
- **JavaScript ES6+**: Modern JavaScript features
- **Web Audio API**: Real-time audio generation
- **Canvas API**: Hardware-accelerated graphics

## 🎯 Future Enhancements

### Planned Features
- **Multiplayer Mode**: Share farms with friends
- **More Crops**: Additional crop varieties
- **Farm Expansion**: Unlock new farm areas
- **Market System**: Dynamic crop pricing
- **Seasonal Events**: Special limited-time events

### Technical Improvements
- **WebGL Particles**: Enhanced particle performance
- **Service Worker**: Offline game support
- **Progressive Web App**: Install as mobile app

## 📝 License

This project is part of the SBRFARM ecosystem and follows the same MIT license terms.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Enjoy farming! 🌾🚜**

*Built with ❤️ for the SBRFARM community*