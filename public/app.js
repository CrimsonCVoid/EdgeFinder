// EdgeFinder Pro - Production JavaScript Application
class EdgeFinderPro {
    constructor() {
        this.config = window.EdgeFinderConfig || {};
        this.baseURL = window.location.origin;
        this.cache = new Map();
        this.currentTab = 'positive-ev';
        this.currentMarket = 'h2h';
        this.currentSport = 'MLB';
        this.currentLeague = 'MLB';
        
        // State management
        this.state = {
            filters: {
                sport: 'MLB',
                league: 'MLB',
                market: 'h2h',
                evThreshold: 2.0,
                showEVOnly: false,
                showArbsOnly: false,
                includeProps: true,
                showSteam: false,
                showMiddles: false,
                hiddenBooks: [],
                timeWindow: 24,
                search: '',
                baselineBook: 'pinnacle',
                kellyFraction: 0.25
            },
            data: {
                odds: [],
                evOpportunities: [],
                arbOpportunities: [],
                props: [],
                movement: []
            },
            ui: {
                leftRailOpen: true,
                rightDrawerOpen: false,
                currentDrawerContent: null
            }
        };
        
        this.pollInterval = null;
        this.debounceTimer = null;
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
        this.updateLeagueSelector();
        await this.loadTestData();
        this.renderCurrentTab();
        this.loadUserPreferences();
    }

    setupEventListeners() {
        // Market tabs
        document.querySelectorAll('.market-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const market = e.currentTarget.dataset.market;
                this.switchMarket(market);
            });
        });

        // Content tabs
        document.querySelectorAll('.content-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Top bar controls
        document.getElementById('sportSelector').addEventListener('change', (e) => {
            this.state.filters.sport = e.target.value;
            this.updateLeagueSelector();
            this.applyFilters();
        });

        document.getElementById('leagueSelector').addEventListener('change', (e) => {
            this.state.filters.league = e.target.value;
            this.applyFilters();
        });

        document.getElementById('timeWindow').addEventListener('change', (e) => {
            this.state.filters.timeWindow = e.target.value === 'all' ? null : parseInt(e.target.value);
            this.applyFilters();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.state.filters.search = e.target.value.toLowerCase();
            this.debounceApplyFilters();
        });

        // Left rail controls
        document.getElementById('evThreshold').addEventListener('input', (e) => {
            this.state.filters.evThreshold = parseFloat(e.target.value);
            document.getElementById('thresholdValue').textContent = `${e.target.value}%`;
            this.debounceApplyFilters();
        });

        document.getElementById('kellyFraction').addEventListener('input', (e) => {
            this.state.filters.kellyFraction = parseFloat(e.target.value);
            document.getElementById('kellyValue').textContent = e.target.value;
            this.debounceApplyFilters();
        });

        document.getElementById('showEVOnly').addEventListener('change', (e) => {
            this.state.filters.showEVOnly = e.target.checked;
            if (e.target.checked) {
                document.getElementById('showArbsOnly').checked = false;
                this.state.filters.showArbsOnly = false;
            }
            this.applyFilters();
        });

        document.getElementById('showArbsOnly').addEventListener('change', (e) => {
            this.state.filters.showArbsOnly = e.target.checked;
            if (e.target.checked) {
                document.getElementById('showEVOnly').checked = false;
                this.state.filters.showEVOnly = false;
            }
            this.applyFilters();
        });

        ['includeProps', 'showSteam', 'showMiddles'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                this.state.filters[id] = e.target.checked;
                this.applyFilters();
            });
        });

        document.getElementById('baselineSelector').addEventListener('change', (e) => {
            this.state.filters.baselineBook = e.target.value;
            this.updateBaselineWarning();
            this.applyFilters();
        });

        // Book controls
        document.getElementById('showAllBooks').addEventListener('click', () => {
            this.state.filters.hiddenBooks = [];
            this.updateBookToggles();
            this.applyFilters();
        });

        document.getElementById('hideAllBooks').addEventListener('click', () => {
            this.state.filters.hiddenBooks = Object.keys(this.config.sportsbooks || {});
            this.updateBookToggles();
            this.applyFilters();
        });

        // Rail toggle
        document.getElementById('railToggle').addEventListener('click', () => {
            this.toggleLeftRail();
        });

        // Export buttons
        document.getElementById('exportEV').addEventListener('click', () => {
            this.exportData('ev');
        });

        document.getElementById('exportArb').addEventListener('click', () => {
            this.exportData('arb');
        });

        document.getElementById('exportProps').addEventListener('click', () => {
            this.exportData('props');
        });

        // Props view toggle
        document.getElementById('propsViewToggle').addEventListener('click', (e) => {
            const isCards = e.target.innerHTML.includes('Cards');
            if (isCards) {
                e.target.innerHTML = '<i class="fas fa-list"></i> Table';
            } else {
                e.target.innerHTML = '<i class="fas fa-th-large"></i> Cards';
            }
            this.togglePropsView();
        });

        // Right drawer
        document.getElementById('drawerClose').addEventListener('click', () => {
            this.closeRightDrawer();
        });

        // Modals
        this.setupModalListeners();

        // Help button
        document.getElementById('helpBtn').addEventListener('click', () => {
            this.showModal('howToModal');
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeRightDrawer();
                this.hideAllModals();
            }
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
        
        container.innerHTML = '';
        Object.entries(sportsbooks).forEach(([key, book]) => {
            const toggle = document.createElement('div');
            toggle.className = 'book-toggle';
            toggle.innerHTML = `
                <div class="book-color" style="background-color: ${book.color}"></div>
                <span class="book-name">${book.name}</span>
                <input type="checkbox" class="book-checkbox" checked data-book="${key}">
            `;
            
            const checkbox = toggle.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.state.filters.hiddenBooks = this.state.filters.hiddenBooks.filter(b => b !== key);
                } else {
                    this.state.filters.hiddenBooks.push(key);
                }
                this.applyFilters();
            });
            
            container.appendChild(toggle);
        });
    }

    updateBookToggles() {
        document.querySelectorAll('.book-checkbox').forEach(checkbox => {
            const bookKey = checkbox.dataset.book;
            checkbox.checked = !this.state.filters.hiddenBooks.includes(bookKey);
        });
    }

    updateLeagueSelector() {
        const selector = document.getElementById('leagueSelector');
        const sport = this.config.sports?.[this.state.filters.sport];
        
        if (sport && sport.leagues) {
            selector.innerHTML = sport.leagues.map(league => 
                `<option value="${league}">${league}</option>`
            ).join('');
            this.state.filters.league = sport.leagues[0];
        }
    }

    updateBaselineBadge() {
        const badge = document.getElementById('baselineBadge');
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const baselineBook = this.config.sportsbooks?.[this.state.filters.baselineBook];
        const baselineName = baselineBook ? baselineBook.name : 'Pinnacle';
        
        badge.querySelector('.baseline-name').textContent = `${baselineName} (no-vig)`;
        badge.querySelector('.baseline-time').textContent = `Last: ${timeStr}`;
    }

    updateBaselineWarning() {
        const warning = document.getElementById('baselineWarning');
        if (this.state.filters.baselineBook !== 'pinnacle') {
            warning.classList.remove('hidden');
        } else {
            warning.classList.add('hidden');
        }
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
        this.state.data.odds = [
            this.processOddsData(fixtures.moneyline_ml_sample),
            this.processOddsData(fixtures.soccer_3way_sample)
        ].filter(Boolean);

        this.state.data.props = this.processPropsData(fixtures.props_sample);
        this.state.data.movement = fixtures.movement_series || [];

        this.calculateEVAndArb();
        this.updateTabCounts();
    }

    processOddsData(fixture) {
        if (!fixture) return null;

        const processed = {
            id: fixture.id,
            sport: fixture.sport,
            league: fixture.league,
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
                    outcomes: market.outcomes.map(outcome => ({
                        name: outcome.name,
                        decimal: outcome.price,
                        american: this.decimalToAmerican(outcome.price)
                    }))
                };
            }
        });

        return processed;
    }

    processPropsData(fixture) {
        if (!fixture || !fixture.players) return [];

        return fixture.players.map(player => ({
            id: player.id,
            name: player.name,
            team: player.team,
            position: player.position,
            photo: player.photo,
            recentForm: player.recentForm,
            props: player.props.map(prop => ({
                market: prop.market,
                line: prop.line,
                bookmakers: prop.bookmakers,
                fairOdds: this.calculateFairPropsOdds(prop),
                ev: this.calculatePropsEV(prop)
            }))
        }));
    }

    calculateFairPropsOdds(prop) {
        // Simplified fair odds calculation for props
        const avgOver = prop.bookmakers.reduce((sum, book) => sum + book.over, 0) / prop.bookmakers.length;
        const avgUnder = prop.bookmakers.reduce((sum, book) => sum + book.under, 0) / prop.bookmakers.length;
        
        // Remove vig
        const overImplied = 1 / avgOver;
        const underImplied = 1 / avgUnder;
        const total = overImplied + underImplied;
        
        return {
            over: 1 / (overImplied / total),
            under: 1 / (underImplied / total)
        };
    }

    calculatePropsEV(prop) {
        const fair = this.calculateFairPropsOdds(prop);
        const bestOver = Math.max(...prop.bookmakers.map(b => b.over));
        const bestUnder = Math.max(...prop.bookmakers.map(b => b.under));
        
        const overEV = this.calculateEV(1 / fair.over, bestOver);
        const underEV = this.calculateEV(1 / fair.under, bestUnder);
        
        return Math.max(overEV, underEV);
    }

    calculateEVAndArb() {
        this.state.data.evOpportunities = [];
        this.state.data.arbOpportunities = [];

        this.state.data.odds.forEach(game => {
            const baseline = game.bookmakers[this.state.filters.baselineBook];
            if (!baseline || baseline.outcomes.length < 2) return;

            // Calculate fair odds (no-vig)
            const fairOdds = this.calculateFairOdds(baseline.outcomes);

            // Check each bookmaker for EV opportunities
            Object.entries(game.bookmakers).forEach(([bookKey, bookData]) => {
                if (bookKey === this.state.filters.baselineBook) return;

                bookData.outcomes.forEach((outcome, index) => {
                    const fairProb = 1 / fairOdds[index];
                    const ev = this.calculateEV(fairProb, outcome.decimal);
                    
                    if (ev >= this.state.filters.evThreshold) {
                        this.state.data.evOpportunities.push({
                            ...game,
                            side: outcome.name,
                            bookmaker: bookData.name,
                            bookKey: bookKey,
                            odds: outcome.american,
                            decimal: outcome.decimal,
                            fairOdds: this.decimalToAmerican(fairOdds[index]),
                            ev: ev,
                            hold: this.calculateHold(baseline.outcomes),
                            kelly: this.calculateKelly(fairProb, outcome.decimal)
                        });
                    }
                });
            });

            // Check for arbitrage opportunities
            this.findArbitrageOpportunities(game);
        });
    }

    calculateFairOdds(outcomes) {
        const impliedProbs = outcomes.map(outcome => 1 / outcome.decimal);
        const totalImplied = impliedProbs.reduce((sum, prob) => sum + prob, 0);
        
        // Remove vig proportionally
        const fairProbs = impliedProbs.map(prob => prob / totalImplied);
        return fairProbs.map(prob => 1 / prob);
    }

    calculateEV(fairProb, decimal) {
        const impliedProb = 1 / decimal;
        return ((fairProb - impliedProb) / impliedProb) * 100;
    }

    calculateHold(outcomes) {
        const impliedProbs = outcomes.map(outcome => 1 / outcome.decimal);
        const totalImplied = impliedProbs.reduce((sum, prob) => sum + prob, 0);
        return ((totalImplied - 1) * 100);
    }

    calculateKelly(fairProb, decimal) {
        const b = decimal - 1; // net odds
        const p = fairProb;
        const q = 1 - p;
        
        const kelly = ((b * p - q) / b) * this.state.filters.kellyFraction;
        return Math.max(0, kelly * 100); // Return as percentage, minimum 0
    }

    findArbitrageOpportunities(game) {
        const bookmakers = Object.entries(game.bookmakers);
        
        // Check all combinations for arbitrage
        for (let i = 0; i < bookmakers.length; i++) {
            for (let j = i + 1; j < bookmakers.length; j++) {
                const [book1Key, book1] = bookmakers[i];
                const [book2Key, book2] = bookmakers[j];

                // For 2-way markets
                if (book1.outcomes.length === 2 && book2.outcomes.length === 2) {
                    // Check outcome 1 at book1, outcome 2 at book2
                    const arb1 = this.checkArbitrage(
                        book1.outcomes[0].decimal, book2.outcomes[1].decimal,
                        book1.name, book2.name,
                        book1.outcomes[0].american, book2.outcomes[1].american,
                        book1.outcomes[0].name, book2.outcomes[1].name
                    );

                    if (arb1.isArb) {
                        this.state.data.arbOpportunities.push({
                            ...game,
                            ...arb1,
                            book1Key,
                            book2Key
                        });
                    }

                    // Check outcome 2 at book1, outcome 1 at book2
                    const arb2 = this.checkArbitrage(
                        book1.outcomes[1].decimal, book2.outcomes[0].decimal,
                        book1.name, book2.name,
                        book1.outcomes[1].american, book2.outcomes[0].american,
                        book1.outcomes[1].name, book2.outcomes[0].name
                    );

                    if (arb2.isArb) {
                        this.state.data.arbOpportunities.push({
                            ...game,
                            ...arb2,
                            book1Key,
                            book2Key
                        });
                    }
                }

                // For 3-way markets (soccer)
                if (book1.outcomes.length === 3 && book2.outcomes.length === 3) {
                    const arb3way = this.check3WayArbitrage(book1, book2, book1Key, book2Key);
                    if (arb3way.isArb) {
                        this.state.data.arbOpportunities.push({
                            ...game,
                            ...arb3way
                        });
                    }
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

    check3WayArbitrage(book1, book2, book1Key, book2Key) {
        // Find best odds for each outcome across both books
        const bestOdds = [];
        const bestBooks = [];
        
        for (let i = 0; i < 3; i++) {
            if (book1.outcomes[i].decimal > book2.outcomes[i].decimal) {
                bestOdds.push(book1.outcomes[i].decimal);
                bestBooks.push({ book: book1.name, key: book1Key });
            } else {
                bestOdds.push(book2.outcomes[i].decimal);
                bestBooks.push({ book: book2.name, key: book2Key });
            }
        }

        const totalImplied = bestOdds.reduce((sum, odds) => sum + (1 / odds), 0);
        
        if (totalImplied < 1) {
            const profit = ((1 - totalImplied) / totalImplied * 100);
            return {
                isArb: profit >= 1.5,
                profit: profit.toFixed(2),
                type: '3way',
                outcomes: bestOdds.map((odds, i) => ({
                    side: book1.outcomes[i].name,
                    odds: this.decimalToAmerican(odds),
                    decimal: odds,
                    book: bestBooks[i].book,
                    bookKey: bestBooks[i].key,
                    stakeRatio: (1 / odds) / totalImplied
                }))
            };
        }

        return { isArb: false };
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

    switchMarket(market) {
        // Update market tabs
        document.querySelectorAll('.market-tab').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-market="${market}"]`).classList.add('active');

        this.currentMarket = market;
        this.state.filters.market = market;
        this.applyFilters();
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.content-tab').forEach(btn => {
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

    debounceApplyFilters() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.applyFilters();
        }, 300);
    }

    applyFilters() {
        this.calculateEVAndArb();
        this.updateTabCounts();
        this.renderCurrentTab();
        this.saveUserPreferences();
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
            case 'movement':
                this.renderMovementChart();
                break;
            case 'learn':
                // Learn content is static
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
                <div>Kelly%</div>
                <div>Actions</div>
            </div>
        `;

        opportunities.forEach(opp => {
            const timeStr = opp.commenceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            html += `
                <div class="table-row" onclick="edgeFinderPro.openRowDrawer('${opp.id}', 'ev')">
                    <div class="matchup">
                        <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                        <div class="game-time">${timeStr} • ${opp.side}</div>
                    </div>
                    <div class="fair-price">${opp.fairOdds > 0 ? '+' : ''}${opp.fairOdds}</div>
                    <div class="best-price">${opp.odds > 0 ? '+' : ''}${opp.odds}</div>
                    <div class="book-name">${opp.bookmaker}</div>
                    <div class="signal-pills">
                        <div class="ev-pill ${opp.ev >= this.state.filters.evThreshold ? 'positive' : 'neutral'}">${opp.ev.toFixed(1)}%</div>
                    </div>
                    <div class="kelly-size">${opp.kelly.toFixed(1)}%</div>
                    <div class="action-buttons">
                        <button class="bet-btn" onclick="event.stopPropagation(); edgeFinderPro.openBookLink('${opp.bookKey}', '${opp.id}')">
                            <i class="fas fa-external-link-alt"></i>
                            Bet
                        </button>
                        <button class="copy-btn tooltip" data-tooltip="Copy bet details" onclick="event.stopPropagation(); edgeFinderPro.copyBet('${opp.id}', '${opp.side}', '${opp.bookmaker}', '${opp.odds}')">
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
                <div>Type</div>
                <div>Actions</div>
            </div>
        `;

        opportunities.forEach(opp => {
            const timeStr = opp.commenceTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            if (opp.type === '3way') {
                html += `
                    <div class="table-row" onclick="edgeFinderPro.openRowDrawer('${opp.id}', 'arb')">
                        <div class="matchup">
                            <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                            <div class="game-time">${timeStr}</div>
                        </div>
                        <div class="best-price">3-Way</div>
                        <div class="best-price">Arbitrage</div>
                        <div class="book-name">Multiple</div>
                        <div class="signal-pills">
                            <div class="arb-pill" onclick="event.stopPropagation(); edgeFinderPro.showStakeCalculator('${opp.id}')">
                                ${opp.profit}%
                            </div>
                        </div>
                        <div class="book-name">3-Way</div>
                        <div class="action-buttons">
                            <button class="bet-btn" onclick="event.stopPropagation(); edgeFinderPro.showStakeCalculator('${opp.id}')">
                                <i class="fas fa-calculator"></i>
                                Calculate
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="table-row" onclick="edgeFinderPro.openRowDrawer('${opp.id}', 'arb')">
                        <div class="matchup">
                            <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                            <div class="game-time">${timeStr}</div>
                        </div>
                        <div class="best-price">
                            <div>${opp.side1}</div>
                            <div class="book-name">${opp.odds1 > 0 ? '+' : ''}${opp.odds1}</div>
                        </div>
                        <div class="best-price">
                            <div>${opp.side2}</div>
                            <div class="book-name">${opp.odds2 > 0 ? '+' : ''}${opp.odds2}</div>
                        </div>
                        <div class="book-name">
                            <div>${opp.book1}</div>
                            <div>${opp.book2}</div>
                        </div>
                        <div class="signal-pills">
                            <div class="arb-pill" onclick="event.stopPropagation(); edgeFinderPro.showStakeCalculator('${opp.id}')">
                                ${opp.profit}%
                            </div>
                        </div>
                        <div class="book-name">2-Way</div>
                        <div class="action-buttons">
                            <button class="bet-btn" onclick="event.stopPropagation(); edgeFinderPro.showStakeCalculator('${opp.id}')">
                                <i class="fas fa-calculator"></i>
                                Calculate
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        container.innerHTML = html;
    }

    renderPropsGrid() {
        const container = document.getElementById('propsGrid');
        const props = this.getFilteredProps();

        if (props.length === 0) {
            container.innerHTML = this.getEmptyState('No player props available', 'Props data varies by sport and availability');
            return;
        }

        let html = '';
        props.forEach(player => {
            player.props.forEach(prop => {
                const bestBook = prop.bookmakers.reduce((best, current) => 
                    Math.max(current.over, current.under) > Math.max(best.over, best.under) ? current : best
                );
                
                const bestOdds = Math.max(bestBook.over, bestBook.under);
                const bestSide = bestBook.over > bestBook.under ? 'Over' : 'Under';
                const fairOdds = bestSide === 'Over' ? prop.fairOdds.over : prop.fairOdds.under;

                html += `
                    <div class="prop-card" onclick="edgeFinderPro.openRowDrawer('${player.id}', 'prop')">
                        <div class="prop-header">
                            <img class="player-photo" src="${player.photo}" alt="${player.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiM2QjcyODAiLz4KPGNpcmNsZSBjeD0iMzAiIGN5PSIyNSIgcj0iOCIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTE1IDQ1QzE1IDM4LjM3MjYgMjAuMzcyNiAzMyAyNyAzM0gzM0MzOS42Mjc0IDMzIDQ1IDM4LjM3MjYgNDUgNDVWNTBIMTVWNDVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'">
                            <div class="player-info">
                                <h4>${player.name}</h4>
                                <div class="player-team">${player.team} • ${player.position}</div>
                            </div>
                        </div>
                        <div class="prop-market">${prop.market} ${prop.line}</div>
                        <div class="prop-odds">
                            <div class="prop-prices">
                                <div class="fair-line">Fair: ${this.decimalToAmerican(fairOdds) > 0 ? '+' : ''}${this.decimalToAmerican(fairOdds)}</div>
                                <div class="best-line">Best: ${this.decimalToAmerican(bestOdds) > 0 ? '+' : ''}${this.decimalToAmerican(bestOdds)} ${bestSide}</div>
                            </div>
                            <div class="signal-pills">
                                <div class="ev-pill ${prop.ev >= this.state.filters.evThreshold ? 'positive' : 'neutral'}">${prop.ev.toFixed(1)}%</div>
                            </div>
                        </div>
                        <div class="recent-form">
                            <h5>Recent Form (L5)</h5>
                            <div class="form-stats">
                                <div class="form-stat">
                                    <div class="form-stat-value">${player.recentForm.averages.points}</div>
                                    <div class="form-stat-label">PPG</div>
                                </div>
                                <div class="form-stat">
                                    <div class="form-stat-value">${player.recentForm.averages.rebounds}</div>
                                    <div class="form-stat-label">RPG</div>
                                </div>
                                <div class="form-stat">
                                    <div class="form-stat-value">${player.recentForm.averages.assists}</div>
                                    <div class="form-stat-label">APG</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        });

        container.innerHTML = html;
    }

    renderMovementChart() {
        const container = document.getElementById('movementChart');
        const movement = this.state.data.movement;

        if (movement.length === 0) {
            container.innerHTML = '<p>No movement data available</p>';
            return;
        }

        // Simple text representation of movement data
        container.innerHTML = `
            <div>
                <h3>Line Movement Chart</h3>
                <p>Movement data for ${movement.length} time points</p>
                <div style="margin-top: 2rem;">
                    <strong>Latest:</strong> Home ${movement[movement.length - 1].odds.home} | Away ${movement[movement.length - 1].odds.away}
                </div>
                <div style="margin-top: 1rem;">
                    <strong>Opening:</strong> Home ${movement[0].odds.home} | Away ${movement[0].odds.away}
                </div>
            </div>
        `;
    }

    getFilteredEVOpportunities() {
        return this.state.data.evOpportunities.filter(opp => {
            if (this.state.filters.showArbsOnly) return false;
            if (opp.ev < this.state.filters.evThreshold) return false;
            if (this.state.filters.hiddenBooks.includes(opp.bookKey)) return false;
            if (this.state.filters.search && !this.matchesSearch(opp)) return false;
            if (this.state.filters.sport !== opp.sport) return false;
            return true;
        });
    }

    getFilteredArbOpportunities() {
        return this.state.data.arbOpportunities.filter(opp => {
            if (this.state.filters.showEVOnly) return false;
            if (this.state.filters.hiddenBooks.includes(opp.book1Key) || this.state.filters.hiddenBooks.includes(opp.book2Key)) return false;
            if (this.state.filters.search && !this.matchesSearch(opp)) return false;
            if (this.state.filters.sport !== opp.sport) return false;
            return true;
        });
    }

    getFilteredProps() {
        if (!this.state.filters.includeProps) return [];
        
        return this.state.data.props.filter(player => {
            if (this.state.filters.search) {
                const searchTerm = this.state.filters.search.toLowerCase();
                return player.name.toLowerCase().includes(searchTerm) ||
                       player.team.toLowerCase().includes(searchTerm);
            }
            return true;
        });
    }

    matchesSearch(opp) {
        const searchTerm = this.state.filters.search.toLowerCase();
        return opp.homeTeam.toLowerCase().includes(searchTerm) ||
               opp.awayTeam.toLowerCase().includes(searchTerm) ||
               (opp.bookmaker && opp.bookmaker.toLowerCase().includes(searchTerm));
    }

    updateTabCounts() {
        document.getElementById('evCount').textContent = this.getFilteredEVOpportunities().length;
        document.getElementById('arbCount').textContent = this.getFilteredArbOpportunities().length;
        document.getElementById('propsCount').textContent = this.getFilteredProps().length;
    }

    toggleLeftRail() {
        const rail = document.getElementById('leftRail');
        rail.classList.toggle('collapsed');
        this.state.ui.leftRailOpen = !rail.classList.contains('collapsed');
    }

    openRowDrawer(id, type) {
        const drawer = document.getElementById('rightDrawer');
        const title = document.getElementById('drawerTitle');
        const content = document.getElementById('drawerContent');

        let data;
        switch (type) {
            case 'ev':
                data = this.state.data.evOpportunities.find(opp => opp.id === id);
                title.textContent = 'EV Details';
                break;
            case 'arb':
                data = this.state.data.arbOpportunities.find(opp => opp.id === id);
                title.textContent = 'Arbitrage Details';
                break;
            case 'prop':
                data = this.state.data.props.find(player => player.id === id);
                title.textContent = 'Player Details';
                break;
        }

        if (data) {
            content.innerHTML = this.generateDrawerContent(data, type);
            drawer.classList.add('open');
            this.state.ui.rightDrawerOpen = true;
            this.state.ui.currentDrawerContent = { id, type, data };
        }
    }

    generateDrawerContent(data, type) {
        switch (type) {
            case 'ev':
                return `
                    <div class="drawer-section">
                        <h4>${data.homeTeam} vs ${data.awayTeam}</h4>
                        <p><strong>Side:</strong> ${data.side}</p>
                        <p><strong>Bookmaker:</strong> ${data.bookmaker}</p>
                        <p><strong>Odds:</strong> ${data.odds > 0 ? '+' : ''}${data.odds}</p>
                        <p><strong>Fair Odds:</strong> ${data.fairOdds > 0 ? '+' : ''}${data.fairOdds}</p>
                        <p><strong>EV:</strong> ${data.ev.toFixed(2)}%</p>
                        <p><strong>Kelly Size:</strong> ${data.kelly.toFixed(2)}%</p>
                        <p><strong>Hold:</strong> ${data.hold.toFixed(2)}%</p>
                    </div>
                `;
            case 'arb':
                if (data.type === '3way') {
                    return `
                        <div class="drawer-section">
                            <h4>${data.homeTeam} vs ${data.awayTeam}</h4>
                            <p><strong>Type:</strong> 3-Way Arbitrage</p>
                            <p><strong>Profit:</strong> ${data.profit}%</p>
                            <div style="margin-top: 1rem;">
                                ${data.outcomes.map(outcome => `
                                    <div style="margin-bottom: 0.5rem;">
                                        <strong>${outcome.side}:</strong> ${outcome.odds > 0 ? '+' : ''}${outcome.odds} @ ${outcome.book}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="drawer-section">
                            <h4>${data.homeTeam} vs ${data.awayTeam}</h4>
                            <p><strong>Type:</strong> 2-Way Arbitrage</p>
                            <p><strong>Profit:</strong> ${data.profit}%</p>
                            <div style="margin-top: 1rem;">
                                <div><strong>${data.side1}:</strong> ${data.odds1 > 0 ? '+' : ''}${data.odds1} @ ${data.book1}</div>
                                <div><strong>${data.side2}:</strong> ${data.odds2 > 0 ? '+' : ''}${data.odds2} @ ${data.book2}</div>
                            </div>
                        </div>
                    `;
                }
            case 'prop':
                return `
                    <div class="drawer-section">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                            <img src="${data.photo}" alt="${data.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                            <div>
                                <h4>${data.name}</h4>
                                <p>${data.team} • ${data.position}</p>
                            </div>
                        </div>
                        <div>
                            <h5>Recent Performance (Last 5 Games)</h5>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-top: 0.5rem;">
                                <div style="text-align: center;">
                                    <div style="font-weight: 600; color: var(--primary);">${data.recentForm.averages.points}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">PPG</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 600; color: var(--primary);">${data.recentForm.averages.rebounds}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">RPG</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="font-weight: 600; color: var(--primary);">${data.recentForm.averages.assists}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">APG</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            default:
                return '<p>No details available</p>';
        }
    }

    closeRightDrawer() {
        const drawer = document.getElementById('rightDrawer');
        drawer.classList.remove('open');
        this.state.ui.rightDrawerOpen = false;
        this.state.ui.currentDrawerContent = null;
    }

    showStakeCalculator(arbId) {
        const arb = this.state.data.arbOpportunities.find(a => a.id === arbId);
        if (!arb) return;

        // Populate arb details
        const detailsContainer = document.getElementById('arbDetails');
        
        if (arb.type === '3way') {
            detailsContainer.innerHTML = `
                <h4>${arb.homeTeam} vs ${arb.awayTeam}</h4>
                <div style="margin-top: 1rem;">
                    <strong>3-Way Arbitrage - Guaranteed Profit: ${arb.profit}%</strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;">
                    ${arb.outcomes.map(outcome => `
                        <div>
                            <strong>${outcome.side}:</strong> ${outcome.odds > 0 ? '+' : ''}${outcome.odds} @ ${outcome.book}
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            detailsContainer.innerHTML = `
                <h4>${arb.homeTeam} vs ${arb.awayTeam}</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div>
                        <strong>${arb.side1}</strong><br>
                        ${arb.odds1 > 0 ? '+' : ''}${arb.odds1} @ ${arb.book1}
                    </div>
                    <div>
                        <strong>${arb.side2}</strong><br>
                        ${arb.odds2 > 0 ? '+' : ''}${arb.odds2} @ ${arb.book2}
                    </div>
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                    <strong>Guaranteed Profit: ${arb.profit}%</strong>
                </div>
            `;
        }

        // Store current arb for calculations
        this.currentArb = arb;
        
        // Calculate initial stakes
        this.calculateStakes();
        
        this.showModal('stakeCalculatorModal');
    }

    calculateStakes() {
        if (!this.currentArb) return;

        const totalBankroll = parseFloat(document.getElementById('totalBankroll').value) || 1000;
        
        const resultsContainer = document.getElementById('stakeResults');
        
        if (this.currentArb.type === '3way') {
            let html = '<h4>Stake Allocation (3-Way)</h4><div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem;">';
            
            let totalProfit = Infinity;
            this.currentArb.outcomes.forEach((outcome, index) => {
                const stake = totalBankroll * outcome.stakeRatio;
                const profit = stake * (outcome.decimal - 1);
                totalProfit = Math.min(totalProfit, profit);
                
                html += `
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                        <strong>${outcome.book}</strong><br>
                        Stake: $${stake.toFixed(2)}<br>
                        <small>${outcome.side} ${outcome.odds > 0 ? '+' : ''}${outcome.odds}</small>
                    </div>
                `;
            });
            
            html += `</div><div style="margin-top: 1rem; padding: 1rem; background: var(--success); color: white; border-radius: 6px; text-align: center;">
                <strong>Guaranteed Profit: $${totalProfit.toFixed(2)}</strong>
            </div>`;
            
            resultsContainer.innerHTML = html;
        } else {
            const stake1 = totalBankroll * this.currentArb.stake1Ratio;
            const stake2 = totalBankroll * this.currentArb.stake2Ratio;

            const actualProfit = Math.min(
                stake1 * (this.currentArb.decimal1 - 1),
                stake2 * (this.currentArb.decimal2 - 1)
            );

            resultsContainer.innerHTML = `
                <h4>Stake Allocation</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem;">
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                        <strong>${this.currentArb.book1}</strong><br>
                        Stake: $${stake1.toFixed(2)}<br>
                        <small>${this.currentArb.side1} ${this.currentArb.odds1 > 0 ? '+' : ''}${this.currentArb.odds1}</small>
                    </div>
                    <div style="padding: 1rem; background: var(--bg-tertiary); border-radius: 6px;">
                        <strong>${this.currentArb.book2}</strong><br>
                        Stake: $${stake2.toFixed(2)}<br>
                        <small>${this.currentArb.side2} ${this.currentArb.odds2 > 0 ? '+' : ''}${this.currentArb.odds2}</small>
                    </div>
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: var(--success); color: white; border-radius: 6px; text-align: center;">
                    <strong>Guaranteed Profit: $${actualProfit.toFixed(2)}</strong>
                </div>
            `;
        }
    }

    copyStakesToClipboard() {
        if (!this.currentArb) return;

        const totalBankroll = parseFloat(document.getElementById('totalBankroll').value) || 1000;
        
        let text;
        if (this.currentArb.type === '3way') {
            text = `3-Way Arbitrage Stakes:\n`;
            this.currentArb.outcomes.forEach(outcome => {
                const stake = totalBankroll * outcome.stakeRatio;
                text += `${outcome.book}: $${stake.toFixed(2)} on ${outcome.side} ${outcome.odds > 0 ? '+' : ''}${outcome.odds}\n`;
            });
        } else {
            const stake1 = totalBankroll * this.currentArb.stake1Ratio;
            const stake2 = totalBankroll * this.currentArb.stake2Ratio;

            text = `Arbitrage Stakes:
${this.currentArb.book1}: $${stake1.toFixed(2)} on ${this.currentArb.side1} ${this.currentArb.odds1 > 0 ? '+' : ''}${this.currentArb.odds1}
${this.currentArb.book2}: $${stake2.toFixed(2)} on ${this.currentArb.side2} ${this.currentArb.odds2 > 0 ? '+' : ''}${this.currentArb.odds2}`;
        }

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Stakes copied to clipboard!');
        });
    }

    copyBet(gameId, side, bookmaker, odds) {
        const text = `${side} ${odds > 0 ? '+' : ''}${odds} @ ${bookmaker}`;

        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Bet copied to clipboard!');
        });
    }

    openBookLink(bookKey, gameId) {
        const book = this.config.sportsbooks?.[bookKey];
        if (book && book.affiliate && this.config.features?.enableAffiliates) {
            // Open affiliate link (placeholder)
            window.open(`https://${book.affiliate}.example.com/bet/${gameId}`, '_blank');
        } else {
            this.showToast(`Visit ${book?.name || bookKey} to place this bet`);
        }
    }

    exportData(type) {
        let data, filename;
        
        switch (type) {
            case 'ev':
                data = this.getFilteredEVOpportunities();
                filename = 'ev-opportunities.csv';
                break;
            case 'arb':
                data = this.getFilteredArbOpportunities();
                filename = 'arbitrage-opportunities.csv';
                break;
            case 'props':
                data = this.getFilteredProps();
                filename = 'player-props.csv';
                break;
        }

        if (data.length === 0) {
            this.showToast('No data to export');
            return;
        }

        const csv = this.convertToCSV(data, type);
        this.downloadCSV(csv, filename);
        this.showToast(`${data.length} rows exported`);
    }

    convertToCSV(data, type) {
        if (data.length === 0) return '';

        let headers, rows;
        
        switch (type) {
            case 'ev':
                headers = ['Sport', 'Home Team', 'Away Team', 'Side', 'Bookmaker', 'Odds', 'Fair Odds', 'EV%', 'Kelly%'];
                rows = data.map(opp => [
                    opp.sport,
                    opp.homeTeam,
                    opp.awayTeam,
                    opp.side,
                    opp.bookmaker,
                    opp.odds,
                    opp.fairOdds,
                    opp.ev.toFixed(2),
                    opp.kelly.toFixed(2)
                ]);
                break;
            case 'arb':
                headers = ['Sport', 'Home Team', 'Away Team', 'Type', 'Book 1', 'Book 2', 'Profit%'];
                rows = data.map(opp => [
                    opp.sport,
                    opp.homeTeam,
                    opp.awayTeam,
                    opp.type || '2-way',
                    opp.book1 || 'Multiple',
                    opp.book2 || 'Multiple',
                    opp.profit
                ]);
                break;
            case 'props':
                headers = ['Player', 'Team', 'Position', 'Market', 'EV%'];
                rows = [];
                data.forEach(player => {
                    player.props.forEach(prop => {
                        rows.push([
                            player.name,
                            player.team,
                            player.position,
                            prop.market,
                            prop.ev.toFixed(2)
                        ]);
                    });
                });
                break;
        }

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    togglePropsView() {
        const grid = document.getElementById('propsGrid');
        grid.classList.toggle('table-view');
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
    }

    hideAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.classList.remove('active');
        });
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    saveUserPreferences() {
        const preferences = {
            filters: this.state.filters,
            ui: this.state.ui
        };
        localStorage.setItem('edgefinder-preferences', JSON.stringify(preferences));
    }

    loadUserPreferences() {
        const saved = localStorage.getItem('edgefinder-preferences');
        if (saved) {
            try {
                const preferences = JSON.parse(saved);
                this.state.filters = { ...this.state.filters, ...preferences.filters };
                this.state.ui = { ...this.state.ui, ...preferences.ui };
                
                // Apply saved preferences to UI
                this.applySavedPreferences();
            } catch (e) {
                console.warn('Failed to load user preferences:', e);
            }
        }
    }

    applySavedPreferences() {
        // Update form controls with saved values
        document.getElementById('evThreshold').value = this.state.filters.evThreshold;
        document.getElementById('thresholdValue').textContent = `${this.state.filters.evThreshold}%`;
        
        document.getElementById('kellyFraction').value = this.state.filters.kellyFraction;
        document.getElementById('kellyValue').textContent = this.state.filters.kellyFraction;
        
        document.getElementById('showEVOnly').checked = this.state.filters.showEVOnly;
        document.getElementById('showArbsOnly').checked = this.state.filters.showArbsOnly;
        document.getElementById('includeProps').checked = this.state.filters.includeProps;
        document.getElementById('showSteam').checked = this.state.filters.showSteam;
        document.getElementById('showMiddles').checked = this.state.filters.showMiddles;
        
        document.getElementById('baselineSelector').value = this.state.filters.baselineBook;
        this.updateBaselineWarning();
        
        // Update book toggles
        this.updateBookToggles();
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
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}

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