// Environmental Effects System for SBRFARM
class EnvironmentSystem {
    constructor() {
        this.timeOfDay = 0; // 0-24 hours
        this.timeSpeed = 0.1; // Speed multiplier for day/night cycle
        this.season = 'spring'; // spring, summer, autumn, winter
        this.weather = 'sunny'; // sunny, cloudy, rainy, snowy
        this.init();
    }

    init() {
        this.createEnvironmentalElements();
        this.startTimeSystem();
        this.startWeatherSystem();
    }

    createEnvironmentalElements() {
        // Create sky overlay
        this.skyOverlay = document.createElement('div');
        this.skyOverlay.style.position = 'fixed';
        this.skyOverlay.style.top = '0';
        this.skyOverlay.style.left = '0';
        this.skyOverlay.style.width = '100%';
        this.skyOverlay.style.height = '100%';
        this.skyOverlay.style.pointerEvents = 'none';
        this.skyOverlay.style.zIndex = '1';
        this.skyOverlay.style.transition = 'background 3s ease';
        document.body.appendChild(this.skyOverlay);

        // Create weather overlay
        this.weatherOverlay = document.createElement('div');
        this.weatherOverlay.style.position = 'fixed';
        this.weatherOverlay.style.top = '0';
        this.weatherOverlay.style.left = '0';
        this.weatherOverlay.style.width = '100%';
        this.weatherOverlay.style.height = '100%';
        this.weatherOverlay.style.pointerEvents = 'none';
        this.weatherOverlay.style.zIndex = '2';
        document.body.appendChild(this.weatherOverlay);

        // Create time indicator
        this.timeIndicator = document.createElement('div');
        this.timeIndicator.style.position = 'fixed';
        this.timeIndicator.style.top = '10px';
        this.timeIndicator.style.left = '10px';
        this.timeIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
        this.timeIndicator.style.color = 'white';
        this.timeIndicator.style.padding = '5px 10px';
        this.timeIndicator.style.borderRadius = '15px';
        this.timeIndicator.style.fontSize = '0.9rem';
        this.timeIndicator.style.zIndex = '1000';
        document.body.appendChild(this.timeIndicator);
    }

    startTimeSystem() {
        setInterval(() => {
            this.timeOfDay += this.timeSpeed;
            if (this.timeOfDay >= 24) {
                this.timeOfDay = 0;
                this.changeSeason();
            }
            this.updateSkyColor();
            this.updateTimeIndicator();
        }, 1000);
    }

    updateSkyColor() {
        let skyColor = '';
        let timeIcon = '';

        if (this.timeOfDay >= 6 && this.timeOfDay < 12) {
            // Morning
            const progress = (this.timeOfDay - 6) / 6;
            skyColor = this.interpolateColor('#FFB347', '#87CEEB', progress);
            timeIcon = '🌅';
        } else if (this.timeOfDay >= 12 && this.timeOfDay < 18) {
            // Afternoon
            skyColor = '#87CEEB';
            timeIcon = '☀️';
        } else if (this.timeOfDay >= 18 && this.timeOfDay < 20) {
            // Evening
            const progress = (this.timeOfDay - 18) / 2;
            skyColor = this.interpolateColor('#87CEEB', '#FF6347', progress);
            timeIcon = '🌅';
        } else {
            // Night
            skyColor = '#2C3E50';
            timeIcon = this.timeOfDay >= 20 && this.timeOfDay < 22 ? '🌙' : '✨';
        }

        // Apply seasonal modifiers
        skyColor = this.applySeasonalTint(skyColor);

        this.skyOverlay.style.background = `linear-gradient(to bottom, ${skyColor}, rgba(0,0,0,0))`;
        this.currentTimeIcon = timeIcon;
    }

    updateTimeIndicator() {
        const hours = Math.floor(this.timeOfDay);
        const minutes = Math.floor((this.timeOfDay % 1) * 60);
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        this.timeIndicator.innerHTML = `${this.currentTimeIcon} ${timeString} ${this.getSeasonIcon()}${this.season} ${this.getWeatherIcon()}`;
    }

    getSeasonIcon() {
        const icons = {
            spring: '🌸',
            summer: '☀️',
            autumn: '🍂',
            winter: '❄️'
        };
        return icons[this.season];
    }

    getWeatherIcon() {
        const icons = {
            sunny: '☀️',
            cloudy: '☁️',
            rainy: '🌧️',
            snowy: '❄️'
        };
        return icons[this.weather];
    }

    changeSeason() {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const currentIndex = seasons.indexOf(this.season);
        this.season = seasons[(currentIndex + 1) % seasons.length];
        
        // Trigger seasonal effects
        this.triggerSeasonalEffects();
    }

    triggerSeasonalEffects() {
        // Emit seasonal particles
        if (window.particleSystem) {
            switch (this.season) {
                case 'spring':
                    // Flower petals
                    for (let i = 0; i < 20; i++) {
                        setTimeout(() => {
                            window.particleSystem.createParticle(
                                Math.random() * window.innerWidth,
                                -10,
                                'sparkle',
                                { 
                                    maxLife: 5.0, 
                                    text: '🌸',
                                    color: '#FF69B4',
                                    gravity: 0.02
                                }
                            );
                        }, i * 100);
                    }
                    break;

                case 'autumn':
                    // Falling leaves
                    for (let i = 0; i < 30; i++) {
                        setTimeout(() => {
                            window.particleSystem.createParticle(
                                Math.random() * window.innerWidth,
                                -10,
                                'leaf',
                                { 
                                    maxLife: 8.0,
                                    text: ['🍂', '🍁'][Math.floor(Math.random() * 2)]
                                }
                            );
                        }, i * 50);
                    }
                    break;

                case 'winter':
                    this.startSnowfall();
                    break;
            }
        }

        // Play seasonal notification
        if (window.soundSystem) {
            window.soundSystem.play('notification');
        }

        // Show seasonal toast
        if (window.showToast) {
            window.showToast(`${this.getSeasonIcon()}${this.season.charAt(0).toUpperCase() + this.season.slice(1)} has arrived!`, 'success');
        }
    }

    startWeatherSystem() {
        // Change weather randomly every 2-5 minutes
        const scheduleWeatherChange = () => {
            setTimeout(() => {
                this.changeWeather();
                scheduleWeatherChange();
            }, (2 + Math.random() * 3) * 60000);
        };

        scheduleWeatherChange();
    }

    changeWeather() {
        const weatherTypes = {
            spring: ['sunny', 'cloudy', 'rainy'],
            summer: ['sunny', 'sunny', 'cloudy'], // More sunny in summer
            autumn: ['cloudy', 'rainy', 'sunny'],
            winter: ['cloudy', 'snowy', 'sunny']
        };

        const possibleWeather = weatherTypes[this.season];
        const newWeather = possibleWeather[Math.floor(Math.random() * possibleWeather.length)];
        
        if (newWeather !== this.weather) {
            this.weather = newWeather;
            this.applyWeatherEffects();
        }
    }

    applyWeatherEffects() {
        // Clear previous weather effects
        this.weatherOverlay.innerHTML = '';
        this.weatherOverlay.style.background = '';

        switch (this.weather) {
            case 'rainy':
                this.startRain();
                this.weatherOverlay.style.background = 'rgba(0, 50, 100, 0.2)';
                break;

            case 'snowy':
                this.startSnow();
                this.weatherOverlay.style.background = 'rgba(200, 200, 255, 0.1)';
                break;

            case 'cloudy':
                this.weatherOverlay.style.background = 'rgba(100, 100, 100, 0.1)';
                break;
        }

        // Weather change notification
        if (window.showToast) {
            window.showToast(`Weather changed to ${this.weather} ${this.getWeatherIcon()}`, 'info');
        }
    }

    startRain() {
        const rainInterval = setInterval(() => {
            if (this.weather !== 'rainy') {
                clearInterval(rainInterval);
                return;
            }

            if (window.particleSystem) {
                window.particleSystem.createRain(0.3);
            }
        }, 100);

        // Rain sound
        if (window.soundSystem) {
            setTimeout(() => {
                if (this.weather === 'rainy') {
                    window.soundSystem.playAmbientSound();
                }
            }, 1000);
        }
    }

    startSnow() {
        const snowInterval = setInterval(() => {
            if (this.weather !== 'snowy') {
                clearInterval(snowInterval);
                return;
            }

            if (window.particleSystem) {
                window.particleSystem.createParticle(
                    Math.random() * window.innerWidth,
                    -10,
                    'sparkle',
                    {
                        text: '❄️',
                        color: '#FFFFFF',
                        gravity: 0.05,
                        maxLife: 10.0,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 2 + 1
                    }
                );
            }
        }, 200);
    }

    startSnowfall() {
        // Special winter season snowfall
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                if (window.particleSystem) {
                    window.particleSystem.createParticle(
                        Math.random() * window.innerWidth,
                        -10,
                        'sparkle',
                        {
                            text: '❄️',
                            color: '#FFFFFF',
                            gravity: 0.03,
                            maxLife: 15.0,
                            vx: (Math.random() - 0.5) * 3,
                            vy: Math.random() * 1.5 + 0.5
                        }
                    );
                }
            }, i * 100);
        }
    }

    interpolateColor(color1, color2, factor) {
        // Simple color interpolation
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        
        if (!rgb1 || !rgb2) return color1;

        const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
        const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
        const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

        return `rgb(${r}, ${g}, ${b})`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    applySeasonalTint(color) {
        // Apply subtle seasonal color tints
        const tints = {
            spring: { r: 1.05, g: 1.1, b: 1.0 },
            summer: { r: 1.1, g: 1.05, b: 0.95 },
            autumn: { r: 1.15, g: 1.0, b: 0.9 },
            winter: { r: 0.95, g: 0.95, b: 1.1 }
        };

        // This is a simplified implementation
        return color; // Return original color for now
    }

    // Get current environment bonuses for gameplay
    getEnvironmentBonuses() {
        const bonuses = {
            growth: 1.0,
            water: 1.0,
            coins: 1.0
        };

        // Time of day bonuses
        if (this.timeOfDay >= 6 && this.timeOfDay < 12) {
            bonuses.growth *= 1.1; // Morning growth bonus
        }

        // Weather bonuses
        if (this.weather === 'rainy') {
            bonuses.water *= 1.5; // More water during rain
            bonuses.growth *= 1.2; // Plants grow faster in rain
        }

        // Seasonal bonuses
        switch (this.season) {
            case 'spring':
                bonuses.growth *= 1.15;
                break;
            case 'summer':
                bonuses.coins *= 1.1;
                break;
            case 'autumn':
                bonuses.coins *= 1.2; // Harvest season
                break;
            case 'winter':
                bonuses.growth *= 0.9; // Slower growth in winter
                break;
        }

        return bonuses;
    }

    // Set time manually (for testing)
    setTime(hours) {
        this.timeOfDay = hours;
        this.updateSkyColor();
        this.updateTimeIndicator();
    }

    // Set season manually
    setSeason(season) {
        this.season = season;
        this.triggerSeasonalEffects();
    }

    // Set weather manually
    setWeather(weather) {
        this.weather = weather;
        this.applyWeatherEffects();
    }
}

// Export for global use
window.EnvironmentSystem = EnvironmentSystem;