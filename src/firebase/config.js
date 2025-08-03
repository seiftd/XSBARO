const admin = require('firebase-admin');
require('dotenv').config();

class FirebaseConfig {
    constructor() {
        this.initialized = false;
        this.db = null;
    }

    async initialize() {
        try {
            if (this.initialized) {
                return this.db;
            }

            // Initialize Firebase Admin SDK
            if (!admin.apps.length) {
                // In production, you would use a service account key file
                // For now, we'll use a basic configuration
                admin.initializeApp({
                    projectId: process.env.FIREBASE_PROJECT_ID || 'sbrfarm-project',
                    databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://sbrfarm-project-default-rtdb.firebaseio.com'
                });
            }

            this.db = admin.firestore();
            this.realtime = admin.database();
            this.initialized = true;

            console.log('🔥 Firebase initialized successfully');
            return this.db;
        } catch (error) {
            console.error('Firebase initialization error:', error);
            // Continue without Firebase for now
            this.initialized = false;
            return null;
        }
    }

    async saveUserData(telegramId, userData) {
        try {
            if (!this.initialized) return;

            await this.db.collection('users').doc(telegramId.toString()).set({
                ...userData,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Firebase save user data error:', error);
        }
    }

    async saveGameData(telegramId, gameData) {
        try {
            if (!this.initialized) return;

            await this.db.collection('gameData').doc(telegramId.toString()).set({
                ...gameData,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (error) {
            console.error('Firebase save game data error:', error);
        }
    }

    async logEvent(eventType, data) {
        try {
            if (!this.initialized) return;

            await this.db.collection('events').add({
                type: eventType,
                data: data,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Firebase log event error:', error);
        }
    }

    async getRealTimeData(path) {
        try {
            if (!this.initialized) return null;

            const snapshot = await this.realtime.ref(path).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('Firebase get realtime data error:', error);
            return null;
        }
    }

    async setRealTimeData(path, data) {
        try {
            if (!this.initialized) return;

            await this.realtime.ref(path).set({
                ...data,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        } catch (error) {
            console.error('Firebase set realtime data error:', error);
        }
    }

    // Analytics methods
    async logUserAction(telegramId, action, details = {}) {
        await this.logEvent('user_action', {
            telegram_id: telegramId,
            action: action,
            details: details
        });
    }

    async logPayment(telegramId, amount, currency, type) {
        await this.logEvent('payment', {
            telegram_id: telegramId,
            amount: amount,
            currency: currency,
            type: type
        });
    }

    async logGameEvent(telegramId, eventType, details = {}) {
        await this.logEvent('game_event', {
            telegram_id: telegramId,
            event_type: eventType,
            details: details
        });
    }

    // Performance monitoring
    async logPerformance(metric, value, metadata = {}) {
        await this.logEvent('performance', {
            metric: metric,
            value: value,
            metadata: metadata
        });
    }

    // Error logging
    async logError(error, context = {}) {
        await this.logEvent('error', {
            message: error.message,
            stack: error.stack,
            context: context
        });
    }
}

// Export singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;