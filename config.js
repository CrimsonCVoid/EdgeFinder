// EdgeFinder Pro - Production Configuration
const EdgeFinderConfig = {
    // Environment Configuration
    env: {
        ODDS_API_KEY: process.env.ODDS_API_KEY || '',
        PLAYER_API_KEY: process.env.PLAYER_API_KEY || '',
        BASELINE_BOOK: process.env.BASELINE_BOOK || 'pinnacle',
        SUPPORT_BOOKS: (process.env.SUPPORT_BOOKS || 'pinnacle,draftkings,fanduel,betmgm,caesars,pointsbet,betrivers').split(','),
        DEFAULT_SPORTS: (process.env.DEFAULT_SPORTS || 'NFL,NBA,MLB,NHL,Soccer').split(','),
        ENABLE_PROPS: process.env.ENABLE_PROPS !== 'false',
        ENABLE_AFFILIATES: process.env.ENABLE_AFFILIATES === 'true'
    },

    // API Configuration
    api: {
        baseURL: process.env.NODE_ENV === 'production' ? 'https://your-domain.com' : 'http://localhost:3000',
        timeout: 10000,
        retries: 3,
        pollInterval: 30000, // 30 seconds
        cacheTimeout: 300000 // 5 minutes
    },

    // Supported Sportsbooks
    sportsbooks: {
        pinnacle: { 
            name: 'Pinnacle', 
            color: '#FFD700', 
            isBaseline: true,
            affiliate: null
        },
        draftkings: { 
            name: 'DraftKings', 
            color: '#FF6B35', 
            affiliate: 'dk',
            limits: { min: 1, max: 5000 }
        },
        fanduel: { 
            name: 'FanDuel', 
            color: '#1E3A8A', 
            affiliate: 'fd',
            limits: { min: 1, max: 3000 }
        },
        betmgm: { 
            name: 'BetMGM', 
            color: '#B8860B', 
            affiliate: 'mgm',
            limits: { min: 1, max: 2500 }
        },
        caesars: { 
            name: 'Caesars', 
            color: '#DAA520', 
            affiliate: 'cz',
            limits: { min: 1, max: 2000 }
        },
        pointsbet: { 
            name: 'PointsBet', 
            color: '#FF4444', 
            affiliate: 'pb',
            limits: { min: 1, max: 1500 }
        },
        betrivers: { 
            name: 'BetRivers', 
            color: '#0066CC', 
            affiliate: 'br',
            limits: { min: 1, max: 1000 }
        }
    },

    // Sports Configuration
    sports: {
        NFL: { 
            key: 'americanfootball_nfl', 
            name: 'NFL', 
            icon: '🏈', 
            season: '2024',
            leagues: ['NFL'],
            markets: ['h2h', 'spreads', 'totals', 'props']
        },
        NBA: { 
            key: 'basketball_nba', 
            name: 'NBA', 
            icon: '🏀', 
            season: '2024-25',
            leagues: ['NBA'],
            markets: ['h2h', 'spreads', 'totals', 'props']
        },
        MLB: { 
            key: 'baseball_mlb', 
            name: 'MLB', 
            icon: '⚾', 
            season: '2024',
            leagues: ['MLB'],
            markets: ['h2h', 'spreads', 'totals', 'props']
        },
        NHL: { 
            key: 'icehockey_nhl', 
            name: 'NHL', 
            icon: '🏒', 
            season: '2024-25',
            leagues: ['NHL'],
            markets: ['h2h', 'spreads', 'totals', 'props']
        },
        Soccer: { 
            key: 'soccer_epl', 
            name: 'Soccer', 
            icon: '⚽', 
            season: '2024-25',
            leagues: ['EPL', 'Champions League', 'MLS'],
            markets: ['h2h', 'spreads', 'totals', 'props']
        }
    },

    // Market Types
    markets: {
        h2h: { name: 'Moneyline', key: 'h2h', twoWay: true, threeWay: false },
        spreads: { name: 'Point Spread', key: 'spreads', twoWay: true, hasAltLines: true },
        totals: { name: 'Over/Under', key: 'totals', twoWay: true, hasAltLines: true },
        props: { name: 'Player Props', key: 'props', twoWay: true, hasPlayer: true }
    },

    // Default Settings
    defaults: {
        baselineBook: 'pinnacle',
        evThresholdPercent: 2.0,
        showEVOnly: false,
        showArbsOnly: false,
        includeProps: true,
        showSteam: false,
        showMiddles: false,
        hiddenBooks: [],
        timeWindowHours: 24,
        currency: 'USD',
        oddsFormat: 'american', // american, decimal, fractional
        kellyFraction: 0.25,
        minArbPercent: 1.5,
        maxStake: 1000,
        roundingPrecision: 2
    },

    // UI Configuration
    ui: {
        theme: 'dark',
        animations: true,
        virtualizeThreshold: 100,
        refreshInterval: 30000,
        tooltipDelay: 500,
        debounceMs: 300,
        renderTargetMs: 150
    },

    // Analytics Configuration
    analytics: {
        trackEvents: true,
        trackErrors: true,
        trackPerformance: true,
        trackConversions: false
    },

    // Copy & Messaging
    copy: {
        tooltips: {
            ev: "EV%: Edge vs. fair (no-vig) price from baseline.",
            baseline: "Baseline: Pinnacle no-vig fair used to compare books.",
            arb: "Arb: Opposite prices across books create guaranteed profit.",
            hold: "Hold%: Bookmaker margin; lower = sharper pricing.",
            kelly: "Kelly: Optimal bet size as % of bankroll for long-term growth.",
            steam: "Steam: Sharp money moved the line first.",
            clv: "CLV: Closing Line Value - how your entry compares to final odds.",
            middle: "Middle: Bet both sides of different lines for win-win window."
        },
        explainers: {
            positiveEV: "Bets with positive expected value vs. fair market price",
            arbitrage: "Risk-free profit opportunities across different sportsbooks",
            props: "Player prop bets with value vs. fair market pricing",
            movement: "Line movement tracking and steam detection"
        },
        howToArb: {
            title: "How to Book an Arbitrage",
            steps: [
                "Pick opposing sides at the listed sportsbooks",
                "Use our calculator to split your total risk amount", 
                "Confirm limits and place both bets promptly",
                "Aim for ≥1.5% profit after rounding and fees"
            ]
        }
    },

    // Test Fixtures
    fixtures: {
        moneyline_ml_sample: {
            id: 'test_nfl_1',
            sport: 'NFL',
            league: 'NFL',
            commence_time: '2024-12-15T20:20:00Z',
            home_team: 'Kansas City Chiefs',
            away_team: 'Buffalo Bills',
            bookmakers: [
                {
                    key: 'pinnacle',
                    title: 'Pinnacle',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Kansas City Chiefs', price: 1.95 },
                            { name: 'Buffalo Bills', price: 1.95 }
                        ]
                    }]
                },
                {
                    key: 'draftkings',
                    title: 'DraftKings',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Kansas City Chiefs', price: 1.85 },
                            { name: 'Buffalo Bills', price: 2.10 }
                        ]
                    }]
                },
                {
                    key: 'fanduel',
                    title: 'FanDuel',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Kansas City Chiefs', price: 2.20 },
                            { name: 'Buffalo Bills', price: 1.75 }
                        ]
                    }]
                }
            ]
        },
        
        soccer_3way_sample: {
            id: 'test_soccer_1',
            sport: 'Soccer',
            league: 'EPL',
            commence_time: '2024-12-15T15:00:00Z',
            home_team: 'Manchester City',
            away_team: 'Arsenal',
            bookmakers: [
                {
                    key: 'pinnacle',
                    title: 'Pinnacle',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Manchester City', price: 2.10 },
                            { name: 'Draw', price: 3.40 },
                            { name: 'Arsenal', price: 3.20 }
                        ]
                    }]
                },
                {
                    key: 'betmgm',
                    title: 'BetMGM',
                    markets: [{
                        key: 'h2h',
                        outcomes: [
                            { name: 'Manchester City', price: 2.25 },
                            { name: 'Draw', price: 3.60 },
                            { name: 'Arsenal', price: 2.90 }
                        ]
                    }]
                }
            ]
        },

        props_sample: {
            id: 'test_nba_props_1',
            sport: 'NBA',
            league: 'NBA',
            commence_time: '2024-12-15T20:00:00Z',
            home_team: 'Los Angeles Lakers',
            away_team: 'Boston Celtics',
            players: [
                {
                    id: 'lebron_james',
                    name: 'LeBron James',
                    team: 'Los Angeles Lakers',
                    position: 'SF',
                    photo: 'https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/2544.png',
                    recentForm: {
                        last5Games: [
                            { points: 28, rebounds: 8, assists: 11 },
                            { points: 31, rebounds: 6, assists: 9 },
                            { points: 25, rebounds: 12, assists: 8 },
                            { points: 33, rebounds: 7, assists: 10 },
                            { points: 29, rebounds: 9, assists: 12 }
                        ],
                        averages: { points: 29.2, rebounds: 8.4, assists: 10.0 }
                    },
                    props: [
                        {
                            market: 'Points O/U',
                            line: 27.5,
                            bookmakers: [
                                { book: 'draftkings', over: 1.90, under: 1.90 },
                                { book: 'fanduel', over: 1.95, under: 1.85 }
                            ]
                        }
                    ]
                },
                {
                    id: 'jayson_tatum',
                    name: 'Jayson Tatum',
                    team: 'Boston Celtics',
                    position: 'SF',
                    photo: 'https://ak-static.cms.nba.com/wp-content/uploads/headshots/nba/latest/260x190/1628369.png',
                    recentForm: {
                        last5Games: [
                            { points: 32, rebounds: 7, assists: 5 },
                            { points: 28, rebounds: 9, assists: 6 },
                            { points: 35, rebounds: 6, assists: 4 },
                            { points: 30, rebounds: 8, assists: 7 },
                            { points: 27, rebounds: 10, assists: 5 }
                        ],
                        averages: { points: 30.4, rebounds: 8.0, assists: 5.4 }
                    },
                    props: [
                        {
                            market: 'Points O/U',
                            line: 28.5,
                            bookmakers: [
                                { book: 'betmgm', over: 1.85, under: 1.95 },
                                { book: 'caesars', over: 1.92, under: 1.88 }
                            ]
                        }
                    ]
                }
            ]
        },

        movement_series: [
            { timestamp: '2024-12-15T10:00:00Z', odds: { home: 1.95, away: 1.95 } },
            { timestamp: '2024-12-15T11:00:00Z', odds: { home: 1.90, away: 2.00 } },
            { timestamp: '2024-12-15T12:00:00Z', odds: { home: 1.88, away: 2.02 } },
            { timestamp: '2024-12-15T13:00:00Z', odds: { home: 1.85, away: 2.05 } },
            { timestamp: '2024-12-15T14:00:00Z', odds: { home: 1.87, away: 2.03 } },
            { timestamp: '2024-12-15T15:00:00Z', odds: { home: 1.90, away: 2.00 } },
            { timestamp: '2024-12-15T16:00:00Z', odds: { home: 1.92, away: 1.98 } },
            { timestamp: '2024-12-15T17:00:00Z', odds: { home: 1.95, away: 1.95 } },
            { timestamp: '2024-12-15T18:00:00Z', odds: { home: 1.93, away: 1.97 } },
            { timestamp: '2024-12-15T19:00:00Z', odds: { home: 1.91, away: 1.99 } }
        ]
    },

    // Feature Flags
    features: {
        enableProps: true,
        enableMovement: true,
        enableKelly: true,
        enableCLV: true,
        enableSteam: true,
        enableMiddles: true,
        enableExport: true,
        enableAffiliates: false,
        enablePremium: false
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