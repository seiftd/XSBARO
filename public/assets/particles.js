// Advanced Particle System for SBRFARM Web Game
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.canvas = null;
        this.ctx = null;
        this.init();
    }

    init() {
        // Create canvas for particles
        this.canvas = document.createElement('canvas');
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '9999';
        document.body.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Handle window resize
        window.addEventListener('resize', () => this.resize());

        // Start animation loop
        this.animate();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // Create different types of particles
    createParticle(x, y, type, options = {}) {
        const particle = {
            x: x,
            y: y,
            type: type,
            life: 1.0,
            maxLife: options.maxLife || 2.0,
            ...this.getParticleConfig(type, options)
        };

        this.particles.push(particle);
    }

    getParticleConfig(type, options) {
        switch (type) {
            case 'coin':
                return {
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 6 - 2,
                    gravity: 0.3,
                    size: 16,
                    color: '#FFD700',
                    text: '💰',
                    bounce: 0.7,
                    rotation: 0,
                    rotationSpeed: Math.random() * 0.2 - 0.1
                };

            case 'plant':
                return {
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 3 - 1,
                    gravity: 0.1,
                    size: 14,
                    color: '#4CAF50',
                    text: '🌱',
                    scale: 0.5,
                    scaleSpeed: 0.02
                };

            case 'water':
                return {
                    vx: (Math.random() - 0.5) * 6,
                    vy: -Math.random() * 4 - 2,
                    gravity: 0.2,
                    size: 12,
                    color: '#2196F3',
                    text: '💧',
                    wobble: 0,
                    wobbleSpeed: 0.1
                };

            case 'sparkle':
                return {
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 3 - 1,
                    gravity: -0.05,
                    size: 10,
                    color: '#FFD700',
                    text: '✨',
                    twinkle: 0,
                    twinkleSpeed: 0.2
                };

            case 'leaf':
                return {
                    vx: (Math.random() - 0.5) * 4,
                    vy: -Math.random() * 2 - 1,
                    gravity: 0.05,
                    size: 12,
                    color: '#8BC34A',
                    text: '🍃',
                    sway: 0,
                    swaySpeed: 0.1,
                    swayAmount: 2
                };

            case 'harvest':
                return {
                    vx: (Math.random() - 0.5) * 5,
                    vy: -Math.random() * 5 - 3,
                    gravity: 0.25,
                    size: 18,
                    color: options.color || '#FF9800',
                    text: options.text || '🥔',
                    bounce: 0.6,
                    rotation: 0,
                    rotationSpeed: Math.random() * 0.3 - 0.15
                };

            case 'level':
                return {
                    vx: 0,
                    vy: -1,
                    gravity: 0,
                    size: 24,
                    color: '#FFD700',
                    text: '⭐',
                    pulse: 0,
                    pulseSpeed: 0.15,
                    maxLife: 3.0
                };

            case 'achievement':
                return {
                    vx: (Math.random() - 0.5) * 2,
                    vy: -Math.random() * 2 - 1,
                    gravity: 0,
                    size: 20,
                    color: '#FFD700',
                    text: '🏆',
                    float: 0,
                    floatSpeed: 0.08,
                    maxLife: 4.0
                };

            case 'magic':
                return {
                    vx: (Math.random() - 0.5) * 8,
                    vy: (Math.random() - 0.5) * 8,
                    gravity: 0,
                    size: 8,
                    color: this.getRandomMagicColor(),
                    text: '⭐',
                    spiral: 0,
                    spiralSpeed: 0.2,
                    spiralRadius: 50
                };

            default:
                return {
                    vx: 0,
                    vy: -2,
                    gravity: 0.1,
                    size: 12,
                    color: '#FFFFFF',
                    text: '•'
                };
        }
    }

    getRandomMagicColor() {
        const colors = ['#FF6B9D', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // Update particles
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update physics
            particle.vy += particle.gravity;
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Update special effects based on type
            this.updateSpecialEffects(particle);

            // Update life
            particle.life -= 1 / (particle.maxLife * 60); // Assuming 60 FPS

            // Handle bouncing
            if (particle.bounce && particle.y > window.innerHeight - 50) {
                particle.y = window.innerHeight - 50;
                particle.vy *= -particle.bounce;
                particle.bounce *= 0.8; // Reduce bounce over time
            }

            // Remove dead particles
            if (particle.life <= 0 || particle.y > window.innerHeight + 100) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateSpecialEffects(particle) {
        switch (particle.type) {
            case 'coin':
                particle.rotation += particle.rotationSpeed;
                break;

            case 'plant':
                particle.scale = Math.min(particle.scale + particle.scaleSpeed, 1.0);
                break;

            case 'water':
                particle.wobble += particle.wobbleSpeed;
                particle.x += Math.sin(particle.wobble) * 0.5;
                break;

            case 'sparkle':
                particle.twinkle += particle.twinkleSpeed;
                particle.size = 8 + Math.sin(particle.twinkle) * 4;
                break;

            case 'leaf':
                particle.sway += particle.swaySpeed;
                particle.x += Math.sin(particle.sway) * particle.swayAmount * particle.life;
                break;

            case 'harvest':
                particle.rotation += particle.rotationSpeed;
                break;

            case 'level':
                particle.pulse += particle.pulseSpeed;
                particle.size = 20 + Math.sin(particle.pulse) * 8;
                break;

            case 'achievement':
                particle.float += particle.floatSpeed;
                particle.y += Math.sin(particle.float) * 0.5;
                break;

            case 'magic':
                particle.spiral += particle.spiralSpeed;
                particle.x += Math.cos(particle.spiral) * 2;
                particle.y += Math.sin(particle.spiral) * 2;
                break;
        }
    }

    // Render particles
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            this.ctx.save();
            
            // Set opacity based on life
            this.ctx.globalAlpha = particle.life;
            
            // Move to particle position
            this.ctx.translate(particle.x, particle.y);
            
            // Apply rotation if needed
            if (particle.rotation) {
                this.ctx.rotate(particle.rotation);
            }
            
            // Apply scale if needed
            if (particle.scale) {
                this.ctx.scale(particle.scale, particle.scale);
            }
            
            // Draw particle
            this.ctx.font = `${particle.size}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = particle.color;
            this.ctx.fillText(particle.text, 0, particle.size / 4);
            
            this.ctx.restore();
        });
    }

    // Animation loop
    animate() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.animate());
    }

    // Create burst effects
    createBurst(x, y, type, count = 5, options = {}) {
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.createParticle(
                    x + (Math.random() - 0.5) * 20,
                    y + (Math.random() - 0.5) * 20,
                    type,
                    options
                );
            }, i * 100);
        }
    }

    // Create explosion effect
    createExplosion(x, y, colors = ['#FFD700', '#FF6B9D', '#45B7D1']) {
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const speed = 3 + Math.random() * 4;
            
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.2,
                size: 6,
                color: colors[Math.floor(Math.random() * colors.length)],
                text: '●',
                life: 1.0,
                maxLife: 1.5,
                type: 'explosion'
            });
        }
    }

    // Create rain effect
    createRain(intensity = 0.1) {
        if (Math.random() < intensity) {
            this.createParticle(
                Math.random() * window.innerWidth,
                -10,
                'water',
                { maxLife: 3.0, gravity: 0.5 }
            );
        }
    }

    // Create floating leaves
    createFloatingLeaves() {
        if (Math.random() < 0.02) {
            this.createParticle(
                -20,
                Math.random() * window.innerHeight * 0.8,
                'leaf',
                {
                    vx: 1 + Math.random() * 2,
                    vy: (Math.random() - 0.5) * 2,
                    maxLife: 8.0
                }
            );
        }
    }

    // Seasonal effects
    startSeasonalEffects() {
        setInterval(() => {
            this.createFloatingLeaves();
        }, 100);
    }

    // Magic trail effect for cursor
    createMagicTrail(x, y) {
        if (Math.random() < 0.3) {
            this.createParticle(x, y, 'magic', { maxLife: 1.0 });
        }
    }

    // Clear all particles
    clear() {
        this.particles = [];
    }

    // Get particle count
    getCount() {
        return this.particles.length;
    }
}

// Export for global use
window.ParticleSystem = ParticleSystem;