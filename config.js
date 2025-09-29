// EdgeFinder EV + Arbitrage Configuration
const EdgeFinderConfig = {
    // Environment Configuration
    env: {
        ODDS_API_KEY: process.env.ODDS_API_KEY || '',
        PLAYER_API_KEY: process.env.PLAYER_API_KEY || '',
        BASELINE_BOOK: process.env.BASELINE_BOOK || 'pinnacle',
        SUPPORT_BOOKS: (process.env.SUPPORT_BOOKS || 'pinnacle,draftkings,fanduel,betmgm,caesars,pointsbet,betrivers').split(','),
        DEFAULT_SPORTS: (process.env.DEFAULT_SPORTS || 'NFL,NBA,MLB,NHL').split(','),
        ENABLE_PROPS: process.env.ENABLE_PROPS !== 'false'
    },

    // API Configuration
    api: {
        baseURL: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
        timeout: 10000,
        retries: 3,
        pollInterval: 30000 // 30 seconds
    },

    // Supported Sportsbooks
    sportsbooks: {
        pinnacle: { name: 'Pinnacle', color: '#FFD700', isBaseline: true },
        draftkings: { name: 'DraftKings', color: '#FF6B35', affiliate: 'dk' },
        fanduel: { name: 'FanDuel', color: '#1E3A8A', affiliate: 'fd' },
        betmgm: { name: 'BetMGM', color: '#B8860B', affiliate: 'mgm' },
        caesars: { name: 'Caesars', color: '#DAA520', affiliate: 'cz' },
        pointsbet: { name: 'PointsBet', color: '#FF4444', affiliate: 'pb' },
        betrivers: { name: 'BetRivers', color: '#0066CC', affiliate: 'br' }
    },

    // Sports Configuration
    sports: {
        NFL: { key: 'americanfootball_nfl', name: 'NFL', icon: '🏈', season: '2024' },
        NBA: { key: 'basketball_nba', name: 'NBA', icon: '🏀', season: '2024-25' },
        MLB: { key: 'baseball_mlb', name: 'MLB', icon: '⚾', season: '2024' },
        NHL: { key: 'icehockey_nhl', name: 'NHL', icon: '🏒', season: '2024-25' }
    },

    // Market Types
    markets: {
        h2h: { name: 'Moneyline', key: 'h2h', twoWay: true },
        spreads: { name: 'Point Spread', key: 'spreads', twoWay: true },
        totals: { name: 'Over/Under', key: 'totals', twoWay: true },
        props: { name: 'Player Props', key: 'props', twoWay: true }
    },

    // Default Settings
    defaults: {
        baselineBook: 'pinnacle',
        evThresholdPercent: 2.0,
        showArbsOnly: false,
        includeProps: true,
        hiddenBooks: [],
        timeWindowHours: 24,
        currency: 'USD',
        fractionalOdds: false,
        minArbPercent: 1.5,
        maxStake: 1000
    },

    // UI Configuration
    ui: {
        theme: 'dark',
        animations: true,
        virtualizeThreshold: 100,
        refreshInterval: 30000,
        tooltipDelay: 500
    },

    // Copy & Messaging
    copy: {
        tooltips: {
            ev: "EV%: Edge vs. fair (no-vig) price from baseline.",
            baseline: "Baseline: Pinnacle no-vig fair used to compare books.",
            arb: "Arb: Opposite prices across books create guaranteed profit.",
            hold: "Hold%: Bookmaker margin; lower = sharper pricing."
        },
        explainers: {
            positiveEV: "Bets with positive expected value vs. fair market price",
            arbitrage: "Risk-free profit opportunities across different sportsbooks",
            props: "Player prop bets with value vs. fair market pricing"
        }
    },

    // Test Fixtures
    fixtures: {
        mlbMoneyline: {
            id: 'test_mlb_1',
            sport: 'MLB',
            commence_time: '2024-04-15T19:10:00Z',
            home_team: 'New York Yankees',
            away_team: 'Boston Red Sox',
            bookmakers: [
                {
                    key: 'pinnacle',
                    title: 'Pinnacle',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'New York Yankees', price: 1.95 },
                            { name: 'Boston Red Sox', price: 1.95 }
                        ]
                    }]
                },
                {
                    key: 'draftkings',
                    title: 'DraftKings',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'New York Yankees', price: 1.85 },
                            { name: 'Boston Red Sox', price: 2.10 }
                        ]
                    }]
                }
            ]
        },
        nbaArb: {
            id: 'test_nba_1',
            sport: 'NBA',
            commence_time: '2024-04-15T20:00:00Z',
            home_team: 'Los Angeles Lakers',
            away_team: 'Boston Celtics',
            bookmakers: [
                {
                    key: 'pinnacle',
                    title: 'Pinnacle',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Los Angeles Lakers', price: 2.20 },
                            { name: 'Boston Celtics', price: 1.75 }
                        ]
                    }]
                },
                {
                    key: 'fanduel',
                    title: 'FanDuel',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Los Angeles Lakers', price: 2.40 },
                            { name: 'Boston Celtics', price: 1.65 }
                        ]
                    }]
                }
            ]
        }
    }
};

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeFinderConfig;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.EdgeFinderConfig = EdgeFinderConfig;
}