// Advanced Sound System for SBRFARM Web Game
class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.musicVolume = 0.3;
        this.sfxVolume = 0.5;
        this.isMuted = false;
        this.backgroundMusic = null;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.preloadSounds();
            this.startBackgroundMusic();
        } catch (error) {
            console.warn('Audio not supported:', error);
        }
    }

    // Create procedural sounds using Web Audio API
    createTone(frequency, duration, type = 'sine', volume = 0.1) {
        if (!this.audioContext || this.isMuted) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume * this.sfxVolume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    // Create complex sound effects
    createComplexSound(frequencies, duration, type = 'sine') {
        if (!this.audioContext || this.isMuted) return;

        frequencies.forEach((freq, index) => {
            setTimeout(() => {
                this.createTone(freq.frequency, freq.duration || 0.2, type, freq.volume || 0.1);
            }, freq.delay || index * 100);
        });
    }

    // Preload sound patterns
    preloadSounds() {
        this.sounds = {
            plant: () => this.createComplexSound([
                { frequency: 400, duration: 0.15, volume: 0.08 },
                { frequency: 600, duration: 0.2, volume: 0.06, delay: 80 },
                { frequency: 800, duration: 0.1, volume: 0.04, delay: 150 }
            ]),

            harvest: () => this.createComplexSound([
                { frequency: 800, duration: 0.2, volume: 0.1 },
                { frequency: 1000, duration: 0.25, volume: 0.08, delay: 100 },
                { frequency: 1200, duration: 0.15, volume: 0.06, delay: 200 }
            ]),

            coin: () => this.createComplexSound([
                { frequency: 1200, duration: 0.1, volume: 0.1, type: 'square' },
                { frequency: 1400, duration: 0.1, volume: 0.08, delay: 50 },
                { frequency: 1600, duration: 0.1, volume: 0.06, delay: 100 }
            ]),

            water: () => this.createComplexSound([
                { frequency: 300, duration: 0.3, volume: 0.06, type: 'sawtooth' },
                { frequency: 250, duration: 0.2, volume: 0.04, delay: 100 },
                { frequency: 350, duration: 0.15, volume: 0.03, delay: 200 }
            ]),

            buy: () => this.createComplexSound([
                { frequency: 600, duration: 0.2, volume: 0.08 },
                { frequency: 800, duration: 0.15, volume: 0.06, delay: 100 }
            ]),

            error: () => this.createComplexSound([
                { frequency: 200, duration: 0.3, volume: 0.1, type: 'sawtooth' },
                { frequency: 180, duration: 0.2, volume: 0.08, delay: 150 }
            ]),

            achievement: () => this.createComplexSound([
                { frequency: 800, duration: 0.2, volume: 0.1 },
                { frequency: 1000, duration: 0.2, volume: 0.08, delay: 100 },
                { frequency: 1200, duration: 0.2, volume: 0.06, delay: 200 },
                { frequency: 1400, duration: 0.3, volume: 0.05, delay: 300 }
            ]),

            levelUp: () => this.createComplexSound([
                { frequency: 523, duration: 0.2, volume: 0.1 }, // C5
                { frequency: 659, duration: 0.2, volume: 0.08, delay: 150 }, // E5
                { frequency: 784, duration: 0.2, volume: 0.06, delay: 300 }, // G5
                { frequency: 1047, duration: 0.4, volume: 0.08, delay: 450 } // C6
            ]),

            button: () => this.createTone(800, 0.1, 'sine', 0.05),

            notification: () => this.createComplexSound([
                { frequency: 880, duration: 0.15, volume: 0.08 },
                { frequency: 1100, duration: 0.15, volume: 0.06, delay: 100 }
            ])
        };
    }

    // Background music using oscillators
    startBackgroundMusic() {
        if (!this.audioContext || this.isMuted) return;

        const melody = [
            { note: 523, duration: 0.5 }, // C5
            { note: 587, duration: 0.5 }, // D5
            { note: 659, duration: 0.5 }, // E5
            { note: 523, duration: 0.5 }, // C5
            { note: 659, duration: 0.5 }, // E5
            { note: 523, duration: 0.5 }, // C5
            { note: 587, duration: 1.0 }, // D5
            { note: 0, duration: 0.5 },   // Rest
        ];

        let currentNote = 0;
        const playMelody = () => {
            if (this.isMuted) {
                setTimeout(playMelody, 1000);
                return;
            }

            const note = melody[currentNote];
            if (note.note > 0) {
                this.createTone(note.note, note.duration, 'sine', 0.02 * this.musicVolume);
            }
            
            currentNote = (currentNote + 1) % melody.length;
            setTimeout(playMelody, note.duration * 1000);
        };

        // Start melody after a delay
        setTimeout(playMelody, 2000);
    }

    // Play sound by name
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    // Set volumes
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
    }

    // Ambient nature sounds
    playAmbientSound() {
        if (!this.audioContext || this.isMuted) return;

        // Create wind sound
        const windNoise = this.audioContext.createBufferSource();
        const windGain = this.audioContext.createGain();
        const windFilter = this.audioContext.createBiquadFilter();

        // Generate noise buffer
        const bufferSize = this.audioContext.sampleRate * 2;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        windNoise.buffer = noiseBuffer;
        windNoise.loop = true;

        windFilter.type = 'lowpass';
        windFilter.frequency.setValueAtTime(300, this.audioContext.currentTime);

        windGain.gain.setValueAtTime(0.01 * this.musicVolume, this.audioContext.currentTime);

        windNoise.connect(windFilter);
        windFilter.connect(windGain);
        windGain.connect(this.audioContext.destination);

        windNoise.start();

        // Stop after 10 seconds
        setTimeout(() => {
            windGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 2);
            setTimeout(() => windNoise.stop(), 2000);
        }, 10000);
    }

    // Bird chirping sounds
    playBirdSounds() {
        if (!this.audioContext || this.isMuted) return;

        const birdFrequencies = [1000, 1200, 800, 1400, 900];
        const bird = birdFrequencies[Math.floor(Math.random() * birdFrequencies.length)];

        this.createComplexSound([
            { frequency: bird, duration: 0.1, volume: 0.03 },
            { frequency: bird * 1.2, duration: 0.08, volume: 0.025, delay: 100 },
            { frequency: bird * 0.8, duration: 0.06, volume: 0.02, delay: 180 }
        ]);
    }

    // Start ambient environment
    startAmbientEnvironment() {
        // Play ambient wind every 30-60 seconds
        const playAmbient = () => {
            this.playAmbientSound();
            setTimeout(playAmbient, 30000 + Math.random() * 30000);
        };

        // Play bird sounds every 10-30 seconds
        const playBirds = () => {
            this.playBirdSounds();
            setTimeout(playBirds, 10000 + Math.random() * 20000);
        };

        setTimeout(playAmbient, 5000);
        setTimeout(playBirds, 8000);
    }
}

// Initialize global sound system
window.SoundSystem = SoundSystem;