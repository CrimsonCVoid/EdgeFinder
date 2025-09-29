// EdgeFinder EV Engine - Frontend JavaScript
class EdgeFinderApp {
    constructor() {
        this.baseURL = window.location.origin;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Odds functionality
        document.getElementById('fetch-odds')?.addEventListener('click', () => {
            this.fetchOdds();
        });

        // EV Calculator
        document.getElementById('calculate-ev')?.addEventListener('click', () => {
            this.calculateEV();
        });

        // Prior weight slider
        const priorSlider = document.getElementById('prior-weight');
        const priorValue = document.getElementById('prior-weight-value');
        if (priorSlider && priorValue) {
            priorSlider.addEventListener('input', (e) => {
                priorValue.textContent = e.target.value;
            });
        }

        // Stats functionality
        document.getElementById('fetch-stats')?.addEventListener('click', () => {
            this.fetchStats();
        });

        // Team example buttons
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const league = e.target.dataset.league;
                const id = e.target.dataset.id;
                document.getElementById('stats-league').value = league;
                document.getElementById('team-id').value = id;
                this.fetchStats();
            });
        });
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Load tab-specific data
        if (tabName === 'dashboard') {
            this.loadDashboard();
        }
    }

    async loadDashboard() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            
            this.updateServiceStatus(data);
            this.updateAPIStatus(data.services);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            this.updateServiceStatus({ ok: false, error: error.message });
        }
    }

    updateServiceStatus(data) {
        const statusElement = document.getElementById('service-status');
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('span:last-child');

        if (data.ok) {
            dot.className = 'status-dot';
            dot.style.background = '#00ff88';
            text.textContent = 'Online';
        } else {
            dot.className = 'status-dot error';
            text.textContent = 'Offline';
        }
    }

    updateAPIStatus(services) {
        const oddsStatus = document.getElementById('odds-api-status');
        
        if (services.odds_api) {
            oddsStatus.className = 'status-badge success';
            oddsStatus.textContent = '✓ Active';
        } else {
            oddsStatus.className = 'status-badge error';
            oddsStatus.textContent = '✗ Missing Key';
        }
    }

    async fetchOdds() {
        const league = document.getElementById('league-select').value;
        const market = document.getElementById('market-select').value;
        const resultsContainer = document.getElementById('odds-results');

        // Show loading
        resultsContainer.innerHTML = this.getLoadingHTML();

        try {
            const response = await fetch(`${this.baseURL}/odds/${league}?markets=${market}&region=us`);
            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = this.getErrorHTML(data.error);
                return;
            }

            if (!data.data || data.data.length === 0) {
                resultsContainer.innerHTML = this.getPlaceholderHTML('No odds available', 'Try a different league or check back later');
                return;
            }

            this.displayOdds(data.data, resultsContainer);
        } catch (error) {
            console.error('Failed to fetch odds:', error);
            resultsContainer.innerHTML = this.getErrorHTML('Failed to fetch odds. Please try again.');
        }
    }

    displayOdds(oddsData, container) {
        let html = '<div class="odds-grid">';
        
        oddsData.forEach(event => {
            html += `
                <div class="odds-event">
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
    }

    async calculateEV() {
        const league = document.getElementById('ev-league').value;
        const eventId = document.getElementById('event-id').value.trim();
        const devigMethod = document.getElementById('devig-method').value;
        const priorWeight = document.getElementById('prior-weight').value;
        const resultsContainer = document.getElementById('ev-results');

        if (!eventId) {
            resultsContainer.innerHTML = this.getErrorHTML('Please enter an Event ID');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = this.getLoadingHTML();

        try {
            const url = `${this.baseURL}/ev/${league}/${eventId}?devig=${devigMethod}&prior_weight=${priorWeight}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = this.getErrorHTML(data.error);
                return;
            }

            this.displayEVResults(data, resultsContainer);
        } catch (error) {
            console.error('Failed to calculate EV:', error);
            resultsContainer.innerHTML = this.getErrorHTML('Failed to calculate EV. Please try again.');
        }
    }

    displayEVResults(evData, container) {
        let html = `
            <div class="ev-results">
                <div class="ev-header">
                    <h3>Expected Value Analysis</h3>
                    <p>Event: ${evData.eventId} | League: ${evData.league.toUpperCase()}</p>
                </div>
        `;

        Object.entries(evData.markets).forEach(([marketKey, bookmakers]) => {
            html += `
                <div class="market-section">
                    <h4>${this.formatMarketName(marketKey)}</h4>
                    <table class="results-table">
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
    }

    async fetchStats() {
        const league = document.getElementById('stats-league').value;
        const teamId = document.getElementById('team-id').value.trim();
        const resultsContainer = document.getElementById('stats-results');

        if (!teamId) {
            resultsContainer.innerHTML = this.getErrorHTML('Please enter a Team/Player ID');
            return;
        }

        // Show loading
        resultsContainer.innerHTML = this.getLoadingHTML();

        try {
            const response = await fetch(`${this.baseURL}/stats/${league}/${teamId}`);
            const data = await response.json();

            if (data.error) {
                resultsContainer.innerHTML = this.getErrorHTML(data.error);
                return;
            }

            this.displayStats(data.data, resultsContainer, league);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            resultsContainer.innerHTML = this.getErrorHTML('Failed to fetch stats. Please try again.');
        }
    }

    displayStats(statsData, container, league) {
        let html = `
            <div class="stats-results">
                <div class="stats-header">
                    <h3>${league.toUpperCase()} Statistics</h3>
                </div>
                <div class="stats-content">
                    <pre class="stats-json">${JSON.stringify(statsData, null, 2)}</pre>
                </div>
            </div>
        `;
        container.innerHTML = html;
    }

    // Utility functions
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

    getLoadingHTML() {
        return `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }

    getErrorHTML(message) {
        return `
            <div class="error-message">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }

    getPlaceholderHTML(title, message) {
        return `
            <div class="placeholder">
                <div class="placeholder-icon">📊</div>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new EdgeFinderApp();
});

// Add CSS for odds display
const additionalCSS = `
.odds-grid {
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

.odds-event {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1.5rem;
}

.event-header {
    margin-bottom: 1rem;
    text-align: center;
}

.event-header h3 {
    color: #00d4ff;
    margin-bottom: 0.5rem;
}

.event-time {
    color: #a0a9c0;
    font-size: 0.9rem;
}

.bookmakers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.bookmaker-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
}

.bookmaker-card h4 {
    color: #00ff88;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
}

.outcomes {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.outcome {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
}

.outcome .team {
    font-size: 0.9rem;
    color: #ffffff;
}

.outcome .odds {
    font-weight: 600;
    color: #00d4ff;
}

.stats-json {
    background: rgba(0, 0, 0, 0.3);
    padding: 1rem;
    border-radius: 8px;
    color: #ffffff;
    font-size: 0.9rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.ev-results {
    color: #ffffff;
}

.ev-header {
    text-align: center;
    margin-bottom: 2rem;
}

.ev-header h3 {
    color: #00d4ff;
    margin-bottom: 0.5rem;
}

.market-section {
    margin-bottom: 2rem;
}

.market-section h4 {
    color: #00ff88;
    margin-bottom: 1rem;
    font-size: 1.2rem;
}
`;

// Inject additional CSS
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);