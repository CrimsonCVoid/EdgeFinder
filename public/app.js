// EdgeFinder Pro - Modern Sports Analytics Dashboard
class EdgeFinderPro {
    constructor() {
        this.baseURL = window.location.origin;
        this.cache = new Map();
        this.currentSection = 'dashboard';
        this.animationObserver = null;
        this.init();
    }

    async init() {
        this.showLoadingScreen();
        await this.initializeApp();
        this.setupEventListeners();
        this.setupAnimations();
        this.checkConnection();
        this.hideLoadingScreen();
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.remove('hidden');
    }

    async hideLoadingScreen() {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Minimum loading time
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        loadingScreen.classList.add('hidden');
        app.classList.remove('hidden');
    }

    async initializeApp() {
        // Initialize dashboard stats
        await this.updateDashboardStats();
        
        // Load initial data
        this.loadDashboard();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // League cards
        document.querySelectorAll('.league-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const league = e.currentTarget.dataset.league;
                this.selectLeague(league);
            });
        });

        // Controls
        this.setupControlListeners();
        
        // Modal
        this.setupModalListeners();

        // Range input
        const priorWeight = document.getElementById('priorWeight');
        const priorWeightValue = document.getElementById('priorWeightValue');
        if (priorWeight && priorWeightValue) {
            priorWeight.addEventListener('input', (e) => {
                priorWeightValue.textContent = e.target.value;
            });
        }
    }

    setupControlListeners() {
        // Odds controls
        const fetchOddsBtn = document.getElementById('fetchOdds');
        if (fetchOddsBtn) {
            fetchOddsBtn.addEventListener('click', () => this.fetchOdds());
        }

        // Players controls
        const fetchPlayersBtn = document.getElementById('fetchPlayers');
        if (fetchPlayersBtn) {
            fetchPlayersBtn.addEventListener('click', () => this.fetchPlayers());
        }

        // Team buttons
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const league = e.currentTarget.dataset.league;
                const id = e.currentTarget.dataset.id;
                this.selectTeam(league, id);
            });
        });

        // Analytics controls
        const calculateEVBtn = document.getElementById('calculateEV');
        if (calculateEVBtn) {
            calculateEVBtn.addEventListener('click', () => this.calculateEV());
        }
    }

    setupModalListeners() {
        const modal = document.getElementById('playerModal');
        const closeBtn = modal.querySelector('.modal-close');
        
        closeBtn.addEventListener('click', () => this.closeModal());
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    setupAnimations() {
        // Intersection Observer for scroll animations
        this.animationObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        }, { threshold: 0.1 });

        // Observe animated elements
        document.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    switchSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        this.currentSection = sectionName;

        // Load section-specific data
        this.loadSectionData(sectionName);
    }

    loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'odds':
                // Odds data loaded on demand
                break;
            case 'players':
                // Players data loaded on demand
                break;
            case 'analytics':
                // Analytics data loaded on demand
                break;
        }
    }

    async loadDashboard() {
        await this.updateDashboardStats();
    }

    async updateDashboardStats() {
        try {
            const response = await this.fetchWithCache('/health', 30000); // 30s cache
            
            // Update connection status
            this.updateConnectionStatus(response.ok);
            
            if (response.ok) {
                const data = await response.json();
                
                // Update stats (mock data for now)
                document.getElementById('totalGames').textContent = '12';
                document.getElementById('positiveEV').textContent = '3';
                document.getElementById('totalBooks').textContent = '40+';
                document.getElementById('totalLeagues').textContent = '8';
            }
        } catch (error) {
            console.error('Failed to update dashboard stats:', error);
            this.updateConnectionStatus(false);
        }
    }

    updateConnectionStatus(isConnected) {
        const statusElement = document.getElementById('connectionStatus');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span');

        if (isConnected) {
            dot.className = 'status-dot connected';
            text.textContent = 'Connected';
        } else {
            dot.className = 'status-dot error';
            text.textContent = 'Connection Error';
        }
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            this.updateConnectionStatus(response.ok);
        } catch (error) {
            this.updateConnectionStatus(false);
        }
    }

    selectLeague(league) {
        // Update odds section
        document.getElementById('oddsLeague').value = league;
        
        // Switch to odds section
        this.switchSection('odds');
        
        // Auto-fetch odds
        setTimeout(() => this.fetchOdds(), 500);
    }

    selectTeam(league, id) {
        document.getElementById('playersLeague').value = league;
        document.getElementById('teamId').value = id;
        
        // Switch to players section
        this.switchSection('players');
        
        // Auto-fetch players
        setTimeout(() => this.fetchPlayers(), 500);
    }

    async fetchOdds() {
        const league = document.getElementById('oddsLeague').value;
        const market = document.getElementById('oddsMarket').value;
        const resultsContainer = document.getElementById('oddsResults');

        this.showLoading(resultsContainer);

        try {
            const response = await fetch(`${this.baseURL}/odds/${league}?markets=${market}&region=us`);
            const data = await response.json();

            if (data.error) {
                this.showError(resultsContainer, data.error);
                return;
            }

            if (!data.data || data.data.length === 0) {
                this.showPlaceholder(resultsContainer, 'No odds available', 'Try a different league or check back later');
                return;
            }

            this.displayOdds(data.data, resultsContainer);
        } catch (error) {
            console.error('Failed to fetch odds:', error);
            this.showError(resultsContainer, 'Failed to fetch odds. Please try again.');
        }
    }

    displayOdds(oddsData, container) {
        let html = '<div class="odds-grid">';
        
        oddsData.forEach(event => {
            html += `
                <div class="odds-event" data-animate="fadeInUp">
                    <div class="event-header">
                        <h3>${event.home_team} vs ${event.away_team}</h3>
                        <p class="event-time">${new Date(event.commence_time).toLocaleString()}</p>
                    </div>
                    <div class="bookmakers-grid">
            `;

            event.bookmakers?.forEach(bookmaker => {
                const market = bookmaker.markets?.[0];
                if (market && market.outcomes) {
                    html += `
                        <div class="bookmaker-card">
                            <h4>${bookmaker.title}</h4>
                            <div class="outcomes">
                    `;
                    
                    market.outcomes.forEach(outcome => {
                        const odds = this.formatOdds(outcome.price);
                        html += `
                            <div class="outcome">
                                <span class="team">${outcome.name}</span>
                                <span class="odds">${odds}</span>
                            </div>
                        `;
                    });

                    html += `
                            </div>
                        </div>
                    `;
                }
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        
        // Re-observe new animated elements
        container.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    async fetchPlayers() {
        const league = document.getElementById('playersLeague').value;
        const teamId = document.getElementById('teamId').value.trim();
        const resultsContainer = document.getElementById('playersResults');

        if (!teamId) {
            this.showError(resultsContainer, 'Please enter a Team/Player ID');
            return;
        }

        this.showLoading(resultsContainer);

        try {
            const response = await fetch(`${this.baseURL}/stats/${league}/${teamId}`);
            const data = await response.json();

            if (data.error) {
                this.showError(resultsContainer, data.error);
                return;
            }

            this.displayPlayers(data.data, resultsContainer, league);
        } catch (error) {
            console.error('Failed to fetch players:', error);
            this.showError(resultsContainer, 'Failed to fetch players. Please try again.');
        }
    }

    displayPlayers(playersData, container, league) {
        if (league === 'mlb' && playersData.teams) {
            // Handle MLB team data
            const team = playersData.teams[0];
            this.displayMLBTeam(team, container);
        } else if (playersData.roster) {
            // Handle roster data
            this.displayRoster(playersData.roster, container);
        } else {
            // Handle raw stats data
            this.displayRawStats(playersData, container);
        }
    }

    displayMLBTeam(team, container) {
        let html = `
            <div class="team-header" data-animate="fadeInUp">
                <h2>${team.name}</h2>
                <p>${team.division?.name || ''} | ${team.league?.name || ''}</p>
            </div>
            <div class="players-grid">
        `;

        // Mock player data since we don't have roster in team endpoint
        const mockPlayers = [
            { id: 1, name: 'Player 1', position: 'P', number: '1' },
            { id: 2, name: 'Player 2', position: 'C', number: '2' },
            { id: 3, name: 'Player 3', position: '1B', number: '3' },
        ];

        mockPlayers.forEach((player, index) => {
            const photoUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/w_300,h_300,q_auto:best,f_auto/v1/people/${player.id}/headshot/67/current`;
            
            html += `
                <div class="player-card" data-animate="fadeInUp" style="animation-delay: ${index * 0.1}s" onclick="edgeFinderPro.showPlayerModal(${player.id}, '${player.name}')">
                    <img class="player-photo" src="${photoUrl}" alt="${player.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMUExRjJFIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiM2QjcyODAiLz4KPHBhdGggZD0iTTEwMCAyMDBDMTAwIDE3Mi4zODYgMTIyLjM4NiAxNTAgMTUwIDE1MFMyMDAgMTcyLjM4NiAyMDAgMjAwVjI1MEgxMDBWMjAwWiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K'">
                    <div class="player-info">
                        <div class="player-number">#${player.number}</div>
                        <div class="player-name">${player.name}</div>
                        <div class="player-position">${player.position}</div>
                        <div class="player-stats">
                            <span>AVG: .285</span>
                            <span>HR: 12</span>
                            <span>RBI: 45</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        
        // Re-observe new animated elements
        container.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    displayRoster(roster, container) {
        let html = '<div class="players-grid">';
        
        roster.forEach((player, index) => {
            const photoUrl = `https://img.mlbstatic.com/mlb-photos/image/upload/w_300,h_300,q_auto:best,f_auto/v1/people/${player.person.id}/headshot/67/current`;
            
            html += `
                <div class="player-card" data-animate="fadeInUp" style="animation-delay: ${index * 0.1}s" onclick="edgeFinderPro.showPlayerModal(${player.person.id}, '${player.person.fullName}')">
                    <img class="player-photo" src="${photoUrl}" alt="${player.person.fullName}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjMUExRjJFIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iNDAiIGZpbGw9IiM2QjcyODAiLz4KPHBhdGggZD0iTTEwMCAyMDBDMTAwIDE3Mi4zODYgMTIyLjM4NiAxNTAgMTUwIDE1MFMyMDAgMTcyLjM4NiAyMDAgMjAwVjI1MEgxMDBWMjAwWiIgZmlsbD0iIzZCNzI4MCIvPgo8L3N2Zz4K'">
                    <div class="player-info">
                        <div class="player-number">#${player.jerseyNumber || '—'}</div>
                        <div class="player-name">${player.person.fullName}</div>
                        <div class="player-position">${player.position.name}</div>
                        <div class="player-stats">
                            <span>Click for stats</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        
        // Re-observe new animated elements
        container.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    displayRawStats(statsData, container) {
        const html = `
            <div class="stats-display" data-animate="fadeInUp">
                <h3>Statistics Data</h3>
                <pre class="stats-json">${JSON.stringify(statsData, null, 2)}</pre>
            </div>
        `;
        container.innerHTML = html;
        
        // Re-observe new animated elements
        container.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    async calculateEV() {
        const league = document.getElementById('evLeague').value;
        const eventId = document.getElementById('eventId').value.trim();
        const devigMethod = document.getElementById('devigMethod').value;
        const priorWeight = document.getElementById('priorWeight').value;
        const resultsContainer = document.getElementById('analyticsResults');

        if (!eventId) {
            this.showError(resultsContainer, 'Please enter an Event ID');
            return;
        }

        this.showLoading(resultsContainer);

        try {
            const url = `${this.baseURL}/ev/${league}/${eventId}?devig=${devigMethod}&prior_weight=${priorWeight}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                this.showError(resultsContainer, data.error);
                return;
            }

            this.displayEVResults(data, resultsContainer);
        } catch (error) {
            console.error('Failed to calculate EV:', error);
            this.showError(resultsContainer, 'Failed to calculate EV. Please try again.');
        }
    }

    displayEVResults(evData, container) {
        let html = `
            <div class="ev-results" data-animate="fadeInUp">
                <div class="ev-header">
                    <h3>Expected Value Analysis</h3>
                    <p>Event: ${evData.eventId} | League: ${evData.league.toUpperCase()}</p>
                </div>
        `;

        Object.entries(evData.markets).forEach(([marketKey, bookmakers]) => {
            html += `
                <div class="market-section">
                    <h4>${this.formatMarketName(marketKey)}</h4>
                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th>Bookmaker</th>
                                <th>Selection</th>
                                <th>American Odds</th>
                                <th>Implied %</th>
                                <th>Fair %</th>
                                <th>Blended %</th>
                                <th>EV ($100)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            bookmakers.forEach(bookmaker => {
                bookmaker.selections.forEach(selection => {
                    const evClass = selection.ev_100 > 0 ? 'positive-ev' : 'negative-ev';
                    html += `
                        <tr>
                            <td>${bookmaker.bookmaker}</td>
                            <td>${selection.name}</td>
                            <td>${this.formatOdds(selection.american)}</td>
                            <td>${(selection.implied * 100).toFixed(1)}%</td>
                            <td>${(selection.fair * 100).toFixed(1)}%</td>
                            <td>${(selection.blended * 100).toFixed(1)}%</td>
                            <td class="${evClass}">$${selection.ev_100.toFixed(2)}</td>
                        </tr>
                    `;
                });
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        
        // Re-observe new animated elements
        container.querySelectorAll('[data-animate]').forEach(el => {
            this.animationObserver.observe(el);
        });
    }

    showPlayerModal(playerId, playerName) {
        const modal = document.getElementById('playerModal');
        const content = document.getElementById('playerModalContent');
        
        content.innerHTML = `
            <div class="player-modal-header">
                <h2>${playerName}</h2>
                <p>Player ID: ${playerId}</p>
            </div>
            <div class="player-modal-stats">
                <div class="loading">
                    <div class="loading-spinner-small"></div>
                    <p>Loading player statistics...</p>
                </div>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Load player stats
        this.loadPlayerStats(playerId, content);
    }

    async loadPlayerStats(playerId, container) {
        try {
            // Mock player stats for now
            const mockStats = {
                season: {
                    games: 145,
                    avg: '.285',
                    hits: 156,
                    runs: 78,
                    rbi: 89,
                    hr: 23
                }
            };

            const statsHtml = `
                <div class="player-modal-header">
                    <h2>Player Statistics</h2>
                </div>
                <div class="player-stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Games</span>
                        <span class="stat-value">${mockStats.season.games}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">AVG</span>
                        <span class="stat-value">${mockStats.season.avg}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Hits</span>
                        <span class="stat-value">${mockStats.season.hits}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Runs</span>
                        <span class="stat-value">${mockStats.season.runs}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">RBI</span>
                        <span class="stat-value">${mockStats.season.rbi}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">HR</span>
                        <span class="stat-value">${mockStats.season.hr}</span>
                    </div>
                </div>
            `;

            container.innerHTML = statsHtml;
        } catch (error) {
            console.error('Failed to load player stats:', error);
            container.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>Failed to load player statistics</p>
                </div>
            `;
        }
    }

    closeModal() {
        const modal = document.getElementById('playerModal');
        modal.classList.remove('active');
    }

    // Utility methods
    formatOdds(americanOdds) {
        const odds = parseInt(americanOdds);
        return odds > 0 ? `+${odds}` : `${odds}`;
    }

    formatMarketName(marketKey) {
        const names = {
            'h2h': 'Head to Head',
            'spreads': 'Point Spreads',
            'totals': 'Over/Under'
        };
        return names[marketKey] || marketKey;
    }

    showLoading(container) {
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner-small"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    showError(container, message) {
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--error); margin-bottom: 1rem;"></i>
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showPlaceholder(container, title, message) {
        container.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-info-circle placeholder-icon"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    async fetchWithCache(url, cacheTime = 60000) {
        const cacheKey = url;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            return cached.response;
        }
        
        const response = await fetch(`${this.baseURL}${url}`);
        
        if (response.ok) {
            this.cache.set(cacheKey, {
                response: response.clone(),
                timestamp: Date.now()
            });
        }
        
        return response;
    }
}

// Initialize the app
let edgeFinderPro;
document.addEventListener('DOMContentLoaded', () => {
    edgeFinderPro = new EdgeFinderPro();
});

// Add additional CSS for modal stats
const additionalCSS = `
.player-modal-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-primary);
}

.player-modal-header h2 {
    color: var(--primary);
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
}

.player-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
}

.stat-item {
    background: var(--bg-tertiary);
    padding: 1rem;
    border-radius: var(--radius-md);
    text-align: center;
    border: 1px solid var(--border-primary);
    transition: all var(--transition-normal);
}

.stat-item:hover {
    border-color: var(--primary);
    transform: translateY(-2px);
}

.stat-label {
    display: block;
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 0.5rem;
    font-weight: 500;
}

.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
}

.error-message {
    text-align: center;
    padding: 2rem;
    color: var(--error);
}

.error-message h3 {
    margin-bottom: 0.5rem;
    font-size: 1.2rem;
}

.stats-json {
    background: var(--bg-tertiary);
    padding: 1rem;
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 0.9rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    border: 1px solid var(--border-primary);
}

.stats-display h3 {
    color: var(--primary);
    margin-bottom: 1rem;
    text-align: center;
}

.team-header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 2rem;
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-primary);
}

.team-header h2 {
    color: var(--primary);
    font-size: 2rem;
    margin-bottom: 0.5rem;
}

.team-header p {
    color: var(--text-secondary);
    font-size: 1.1rem;
}

.ev-results {
    padding: 2rem;
}

.ev-header {
    text-align: center;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-primary);
}

.ev-header h3 {
    color: var(--primary);
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
}

.market-section {
    margin-bottom: 2rem;
}

.market-section h4 {
    color: var(--secondary);
    font-size: 1.3rem;
    margin-bottom: 1rem;
    text-align: center;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);