// EdgeFinder Pro - EV & Arbitrage Detection App
class EdgeFinderPro {
    constructor() {
        this.config = window.EdgeFinderConfig || {};
        this.baseURL = window.location.origin;
        this.cache = new Map();
        this.currentTab = 'positive-ev';
        this.filters = {
            sport: 'MLB',
            market: 'h2h',
            evThreshold: 2.0,
            showEVOnly: false,
            showArbsOnly: false,
            hiddenBooks: [],
            timeWindow: 24,
            search: ''
        };
        this.data = {
            odds: [],
            evOpportunities: [],
            arbOpportunities: [],
            props: []
        };
        this.pollInterval = null;
        this.init();
    }

    async init() {
        this.showLoadingScreen();
        await this.initializeApp();
        this.setupEventListeners();
        this.setupPolling();
        this.hideLoadingScreen();
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        loadingScreen.classList.remove('hidden');
    }

    async hideLoadingScreen() {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        loadingScreen.classList.add('hidden');
        app.classList.remove('hidden');
    }

    async initializeApp() {
        this.setupBookToggles();
        this.updateBaselineBadge();
        await this.loadTestData();
        this.renderCurrentTab();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Filters
        document.getElementById('sportSelector').addEventListener('change', (e) => {
            this.filters.sport = e.target.value;
            this.applyFilters();
        });

        document.getElementById('marketFilter').addEventListener('change', (e) => {
            this.filters.market = e.target.value;
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        document.getElementById('evThreshold').addEventListener('input', (e) => {
            this.filters.evThreshold = parseFloat(e.target.value);
            document.getElementById('thresholdValue').textContent = `${e.target.value}%`;
            this.applyFilters();
        });

        document.getElementById('showEVOnly').addEventListener('change', (e) => {
            this.filters.showEVOnly = e.target.checked;
            this.applyFilters();
        });

        document.getElementById('showArbsOnly').addEventListener('change', (e) => {
            this.filters.showArbsOnly = e.target.checked;
            this.applyFilters();
        });

        document.getElementById('timeWindow').addEventListener('change', (e) => {
            this.filters.timeWindow = parseInt(e.target.value);
            this.applyFilters();
        });

        // Sidebar toggle
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            document.querySelector('.app').classList.toggle('sidebar-collapsed');
        });

        // Modals
        this.setupModalListeners();

        // Help button
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showModal('howToModal');
        });
    }

    setupModalListeners() {
        // Close modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                this.hideModal(modal.id);
            });
        });

        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal.id);
                }
            });
        });

        // Stake calculator actions
        document.getElementById('closeCalculator').addEventListener('click', () => {
            this.hideModal('stakeCalculatorModal');
        });

        document.getElementById('copyStakes').addEventListener('click', () => {
            this.copyStakesToClipboard();
        });

        document.getElementById('closeHowTo').addEventListener('click', () => {
            this.hideModal('howToModal');
        });

        // Auto-calculate stakes
        ['totalBankroll', 'targetProfit'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => {
                this.calculateStakes();
            });
        });
    }

    setupBookToggles() {
        const container = document.getElementById('bookToggles');
        const sportsbooks = this.config.sportsbooks || {};
        
        Object.entries(sportsbooks).forEach(([key, book]) => {
            const toggle = document.createElement('div');
            toggle.className = 'book-toggle';
            toggle.innerHTML = `
                <div class="book-color" style="background-color: ${book.color}"></div>
                <span class="book-name">${book.name}</span>
                <input type="checkbox" checked data-book="${key}">
            `;
            
            const checkbox = toggle.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.filters.hiddenBooks = this.filters.hiddenBooks.filter(b => b !== key);
                } else {
                    this.filters.hiddenBooks.push(key);
                }
                this.applyFilters();
            });
            
            container.appendChild(toggle);
        });
    }

    updateBaselineBadge() {
        const badge = document.getElementById('baselineBadge');
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        badge.querySelector('.baseline-time').textContent = `Last: ${timeStr}`;
    }

    setupPolling() {
        // Poll for new data every 30 seconds
        this.pollInterval = setInterval(() => {
            this.loadTestData();
            this.updateBaselineBadge();
        }, 30000);
    }

    async loadTestData() {
        // Load test fixtures for development
        const fixtures = this.config.fixtures || {};
        
        // Simulate API calls with test data
        this.data.odds = [
            this.processOddsData(fixtures.mlbMoneyline),
            this.processOddsData(fixtures.nbaArb)
        ].filter(Boolean);

        this.calculateEVAndArb();
        this.updateTabCounts();
    }

    processOddsData(fixture) {
        if (!fixture) return null;

        const processed = {
            id: fixture.id,
            sport: fixture.sport,
            homeTeam: fixture.home_team,
            awayTeam: fixture.away_team,
            commenceTime: new Date(fixture.commence_time),
            bookmakers: {}
        };

        fixture.bookmakers.forEach(bookmaker => {
            const market = bookmaker.markets[0];
            if (market && market.outcomes.length >= 2) {
                processed.bookmakers[bookmaker.key] = {
                    name: bookmaker.title,
                    homeOdds: this.decimalToAmerican(market.outcomes[0].price),
                    awayOdds: this.decimalToAmerican(market.outcomes[1].price),
                    homeDecimal: market.outcomes[0].price,
                    awayDecimal: market.outcomes[1].price
                };
            }
        });

        return processed;
    }

    calculateEVAndArb() {
        this.data.evOpportunities = [];
        this.data.arbOpportunities = [];

        this.data.odds.forEach(game => {
            const baseline = game.bookmakers.pinnacle;
            if (!baseline) return;

            // Calculate fair odds (no-vig)
            const homeImplied = 1 / baseline.homeDecimal;
            const awayImplied = 1 / baseline.awayDecimal;
            const totalImplied = homeImplied + awayImplied;
            
            const fairHomeProb = homeImplied / totalImplied;
            const fairAwayProb = awayImplied / totalImplied;
            const fairHomeOdds = 1 / fairHomeProb;
            const fairAwayOdds = 1 / fairAwayProb;

            // Check each bookmaker for EV and arbitrage
            Object.entries(game.bookmakers).forEach(([bookKey, bookData]) => {
                if (bookKey === 'pinnacle') return;

                // Calculate EV
                const homeEV = this.calculateEV(fairHomeProb, bookData.homeDecimal);
                const awayEV = this.calculateEV(fairAwayProb, bookData.awayDecimal);

                if (homeEV >= this.filters.evThreshold) {
                    this.data.evOpportunities.push({
                        ...game,
                        side: 'home',
                        bookmaker: bookData.name,
                        bookKey: bookKey,
                        odds: bookData.homeOdds,
                        decimal: bookData.homeDecimal,
                        fairOdds: this.decimalToAmerican(fairHomeOdds),
                        ev: homeEV,
                        hold: ((totalImplied - 1) * 100).toFixed(1)
                    });
                }

                if (awayEV >= this.filters.evThreshold) {
                    this.data.evOpportunities.push({
                        ...game,
                        side: 'away',
                        bookmaker: bookData.name,
                        bookKey: bookKey,
                        odds: bookData.awayOdds,
                        decimal: bookData.awayDecimal,
                        fairOdds: this.decimalToAmerican(fairAwayOdds),
                        ev: awayEV,
                        hold: ((totalImplied - 1) * 100).toFixed(1)
                    });
                }
            });

            // Check for arbitrage opportunities
            this.findArbitrageOpportunities(game);
        });
    }

    findArbitrageOpportunities(game) {
        const bookmakers = Object.entries(game.bookmakers);
        
        // Check all combinations for arbitrage
        for (let i = 0; i < bookmakers.length; i++) {
            for (let j = i + 1; j < bookmakers.length; j++) {
                const [book1Key, book1] = bookmakers[i];
                const [book2Key, book2] = bookmakers[j];

                // Check home at book1, away at book2
                const arb1 = this.checkArbitrage(
                    book1.homeDecimal, book2.awayDecimal,
                    book1.name, book2.name,
                    book1.homeOdds, book2.awayOdds,
                    'home', 'away'
                );

                if (arb1.isArb) {
                    this.data.arbOpportunities.push({
                        ...game,
                        ...arb1,
                        book1Key,
                        book2Key
                    });
                }

                // Check away at book1, home at book2
                const arb2 = this.checkArbitrage(
                    book1.awayDecimal, book2.homeDecimal,
                    book1.name, book2.name,
                    book1.awayOdds, book2.homeOdds,
                    'away', 'home'
                );

                if (arb2.isArb) {
                    this.data.arbOpportunities.push({
                        ...game,
                        ...arb2,
                        book1Key,
                        book2Key
                    });
                }
            }
        }
    }

    checkArbitrage(decimal1, decimal2, book1Name, book2Name, odds1, odds2, side1, side2) {
        const implied1 = 1 / decimal1;
        const implied2 = 1 / decimal2;
        const totalImplied = implied1 + implied2;

        if (totalImplied < 1) {
            const profit = ((1 - totalImplied) / totalImplied * 100);
            return {
                isArb: profit >= 1.5, // Minimum 1.5% profit
                profit: profit.toFixed(2),
                book1: book1Name,
                book2: book2Name,
                odds1,
                odds2,
                side1,
                side2,
                decimal1,
                decimal2,
                stake1Ratio: implied1 / totalImplied,
                stake2Ratio: implied2 / totalImplied
            };
        }

        return { isArb: false };
    }

    calculateEV(fairProb, decimal) {
        const impliedProb = 1 / decimal;
        return ((fairProb - impliedProb) / impliedProb * 100);
    }

    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return Math.round((decimal - 1) * 100);
        } else {
            return Math.round(-100 / (decimal - 1));
        }
    }

    americanToDecimal(american) {
        if (american > 0) {
            return 1 + american / 100;
        } else {
            return 1 + 100 / Math.abs(american);
        }
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'positive-ev':
                this.renderEVTable();
                break;
            case 'arbitrage':
                this.renderArbTable();
                break;
            case 'props':
                this.renderPropsGrid();
                break;
        }
    }

    renderEVTable() {
        const container = document.getElementById('evTable');
        const opportunities = this.getFilteredEVOpportunities();

        if (opportunities.length === 0) {
            container.innerHTML = this.getEmptyState('No +EV opportunities found', 'Try adjusting your filters or check back later');
            return;
        }

        let html = `
            <div class="table-header">
                <div>Matchup</div>
                <div>Fair Price</div>
                <div>Best Price</div>
                <div>Book</div>
                <div>EV%</div>
                <div>Hold%</div>
                <div>Actions</div>
            </div>
        `;

        opportunities.forEach(opp => {
            const team = opp.side === 'home' ? opp.homeTeam : opp.awayTeam;
            const timeStr = opp.commenceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div class="odds-row">
                    <div class="matchup">
                        <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                        <div class="game-time">${timeStr} • ${team}</div>
                    </div>
                    <div class="fair-price">${opp.fairOdds > 0 ? '+' : ''}${opp.fairOdds}</div>
                    <div class="best-price">${opp.odds > 0 ? '+' : ''}${opp.odds}</div>
                    <div class="book-name">${opp.bookmaker}</div>
                    <div class="signal-pills">
                        <div class="ev-pill positive">${opp.ev.toFixed(1)}%</div>
                    </div>
                    <div class="hold-pill">${opp.hold}%</div>
                    <div class="action-buttons">
                        <a href="#" class="bet-btn" data-book="${opp.bookKey}">
                            <i class="fas fa-external-link-alt"></i>
                            Bet at ${opp.bookmaker}
                        </a>
                        <button class="copy-btn tooltip" data-tooltip="Copy bet details" onclick="edgeFinderPro.copyBet('${opp.id}', '${opp.side}', '${opp.bookmaker}', '${opp.odds}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderArbTable() {
        const container = document.getElementById('arbTable');
        const opportunities = this.getFilteredArbOpportunities();

        if (opportunities.length === 0) {
            container.innerHTML = this.getEmptyState('No arbitrage opportunities found', 'Arbitrage opportunities are rare but profitable when found');
            return;
        }

        let html = `
            <div class="table-header">
                <div>Matchup</div>
                <div>Side 1</div>
                <div>Side 2</div>
                <div>Books</div>
                <div>Profit%</div>
                <div>Hold%</div>
                <div>Actions</div>
            </div>
        `;

        opportunities.forEach(opp => {
            const timeStr = opp.commenceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const side1Team = opp.side1 === 'home' ? opp.homeTeam : opp.awayTeam;
            const side2Team = opp.side2 === 'home' ? opp.homeTeam : opp.awayTeam;
            
            html += `
                <div class="odds-row">
                    <div class="matchup">
                        <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                        <div class="game-time">${timeStr}</div>
                    </div>
                    <div class="best-price">
                        <div>${side1Team}</div>
                        <div class="book-name">${opp.odds1 > 0 ? '+' : ''}${opp.odds1}</div>
                    </div>
                    <div class="best-price">
                        <div>${side2Team}</div>
                        <div class="book-name">${opp.odds2 > 0 ? '+' : ''}${opp.odds2}</div>
                    </div>
                    <div class="book-name">
                        <div>${opp.book1}</div>
                        <div>${opp.book2}</div>
                    </div>
                    <div class="signal-pills">
                        <div class="arb-pill" onclick="edgeFinderPro.showStakeCalculator('${opp.id}')">
                            ${opp.profit}%
                        </div>
                    </div>
                    <div class="hold-pill">-</div>
                    <div class="action-buttons">
                        <button class="bet-btn" onclick="edgeFinderPro.showStakeCalculator('${opp.id}')">
                            <i class="fas fa-calculator"></i>
                            Calculate
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderPropsGrid() {
        const container = document.getElementById('propsGrid');
        
        // Mock props data for demonstration
        const mockProps = [
            {
                id: 'prop1',
                playerName: 'Aaron Judge',
                team: 'NYY',
                market: 'Home Runs O/U 0.5',
                fairLine: '+180',
                bestLine: '+220',
                bookmaker: 'DraftKings',
                ev: 3.2,
                photo: 'https://img.mlbstatic.com/mlb-photos/image/upload/w_300,h_300,q_auto:best,f_auto/v1/people/592450/headshot/67/current'
            },
            {
                id: 'prop2',
                playerName: 'Mookie Betts',
                team: 'LAD',
                market: 'Hits O/U 1.5',
                fairLine: '-120',
                bestLine: '-105',
                bookmaker: 'FanDuel',
                ev: 2.8,
                photo: 'https://img.mlbstatic.com/mlb-photos/image/upload/w_300,h_300,q_auto:best,f_auto/v1/people/605141/headshot/67/current'
            }
        ];

        if (mockProps.length === 0) {
            container.innerHTML = this.getEmptyState('No player props available', 'Props data varies by sport and availability');
            return;
        }

        let html = '';
        mockProps.forEach(prop => {
            html += `
                <div class="prop-card">
                    <div class="prop-header">
                        <img class="player-photo" src="${prop.photo}" alt="${prop.playerName}" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM2QjcyODAiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIyNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE1IDQ1QzE1IDM4LjM3MjYgMjAuMzcyNiAzMyAyNyAzM0gzM0MzOS42Mjc0IDMzIDQ1IDM4LjM3MjYgNDUgNDVWNTBIMTVWNDVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
                        <div class="player-info">
                            <h4>${prop.playerName}</h4>
                            <div class="player-team">${prop.team}</div>
                        </div>
                    </div>
                    <div class="prop-market">${prop.market}</div>
                    <div class="prop-odds">
                        <div class="prop-prices">
                            <div class="fair-line">Fair: ${prop.fairLine}</div>
                            <div class="best-line">Best: ${prop.bestLine} @ ${prop.bookmaker}</div>
                        </div>
                        <div class="signal-pills">
                            <div class="ev-pill positive">${prop.ev.toFixed(1)}%</div>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    getFilteredEVOpportunities() {
        return this.data.evOpportunities.filter(opp => {
            if (this.filters.showArbsOnly) return false;
            if (opp.ev < this.filters.evThreshold) return false;
            if (this.filters.hiddenBooks.includes(opp.bookKey)) return false;
            if (this.filters.search && !this.matchesSearch(opp)) return false;
            return true;
        });
    }

    getFilteredArbOpportunities() {
        return this.data.arbOpportunities.filter(opp => {
            if (this.filters.showEVOnly) return false;
            if (this.filters.hiddenBooks.includes(opp.book1Key) || this.filters.hiddenBooks.includes(opp.book2Key)) return false;
            if (this.filters.search && !this.matchesSearch(opp)) return false;
            return true;
        });
    }

    matchesSearch(opp) {
        const searchTerm = this.filters.search.toLowerCase();
        return opp.homeTeam.toLowerCase().includes(searchTerm) ||
               opp.awayTeam.toLowerCase().includes(searchTerm) ||
               (opp.bookmaker && opp.bookmaker.toLowerCase().includes(searchTerm));
    }

    updateTabCounts() {
        document.getElementById('evCount').textContent = this.getFilteredEVOpportunities().length;
        document.getElementById('arbCount').textContent = this.getFilteredArbOpportunities().length;
        document.getElementById('propsCount').textContent = '2'; // Mock count
    }

    applyFilters() {
        this.calculateEVAndArb();
        this.updateTabCounts();
        this.renderCurrentTab();
    }

    showStakeCalculator(arbId) {
        const arb = this.data.arbOpportunities.find(a => a.id === arbId);
        if (!arb) return;

        // Populate arb details
        const detailsContainer = document.getElementById('arbDetails');
        detailsContainer.innerHTML = `
            <h4>${arb.homeTeam} vs ${arb.awayTeam}</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div>
                    <strong>${arb.side1 === 'home' ? arb.homeTeam : arb.awayTeam}</strong><br>
                    ${arb.odds1 > 0 ? '+' : ''}${arb.odds1} @ ${arb.book1}
                </div>
                <div>
                    <strong>${arb.side2 === 'home' ? arb.homeTeam : arb.awayTeam}</strong><br>
                    ${arb.odds2 > 0 ? '+' : ''}${arb.odds2} @ ${arb.book2}
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                <strong>Guaranteed Profit: ${arb.profit}%</strong>
            </div>
        `;

        // Store current arb for calculations
        this.currentArb = arb;
        
        // Calculate initial stakes
        this.calculateStakes();
        
        this.showModal('stakeCalculatorModal');
    }

    calculateStakes() {
        if (!this.currentArb) return;

        const totalBankroll = parseFloat(document.getElementById('totalBankroll').value) || 1000;
        const targetProfit = parseFloat(document.getElementById('targetProfit').value) || 50;

        const stake1 = totalBankroll * this.currentArb.stake1Ratio;
        const stake2 = totalBankroll * this.currentArb.stake2Ratio;

        const actualProfit = Math.min(
            stake1 * (this.currentArb.decimal1 - 1),
            stake2 * (this.currentArb.decimal2 - 1)
        );

        const resultsContainer = document.getElementById('stakeResults');
        resultsContainer.innerHTML = `
            <h4>Stake Allocation</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                    <strong>${this.currentArb.book1}</strong><br>
                    Stake: $${stake1.toFixed(2)}<br>
                    <small>${this.currentArb.side1 === 'home' ? this.currentArb.homeTeam : this.currentArb.awayTeam} ${this.currentArb.odds1 > 0 ? '+' : ''}${this.currentArb.odds1}</small>
                </div>
                <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                    <strong>${this.currentArb.book2}</strong><br>
                    Stake: $${stake2.toFixed(2)}<br>
                    <small>${this.currentArb.side2 === 'home' ? this.currentArb.homeTeam : this.currentArb.awayTeam} ${this.currentArb.odds2 > 0 ? '+' : ''}${this.currentArb.odds2}</small>
                </div>
            </div>
            <div style="margin-top: 1rem; padding: 1rem; background: var(--success); color: white; border-radius: 6px; text-align: center;">
                <strong>Guaranteed Profit: $${actualProfit.toFixed(2)}</strong>
            </div>
        `;
    }

    copyStakesToClipboard() {
        if (!this.currentArb) return;

        const totalBankroll = parseFloat(document.getElementById('totalBankroll').value) || 1000;
        const stake1 = totalBankroll * this.currentArb.stake1Ratio;
        const stake2 = totalBankroll * this.currentArb.stake2Ratio;

        const text = `Arbitrage Stakes:
${this.currentArb.book1}: $${stake1.toFixed(2)} on ${this.currentArb.side1 === 'home' ? this.currentArb.homeTeam : this.currentArb.awayTeam} ${this.currentArb.odds1 > 0 ? '+' : ''}${this.currentArb.odds1}
${this.currentArb.book2}: $${stake2.toFixed(2)} on ${this.currentArb.side2 === 'home' ? this.currentArb.homeTeam : this.currentArb.awayTeam} ${this.currentArb.odds2 > 0 ? '+' : ''}${this.currentArb.odds2}`;

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Stakes copied to clipboard!');
        });
    }

    copyBet(gameId, side, bookmaker, odds) {
        const game = this.data.odds.find(g => g.id === gameId);
        if (!game) return;

        const team = side === 'home' ? game.homeTeam : game.awayTeam;
        const text = `${team} ${odds > 0 ? '+' : ''}${odds} @ ${bookmaker}`;

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Bet copied to clipboard!');
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }

    showToast(message) {
        // Simple toast notification
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    getEmptyState(title, message) {
        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>${title}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}

// Utility functions for odds calculations
const OddsUtils = {
    decimalToAmerican(decimal) {
        if (decimal >= 2) {
            return Math.round((decimal - 1) * 100);
        } else {
            return Math.round(-100 / (decimal - 1));
        }
    },

    americanToDecimal(american) {
        if (american > 0) {
            return 1 + american / 100;
        } else {
            return 1 + 100 / Math.abs(american);
        }
    },

    impliedProbability(decimal) {
        return 1 / decimal;
    },

    removeVig(prob1, prob2) {
        const total = prob1 + prob2;
        return [prob1 / total, prob2 / total];
    },

    calculateEV(fairProb, decimal) {
        const impliedProb = 1 / decimal;
        return ((fairProb - impliedProb) / impliedProb * 100);
    },

    detectArbitrage(decimal1, decimal2) {
        const implied1 = 1 / decimal1;
        const implied2 = 1 / decimal2;
        const total = implied1 + implied2;
        
        if (total < 1) {
            return {
                isArb: true,
                profit: ((1 - total) / total * 100),
                stake1Ratio: implied1 / total,
                stake2Ratio: implied2 / total
            };
        }
        
        return { isArb: false };
    }
};

// Initialize the app
let edgeFinderPro;
document.addEventListener('DOMContentLoaded', () => {
    edgeFinderPro = new EdgeFinderPro();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (edgeFinderPro) {
        edgeFinderPro.destroy();
    }
});