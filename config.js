// EdgeFinder Pro Configuration
const EdgeFinderConfig = {
    // API Configuration
    api: {
        baseURL: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
        timeout: 10000,
        retries: 3
    },

    // External API Keys (loaded from environment)
    keys: {
        oddsAPI: process.env.ODDS_API_KEY || '',
        betfairAppKey: process.env.BETFAIR_APP_KEY || '',
        betfairUsername: process.env.BETFAIR_USERNAME || '',
        betfairPassword: process.env.BETFAIR_PASSWORD || '',
        footballDataKey: process.env.FOOTBALL_DATA_KEY || ''
    },

    // Supported Leagues
    leagues: {
        mlb: {
            name: 'Major League Baseball',
            icon: '⚾',
            oddsKey: 'baseball_mlb',
            statsAPI: 'https://statsapi.mlb.com/api/v1',
            seasons: ['2024', '2025']
        },
        nba: {
            name: 'National Basketball Association',
            icon: '🏀',
            oddsKey: 'basketball_nba',
            statsAPI: 'https://stats.nba.com/stats',
            seasons: ['2023-24', '2024-25']
        },
        nfl: {
            name: 'National Football League',
            icon: '🏈',
            oddsKey: 'americanfootball_nfl',
            statsAPI: null,
            seasons: ['2024', '2025']
        },
        nhl: {
            name: 'National Hockey League',
            icon: '🏒',
            oddsKey: 'icehockey_nhl',
            statsAPI: 'https://statsapi.web.nhl.com/api/v1',
            seasons: ['20242025', '20252026']
        },
        epl: {
            name: 'English Premier League',
            icon: '⚽',
            oddsKey: 'soccer_epl',
            statsAPI: 'https://api.football-data.org/v4',
            seasons: ['2024', '2025']
        },
        mls: {
            name: 'Major League Soccer',
            icon: '⚽',
            oddsKey: 'soccer_usa_mls',
            statsAPI: null,
            seasons: ['2024', '2025']
        }
    },

    // Market Types
    markets: {
        h2h: 'Head to Head',
        spreads: 'Point Spreads',
        totals: 'Over/Under',
        props: 'Player Props'
    },

    // De-vig Methods
    devigMethods: {
        proportional: 'Proportional',
        shin: 'Shin Method',
        power: 'Power Method',
        additive: 'Additive Method'
    },

    // Popular Teams (for quick access)
    popularTeams: {
        mlb: [
            { id: 147, name: 'New York Yankees', logo: '⚾' },
            { id: 119, name: 'Los Angeles Dodgers', logo: '⚾' },
            { id: 111, name: 'Boston Red Sox', logo: '⚾' },
            { id: 121, name: 'New York Mets', logo: '⚾' },
            { id: 117, name: 'Houston Astros', logo: '⚾' },
            { id: 112, name: 'Chicago Cubs', logo: '⚾' }
        ],
        nba: [
            { id: 1610612747, name: 'Los Angeles Lakers', logo: '🏀' },
            { id: 1610612738, name: 'Boston Celtics', logo: '🏀' },
            { id: 1610612744, name: 'Golden State Warriors', logo: '🏀' },
            { id: 1610612751, name: 'Brooklyn Nets', logo: '🏀' }
        ],
        nhl: [
            { id: 3, name: 'New York Rangers', logo: '🏒' },
            { id: 6, name: 'Boston Bruins', logo: '🏒' },
            { id: 26, name: 'Los Angeles Kings', logo: '🏒' },
            { id: 1, name: 'New Jersey Devils', logo: '🏒' }
        ]
    },

    // UI Configuration
    ui: {
        theme: 'dark',
        animations: true,
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
        cacheTimeout: 60000, // 1 minute
        loadingDelay: 1500 // Minimum loading screen time
    },

    // Feature Flags
    features: {
        liveOdds: true,
        playerStats: true,
        evCalculations: true,
        betfairIntegration: false,
        arbitrageDetection: true,
        pushNotifications: false,
        darkMode: true,
        mobileApp: false
    },

    // Analytics Configuration
    analytics: {
        enabled: false,
        trackingId: '',
        events: {
            pageView: true,
            oddsRequest: true,
            evCalculation: true,
            playerView: true
        }
    },

    // Error Handling
    errors: {
        retryAttempts: 3,
        retryDelay: 1000,
        showUserFriendlyMessages: true,
        logErrors: true
    },

    // Performance
    performance: {
        enableCaching: true,
        cacheSize: 100,
        preloadData: false,
        lazyLoadImages: true,
        compressionEnabled: true
    },

    // Security
    security: {
        apiKeyEncryption: false,
        rateLimiting: true,
        corsEnabled: true,
        httpsOnly: false
    }
};

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeFinderConfig;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.EdgeFinderConfig = EdgeFinderConfig;
}