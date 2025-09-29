/**
 * EdgeFinder Pro - Complete OddsJam Clone
 * Professional EV & Arbitrage Detection Platform
 */

class EdgeFinderPro {
    constructor() {
        this.config = null;
        this.data = {
            odds: [],
            evOpportunities: [],
            arbOpportunities: [],
            props: [],
            movement: []
        };
        this.filters = {
            sport: 'MLB',
            league: 'MLB',
            market: 'h2h',
            timeWindow: 24,
            evThreshold: 2.0,
            showEVOnly: false,
            showArbsOnly: false,
            includeProps: true,
            showSteam: false,
            showMiddles: false,
            baselineBook: 'pinnacle',
            hiddenBooks: [],
            kellyFraction: 0.25,
            searchQuery: ''
        };
        this.state = {
            loading: false,
            lastUpdate: null,
            activeTab: 'positive-ev',
            activeMarket: 'h2h',
            rightDrawerOpen: false
        };
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing EdgeFinder Pro...');
        
        try {
            // Load configuration
            await this.loadConfig();
            
            // Initialize UI
            this.initializeUI();
            
            // Load initial data
            await this.loadData();
            
            // Start polling
            this.startPolling();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            console.log('✅ EdgeFinder Pro initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize EdgeFinder Pro:', error);
            this.showError('Failed to initialize application');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/config');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            this.config = await response.json();
            console.log('📋 Configuration loaded:', this.config);
        } catch (error) {
            console.warn('⚠️ Failed to load config, using defaults:', error);
            this.config = this.getDefaultConfig();
        }
    }

    getDefaultConfig() {
        return {
            sportsbooks: {
                pinnacle: { name: 'Pinnacle', color: '#FFD700', isBaseline: true },
                draftkings: { name: 'DraftKings', color: '#FF6B35' },
                fanduel: { name: 'FanDuel', color: '#1E3A8A' },
                betmgm: { name: 'BetMGM', color: '#B8860B' },
                caesars: { name: 'Caesars', color: '#DAA520' },
                pointsbet: { name: 'PointsBet', color: '#FF4444' },
                betrivers: { name: 'BetRivers', color: '#0066CC' }
            },
            sports: {
                NFL: { key: 'americanfootball_nfl', name: 'NFL', icon: '🏈' },
                NBA: { key: 'basketball_nba', name: 'NBA', icon: '🏀' },
                MLB: { key: 'baseball_mlb', name: 'MLB', icon: '⚾' },
                NHL: { key: 'icehockey_nhl', name: 'NHL', icon: '🏒' },
                Soccer: { key: 'soccer_epl', name: 'Soccer', icon: '⚽' }
            },
            defaults: {
                baselineBook: 'pinnacle',
                evThresholdPercent: 2.0,
                kellyFraction: 0.25
            }
        };
    }

    initializeUI() {
        console.log('🎨 Initializing UI components...');
        
        // Initialize controls
        this.initializeControls();
        
        // Initialize tabs
        this.initializeTabs();
        
        // Initialize modals
        this.initializeModals();
        
        // Initialize sportsbook toggles
        this.initializeSportsbookToggles();
        
        // Update baseline badge
        this.updateBaselineBadge();
    }

    initializeControls() {
        // Sport selector
        const sportSelector = document.getElementById('sportSelector');
        if (sportSelector) {
            sportSelector.addEventListener('change', (e) => {
                this.filters.sport = e.target.value;
                this.updateLeagueSelector();
                this.loadData();
            });
        }

        // League selector
        const leagueSelector = document.getElementById('leagueSelector');
        if (leagueSelector) {
            leagueSelector.addEventListener('change', (e) => {
                this.filters.league = e.target.value;
                this.loadData();
            });
        }

        // Time window
        const timeWindow = document.getElementById('timeWindow');
        if (timeWindow) {
            timeWindow.addEventListener('change', (e) => {
                this.filters.timeWindow = parseInt(e.target.value);
                this.loadData();
            });
        }

        // Search input
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filters.searchQuery = e.target.value;
                this.filterAndRenderData();
            });
        }

        // EV threshold slider
        const evThreshold = document.getElementById('evThreshold');
        const thresholdValue = document.getElementById('thresholdValue');
        if (evThreshold && thresholdValue) {
            evThreshold.addEventListener('input', (e) => {
                this.filters.evThreshold = parseFloat(e.target.value);
                thresholdValue.textContent = `${this.filters.evThreshold}%`;
                this.filterAndRenderData();
            });
        }

        // Kelly fraction slider
        const kellyFraction = document.getElementById('kellyFraction');
        const kellyValue = document.getElementById('kellyValue');
        if (kellyFraction && kellyValue) {
            kellyFraction.addEventListener('input', (e) => {
                this.filters.kellyFraction = parseFloat(e.target.value);
                kellyValue.textContent = this.filters.kellyFraction;
                this.filterAndRenderData();
            });
        }

        // Toggle switches
        const toggles = [
            'showEVOnly', 'showArbsOnly', 'includeProps', 'showSteam', 'showMiddles'
        ];
        
        toggles.forEach(toggleId => {
            const toggle = document.getElementById(toggleId);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    this.filters[toggleId] = e.target.checked;
                    this.filterAndRenderData();
                });
            }
        });

        // Baseline selector
        const baselineSelector = document.getElementById('baselineSelector');
        const baselineWarning = document.getElementById('baselineWarning');
        if (baselineSelector && baselineWarning) {
            baselineSelector.addEventListener('change', (e) => {
                this.filters.baselineBook = e.target.value;
                baselineWarning.classList.toggle('hidden', e.target.value === 'pinnacle');
                this.updateBaselineBadge();
                this.loadData();
            });
        }

        // Book controls
        const showAllBooks = document.getElementById('showAllBooks');
        const hideAllBooks = document.getElementById('hideAllBooks');
        if (showAllBooks && hideAllBooks) {
            showAllBooks.addEventListener('click', () => {
                this.filters.hiddenBooks = [];
                this.updateBookToggles();
                this.filterAndRenderData();
            });
            
            hideAllBooks.addEventListener('click', () => {
                this.filters.hiddenBooks = Object.keys(this.config.sportsbooks || {});
                this.updateBookToggles();
                this.filterAndRenderData();
            });
        }
    }

    initializeTabs() {
        // Content tabs
        const contentTabs = document.querySelectorAll('.content-tab');
        contentTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                this.switchTab(tabId);
            });
        });

        // Market tabs
        const marketTabs = document.querySelectorAll('.market-tab');
        marketTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const market = e.currentTarget.dataset.market;
                this.switchMarket(market);
            });
        });
    }

    initializeModals() {
        // Help button
        const helpBtn = document.getElementById('helpBtn');
        const howToModal = document.getElementById('howToModal');
        if (helpBtn && howToModal) {
            helpBtn.addEventListener('click', () => {
                howToModal.classList.add('active');
            });
        }

        // Modal close buttons
        const modalCloses = document.querySelectorAll('.modal-close');
        modalCloses.forEach(close => {
            close.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal-overlay');
                if (modal) modal.classList.remove('active');
            });
        });

        // Close modals on overlay click
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // How-to modal close
        const closeHowTo = document.getElementById('closeHowTo');
        if (closeHowTo) {
            closeHowTo.addEventListener('click', () => {
                howToModal.classList.remove('active');
            });
        }
    }

    initializeSportsbookToggles() {
        const bookToggles = document.getElementById('bookToggles');
        if (!bookToggles || !this.config.sportsbooks) return;

        bookToggles.innerHTML = '';
        
        Object.entries(this.config.sportsbooks).forEach(([key, book]) => {
            const toggle = document.createElement('div');
            toggle.className = 'book-toggle';
            toggle.innerHTML = `
                <div class="book-color" style="background-color: ${book.color}"></div>
                <span class="book-name">${book.name}</span>
                <input type="checkbox" class="book-checkbox" ${this.filters.hiddenBooks.includes(key) ? '' : 'checked'}>
            `;
            
            const checkbox = toggle.querySelector('.book-checkbox');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.filters.hiddenBooks = this.filters.hiddenBooks.filter(b => b !== key);
                } else {
                    this.filters.hiddenBooks.push(key);
                }
                this.filterAndRenderData();
            });
            
            bookToggles.appendChild(toggle);
        });
    }

    updateBookToggles() {
        const checkboxes = document.querySelectorAll('.book-checkbox');
        checkboxes.forEach((checkbox, index) => {
            const bookKey = Object.keys(this.config.sportsbooks || {})[index];
            checkbox.checked = !this.filters.hiddenBooks.includes(bookKey);
        });
    }

    updateBaselineBadge() {
        const badge = document.getElementById('baselineBadge');
        if (!badge) return;

        const baselineBook = this.config.sportsbooks?.[this.filters.baselineBook];
        const name = baselineBook?.name || 'Pinnacle';
        const time = this.state.lastUpdate ? 
            this.formatTimeAgo(this.state.lastUpdate) : '2m ago';

        badge.querySelector('.baseline-name').textContent = `${name} (no-vig)`;
        badge.querySelector('.baseline-time').textContent = `Last: ${time}`;
    }

    updateLeagueSelector() {
        const leagueSelector = document.getElementById('leagueSelector');
        if (!leagueSelector) return;

        const sport = this.config.sports?.[this.filters.sport];
        const leagues = sport?.leagues || [this.filters.sport];
        
        leagueSelector.innerHTML = '';
        leagues.forEach(league => {
            const option = document.createElement('option');
            option.value = league;
            option.textContent = league;
            leagueSelector.appendChild(option);
        });
        
        this.filters.league = leagues[0];
    }

    switchTab(tabId) {
        // Update active tab
        document.querySelectorAll('.content-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === tabId);
        });
        
        this.state.activeTab = tabId;
        this.filterAndRenderData();
    }

    switchMarket(market) {
        // Update active market
        document.querySelectorAll('.market-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.market === market);
        });
        
        this.state.activeMarket = market;
        this.filters.market = market;
        this.loadData();
    }

    async loadData() {
        if (this.state.loading) return;
        
        this.state.loading = true;
        console.log(`📊 Loading data for ${this.filters.sport} ${this.filters.market}...`);
        
        try {
            // Try to load live data first
            await this.loadLiveData();
        } catch (error) {
            console.warn('⚠️ Live data failed, loading fixtures:', error);
            // Fall back to test fixtures
            await this.loadTestFixtures();
        }
        
        this.state.loading = false;
        this.state.lastUpdate = new Date();
        this.updateBaselineBadge();
        this.filterAndRenderData();
    }

    async loadLiveData() {
        const promises = [
            this.fetchOdds(),
            this.fetchEV(),
            this.fetchArbitrage(),
            this.fetchProps(),
            this.fetchMovement()
        ];
        
        const [odds, ev, arb, props, movement] = await Promise.allSettled(promises);
        
        this.data.odds = odds.status === 'fulfilled' ? odds.value : [];
        this.data.evOpportunities = ev.status === 'fulfilled' ? ev.value : [];
        this.data.arbOpportunities = arb.status === 'fulfilled' ? arb.value : [];
        this.data.props = props.status === 'fulfilled' ? props.value : [];
        this.data.movement = movement.status === 'fulfilled' ? movement.value : [];
        
        console.log('📊 Live data loaded:', {
            odds: this.data.odds.length,
            ev: this.data.evOpportunities.length,
            arb: this.data.arbOpportunities.length,
            props: this.data.props.length
        });
    }

    async loadTestFixtures() {
        try {
            const response = await fetch('/fixtures');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const fixtures = await response.json();
            
            // Process fixtures into our data format
            this.data.evOpportunities = this.processFixturesForEV(fixtures);
            this.data.arbOpportunities = this.processFixturesForArb(fixtures);
            this.data.props = this.processFixturesForProps(fixtures);
            this.data.movement = fixtures.movement_series || [];
            
            console.log('🧪 Test fixtures loaded:', {
                ev: this.data.evOpportunities.length,
                arb: this.data.arbOpportunities.length,
                props: this.data.props.length
            });
        } catch (error) {
            console.error('❌ Failed to load test fixtures:', error);
            this.data = { odds: [], evOpportunities: [], arbOpportunities: [], props: [], movement: [] };
        }
    }

    processFixturesForEV(fixtures) {
        const evOpportunities = [];
        
        // Process moneyline sample
        if (fixtures.moneyline_ml_sample) {
            const game = fixtures.moneyline_ml_sample;
            const pinnacle = game.bookmakers.find(b => b.key === 'pinnacle');
            
            if (pinnacle) {
                const [fairHomeOdds, fairAwayOdds] = this.calculateFairOdds(
                    pinnacle.markets[0].outcomes[0].price,
                    pinnacle.markets[0].outcomes[1].price
                );
                
                game.bookmakers.forEach(book => {
                    if (book.key === 'pinnacle') return;
                    
                    const homeOdds = book.markets[0].outcomes[0].price;
                    const awayOdds = book.markets[0].outcomes[1].price;
                    
                    const homeEV = this.calculateEV(1/fairHomeOdds, homeOdds);
                    const awayEV = this.calculateEV(1/fairAwayOdds, awayOdds);
                    
                    if (homeEV >= this.filters.evThreshold) {
                        evOpportunities.push({
                            id: `${game.id}_${book.key}_home`,
                            sport: game.sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: game.commence_time,
                            side: 'home',
                            bookmaker: book.title,
                            odds: homeOdds,
                            fairOdds: fairHomeOdds,
                            ev: homeEV,
                            kelly: this.calculateKelly(1/fairHomeOdds, homeOdds),
                            hold: this.calculateHold(pinnacle.markets[0].outcomes)
                        });
                    }
                    
                    if (awayEV >= this.filters.evThreshold) {
                        evOpportunities.push({
                            id: `${game.id}_${book.key}_away`,
                            sport: game.sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: game.commence_time,
                            side: 'away',
                            bookmaker: book.title,
                            odds: awayOdds,
                            fairOdds: fairAwayOdds,
                            ev: awayEV,
                            kelly: this.calculateKelly(1/fairAwayOdds, awayOdds),
                            hold: this.calculateHold(pinnacle.markets[0].outcomes)
                        });
                    }
                });
            }
        }
        
        return evOpportunities;
    }

    processFixturesForArb(fixtures) {
        const arbOpportunities = [];
        
        // Process moneyline sample for 2-way arbs
        if (fixtures.moneyline_ml_sample) {
            const game = fixtures.moneyline_ml_sample;
            const bookmakers = game.bookmakers;
            
            for (let i = 0; i < bookmakers.length; i++) {
                for (let j = i + 1; j < bookmakers.length; j++) {
                    const book1 = bookmakers[i];
                    const book2 = bookmakers[j];
                    
                    const book1HomeOdds = book1.markets[0].outcomes[0].price;
                    const book1AwayOdds = book1.markets[0].outcomes[1].price;
                    const book2HomeOdds = book2.markets[0].outcomes[0].price;
                    const book2AwayOdds = book2.markets[0].outcomes[1].price;
                    
                    // Check home@book1 vs away@book2
                    const arb1 = this.detectArbitrage(book1HomeOdds, book2AwayOdds);
                    if (arb1.isArb) {
                        arbOpportunities.push({
                            id: `${game.id}_${book1.key}_${book2.key}_1`,
                            sport: game.sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: game.commence_time,
                            book1: book1.title,
                            book2: book2.title,
                            odds1: book1HomeOdds,
                            odds2: book2AwayOdds,
                            side1: 'home',
                            side2: 'away',
                            profit: arb1.profit,
                            stake1Ratio: arb1.stake1Ratio,
                            stake2Ratio: arb1.stake2Ratio
                        });
                    }
                    
                    // Check away@book1 vs home@book2
                    const arb2 = this.detectArbitrage(book1AwayOdds, book2HomeOdds);
                    if (arb2.isArb) {
                        arbOpportunities.push({
                            id: `${game.id}_${book1.key}_${book2.key}_2`,
                            sport: game.sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: game.commence_time,
                            book1: book1.title,
                            book2: book2.title,
                            odds1: book1AwayOdds,
                            odds2: book2HomeOdds,
                            side1: 'away',
                            side2: 'home',
                            profit: arb2.profit,
                            stake1Ratio: arb2.stake1Ratio,
                            stake2Ratio: arb2.stake2Ratio
                        });
                    }
                }
            }
        }
        
        // Process 3-way soccer sample
        if (fixtures.soccer_3way_sample) {
            const game = fixtures.soccer_3way_sample;
            const bookmakers = game.bookmakers;
            
            for (let i = 0; i < bookmakers.length; i++) {
                for (let j = i + 1; j < bookmakers.length; j++) {
                    const book1 = bookmakers[i];
                    const book2 = bookmakers[j];
                    
                    const book1Odds = book1.markets[0].outcomes.map(o => o.price);
                    const book2Odds = book2.markets[0].outcomes.map(o => o.price);
                    
                    const arb = this.detect3WayArbitrage(book1Odds, book2Odds);
                    if (arb.isArb) {
                        arbOpportunities.push({
                            id: `${game.id}_${book1.key}_${book2.key}_3way`,
                            sport: game.sport,
                            homeTeam: game.home_team,
                            awayTeam: game.away_team,
                            commenceTime: game.commence_time,
                            book1: book1.title,
                            book2: book2.title,
                            type: '3-way',
                            profit: arb.profit,
                            stakes: arb.stakes
                        });
                    }
                }
            }
        }
        
        return arbOpportunities;
    }

    processFixturesForProps(fixtures) {
        if (!fixtures.props_sample?.players) return [];
        
        return fixtures.props_sample.players.map(player => ({
            id: player.id,
            playerName: player.name,
            team: player.team,
            position: player.position,
            photo: player.photo,
            recentForm: player.recentForm,
            props: player.props.map(prop => ({
                market: prop.market,
                line: prop.line,
                bookmakers: prop.bookmakers,
                ev: this.calculatePropEV(prop),
                zscore: this.calculateZScore(prop, player.recentForm)
            }))
        }));
    }

    async fetchOdds() {
        const response = await fetch(`/api/odds/${this.filters.sport}?market=${this.filters.market}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.data || [];
    }

    async fetchEV() {
        const response = await fetch(`/api/ev/${this.filters.sport}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.data || [];
    }

    async fetchArbitrage() {
        const response = await fetch(`/api/arbitrage/${this.filters.sport}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.data || [];
    }

    async fetchProps() {
        const response = await fetch(`/api/props/${this.filters.sport}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.data || [];
    }

    async fetchMovement() {
        const response = await fetch(`/api/movement/${this.filters.sport}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.data || [];
    }

    filterAndRenderData() {
        console.log('🔄 Filtering and rendering data...');
        
        // Update tab counts
        this.updateTabCounts();
        
        // Render based on active tab
        switch (this.state.activeTab) {
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

    updateTabCounts() {
        const evCount = document.getElementById('evCount');
        const arbCount = document.getElementById('arbCount');
        const propsCount = document.getElementById('propsCount');
        
        if (evCount) evCount.textContent = this.getFilteredEVOpportunities().length;
        if (arbCount) arbCount.textContent = this.getFilteredArbOpportunities().length;
        if (propsCount) propsCount.textContent = this.getFilteredProps().length;
    }

    getFilteredEVOpportunities() {
        return this.data.evOpportunities.filter(opp => {
            if (opp.ev < this.filters.evThreshold) return false;
            if (this.filters.hiddenBooks.includes(opp.bookmaker.toLowerCase().replace(/\s+/g, ''))) return false;
            if (this.filters.searchQuery) {
                const query = this.filters.searchQuery.toLowerCase();
                if (!opp.homeTeam.toLowerCase().includes(query) && 
                    !opp.awayTeam.toLowerCase().includes(query)) return false;
            }
            return true;
        });
    }

    getFilteredArbOpportunities() {
        return this.data.arbOpportunities.filter(opp => {
            if (this.filters.searchQuery) {
                const query = this.filters.searchQuery.toLowerCase();
                if (!opp.homeTeam.toLowerCase().includes(query) && 
                    !opp.awayTeam.toLowerCase().includes(query)) return false;
            }
            return true;
        });
    }

    getFilteredProps() {
        return this.data.props.filter(prop => {
            if (!this.filters.includeProps) return false;
            if (this.filters.searchQuery) {
                const query = this.filters.searchQuery.toLowerCase();
                if (!prop.playerName.toLowerCase().includes(query) && 
                    !prop.team.toLowerCase().includes(query)) return false;
            }
            return true;
        });
    }

    renderEVTable() {
        const container = document.getElementById('evTable');
        if (!container) return;

        const opportunities = this.getFilteredEVOpportunities();
        
        if (opportunities.length === 0) {
            container.innerHTML = this.renderEmptyState('No +EV opportunities found', 'Try adjusting your filters or threshold');
            return;
        }

        const tableHTML = `
            <div class="table-header">
                <div>Matchup</div>
                <div>Fair Price</div>
                <div>Best Price</div>
                <div>Book</div>
                <div>EV%</div>
                <div>Kelly</div>
                <div>Actions</div>
            </div>
            ${opportunities.map(opp => this.renderEVRow(opp)).join('')}
        `;
        
        container.innerHTML = tableHTML;
        
        // Add click handlers
        container.querySelectorAll('.table-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.closest('.action-buttons')) {
                    this.openRowDrawer(row.dataset.id, 'ev');
                }
            });
        });
    }

    renderEVRow(opp) {
        const gameTime = new Date(opp.commenceTime).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
        });
        
        const evClass = opp.ev >= this.filters.evThreshold ? 'positive' : 'neutral';
        const kellyPercent = (opp.kelly * this.filters.kellyFraction * 100).toFixed(1);
        
        return `
            <div class="table-row" data-id="${opp.id}">
                <div class="matchup">
                    <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                    <div class="game-time">${gameTime}</div>
                </div>
                <div class="fair-price">${this.formatOdds(opp.fairOdds)}</div>
                <div class="best-price">${this.formatOdds(opp.odds)}</div>
                <div class="book-name">${opp.bookmaker}</div>
                <div class="signal-pills">
                    <div class="ev-pill ${evClass}">+${opp.ev.toFixed(1)}%</div>
                </div>
                <div class="kelly-size">${kellyPercent}%</div>
                <div class="action-buttons">
                    <button class="bet-btn" onclick="window.open('#', '_blank')">
                        <i class="fas fa-external-link-alt"></i>
                        Bet
                    </button>
                    <button class="copy-btn" onclick="app.copyBet('${opp.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderArbTable() {
        const container = document.getElementById('arbTable');
        if (!container) return;

        const opportunities = this.getFilteredArbOpportunities();
        
        if (opportunities.length === 0) {
            container.innerHTML = this.renderEmptyState('No arbitrage opportunities found', 'Arbitrage opportunities are rare but profitable');
            return;
        }

        const tableHTML = `
            <div class="table-header">
                <div>Matchup</div>
                <div>Book 1</div>
                <div>Book 2</div>
                <div>Odds 1</div>
                <div>Odds 2</div>
                <div>Profit</div>
                <div>Actions</div>
            </div>
            ${opportunities.map(opp => this.renderArbRow(opp)).join('')}
        `;
        
        container.innerHTML = tableHTML;
        
        // Add click handlers
        container.querySelectorAll('.arb-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openStakeCalculator(pill.dataset.id);
            });
        });
    }

    renderArbRow(opp) {
        const gameTime = new Date(opp.commenceTime).toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit'
        });
        
        return `
            <div class="table-row" data-id="${opp.id}">
                <div class="matchup">
                    <div class="teams">${opp.homeTeam} vs ${opp.awayTeam}</div>
                    <div class="game-time">${gameTime}</div>
                </div>
                <div class="book-name">${opp.book1}</div>
                <div class="book-name">${opp.book2}</div>
                <div class="best-price">${this.formatOdds(opp.odds1)}</div>
                <div class="best-price">${this.formatOdds(opp.odds2)}</div>
                <div class="signal-pills">
                    <div class="arb-pill" data-id="${opp.id}">+${opp.profit.toFixed(1)}%</div>
                </div>
                <div class="action-buttons">
                    <button class="bet-btn" onclick="app.openStakeCalculator('${opp.id}')">
                        <i class="fas fa-calculator"></i>
                        Calculate
                    </button>
                    <button class="copy-btn" onclick="app.copyArb('${opp.id}')">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </div>
        `;
    }

    renderPropsGrid() {
        const container = document.getElementById('propsGrid');
        if (!container) return;

        const props = this.getFilteredProps();
        
        if (props.length === 0) {
            container.innerHTML = this.renderEmptyState('No player props found', 'Props may not be available for this sport/league');
            return;
        }

        const gridHTML = props.map(prop => this.renderPropCard(prop)).join('');
        container.innerHTML = gridHTML;
        
        // Add click handlers
        container.querySelectorAll('.prop-card').forEach(card => {
            card.addEventListener('click', (e) => {
                this.openRowDrawer(card.dataset.id, 'prop');
            });
        });
    }

    renderPropCard(prop) {
        const bestProp = prop.props[0]; // Assuming first prop is best
        const evClass = bestProp.ev >= this.filters.evThreshold ? 'positive' : 'neutral';
        
        return `
            <div class="prop-card" data-id="${prop.id}">
                <div class="prop-header">
                    <img class="player-photo" src="${prop.photo}" alt="${prop.playerName}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiIGZpbGw9IiMzNzQxNTEiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIxOCIgeT0iMTgiPgo8cGF0aCBkPSJNMTIgMTJDMTQuNzYxNCAxMiAxNyA5Ljc2MTQyIDE3IDdDMTcgNC4yMzg1OCAxNC43NjE0IDIgMTIgMkM5LjIzODU4IDIgNyA0LjIzODU4IDcgN0M3IDkuNzYxNDIgOS4yMzg1OCAxMiAxMiAxMloiIGZpbGw9IiM5Q0E0QUYiLz4KPHBhdGggZD0iTTEyIDE0QzguNjg2MjkgMTQgNiAxNi42ODYzIDYgMjBWMjJIMThWMjBDMTggMTYuNjg2MyAxNS4zMTM3IDE0IDEyIDE0WiIgZmlsbD0iIzlDQTRBRiIvPgo8L3N2Zz4KPC9zdmc+'">
                    <div class="player-info">
                        <h4>${prop.playerName}</h4>
                        <div class="player-team">${prop.team} • ${prop.position}</div>
                    </div>
                </div>
                <div class="prop-market">${bestProp.market}</div>
                <div class="prop-odds">
                    <div class="prop-prices">
                        <div class="fair-line">Fair: ${bestProp.line}</div>
                        <div class="best-line">Best: ${this.formatOdds(bestProp.bookmakers[0].over)}</div>
                    </div>
                    <div class="signal-pills">
                        <div class="ev-pill ${evClass}">+${bestProp.ev.toFixed(1)}%</div>
                    </div>
                </div>
                <div class="recent-form">
                    <h5>Recent Form</h5>
                    <div class="form-stats">
                        <div class="form-stat">
                            <div class="form-stat-value">${prop.recentForm.averages.points}</div>
                            <div class="form-stat-label">PPG</div>
                        </div>
                        <div class="form-stat">
                            <div class="form-stat-value">${prop.recentForm.averages.rebounds}</div>
                            <div class="form-stat-label">RPG</div>
                        </div>
                        <div class="form-stat">
                            <div class="form-stat-value">${prop.recentForm.averages.assists}</div>
                            <div class="form-stat-label">APG</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMovementChart() {
        const container = document.getElementById('movementChart');
        if (!container) return;

        if (this.data.movement.length === 0) {
            container.innerHTML = this.renderEmptyState('No movement data available', 'Line movement tracking coming soon');
            return;
        }

        // Simple text representation for now
        container.innerHTML = `
            <div class="movement-placeholder">
                <i class="fas fa-chart-line" style="font-size: 4rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                <h3>Line Movement Chart</h3>
                <p>Interactive charts showing line movement over time</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
                    ${this.data.movement.length} data points available
                </p>
            </div>
        `;
    }

    renderEmptyState(title, subtitle) {
        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>${title}</h3>
                <p>${subtitle}</p>
            </div>
        `;
    }

    openRowDrawer(id, type) {
        const drawer = document.getElementById('rightDrawer');
        const title = document.getElementById('drawerTitle');
        const content = document.getElementById('drawerContent');
        
        if (!drawer || !title || !content) return;

        title.textContent = `${type.toUpperCase()} Details`;
        content.innerHTML = this.renderDrawerContent(id, type);
        
        drawer.classList.add('open');
        this.state.rightDrawerOpen = true;
        
        // Close drawer handler
        const closeBtn = document.getElementById('drawerClose');
        if (closeBtn) {
            closeBtn.onclick = () => {
                drawer.classList.remove('open');
                this.state.rightDrawerOpen = false;
            };
        }
    }

    renderDrawerContent(id, type) {
        switch (type) {
            case 'ev':
                const evOpp = this.data.evOpportunities.find(o => o.id === id);
                return this.renderEVDrawerContent(evOpp);
            case 'arb':
                const arbOpp = this.data.arbOpportunities.find(o => o.id === id);
                return this.renderArbDrawerContent(arbOpp);
            case 'prop':
                const prop = this.data.props.find(p => p.id === id);
                return this.renderPropDrawerContent(prop);
            default:
                return '<p>Details not available</p>';
        }
    }

    renderEVDrawerContent(opp) {
        if (!opp) return '<p>Opportunity not found</p>';
        
        return `
            <div class="drawer-section">
                <h4>Expected Value Analysis</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Fair Odds</span>
                        <span class="stat-value">${this.formatOdds(opp.fairOdds)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Book Odds</span>
                        <span class="stat-value">${this.formatOdds(opp.odds)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Expected Value</span>
                        <span class="stat-value">+${opp.ev.toFixed(2)}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Kelly Size</span>
                        <span class="stat-value">${(opp.kelly * this.filters.kellyFraction * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            <div class="drawer-section">
                <h4>Bet Details</h4>
                <p><strong>Selection:</strong> ${opp.side === 'home' ? opp.homeTeam : opp.awayTeam}</p>
                <p><strong>Bookmaker:</strong> ${opp.bookmaker}</p>
                <p><strong>Market Hold:</strong> ${opp.hold.toFixed(2)}%</p>
            </div>
        `;
    }

    renderArbDrawerContent(opp) {
        if (!opp) return '<p>Opportunity not found</p>';
        
        return `
            <div class="drawer-section">
                <h4>Arbitrage Calculator</h4>
                <div class="arb-calculator">
                    <div class="input-group">
                        <label>Total Stake ($)</label>
                        <input type="number" id="arbStake" value="1000" min="1">
                    </div>
                    <div class="stake-breakdown" id="stakeBreakdown">
                        <div class="stake-item">
                            <span>${opp.book1} (${opp.side1})</span>
                            <span>$${(1000 * opp.stake1Ratio).toFixed(2)}</span>
                        </div>
                        <div class="stake-item">
                            <span>${opp.book2} (${opp.side2})</span>
                            <span>$${(1000 * opp.stake2Ratio).toFixed(2)}</span>
                        </div>
                        <div class="stake-item total">
                            <span>Guaranteed Profit</span>
                            <span>$${(1000 * opp.profit / 100).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderPropDrawerContent(prop) {
        if (!prop) return '<p>Player not found</p>';
        
        return `
            <div class="drawer-section">
                <div class="player-header">
                    <img class="player-photo-large" src="${prop.photo}" alt="${prop.playerName}">
                    <div>
                        <h4>${prop.playerName}</h4>
                        <p>${prop.team} • ${prop.position}</p>
                    </div>
                </div>
            </div>
            <div class="drawer-section">
                <h4>Recent Performance</h4>
                <div class="recent-games">
                    ${prop.recentForm.last5Games.map((game, i) => `
                        <div class="game-stat">
                            <span>Game ${i + 1}</span>
                            <span>${game.points}pts, ${game.rebounds}reb, ${game.assists}ast</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="drawer-section">
                <h4>Available Props</h4>
                ${prop.props.map(p => `
                    <div class="prop-item">
                        <span>${p.market}</span>
                        <span class="ev-pill ${p.ev >= this.filters.evThreshold ? 'positive' : 'neutral'}">
                            +${p.ev.toFixed(1)}%
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    openStakeCalculator(arbId) {
        const modal = document.getElementById('stakeCalculatorModal');
        const details = document.getElementById('arbDetails');
        const results = document.getElementById('stakeResults');
        
        if (!modal || !details || !results) return;

        const arb = this.data.arbOpportunities.find(a => a.id === arbId);
        if (!arb) return;

        details.innerHTML = `
            <h4>${arb.homeTeam} vs ${arb.awayTeam}</h4>
            <p><strong>${arb.book1}:</strong> ${arb.side1} @ ${this.formatOdds(arb.odds1)}</p>
            <p><strong>${arb.book2}:</strong> ${arb.side2} @ ${this.formatOdds(arb.odds2)}</p>
            <p><strong>Guaranteed Profit:</strong> ${arb.profit.toFixed(2)}%</p>
        `;

        const updateStakes = () => {
            const bankroll = parseFloat(document.getElementById('totalBankroll').value) || 1000;
            const stake1 = bankroll * arb.stake1Ratio;
            const stake2 = bankroll * arb.stake2Ratio;
            const profit = bankroll * arb.profit / 100;

            results.innerHTML = `
                <div class="stake-result">
                    <span><strong>${arb.book1}</strong> (${arb.side1})</span>
                    <span>$${stake1.toFixed(2)}</span>
                </div>
                <div class="stake-result">
                    <span><strong>${arb.book2}</strong> (${arb.side2})</span>
                    <span>$${stake2.toFixed(2)}</span>
                </div>
                <div class="stake-result profit">
                    <span><strong>Guaranteed Profit</strong></span>
                    <span>$${profit.toFixed(2)}</span>
                </div>
            `;
        };

        // Update stakes on input change
        const bankrollInput = document.getElementById('totalBankroll');
        if (bankrollInput) {
            bankrollInput.addEventListener('input', updateStakes);
            updateStakes(); // Initial calculation
        }

        modal.classList.add('active');
    }

    startPolling() {
        // Poll for data every 30 seconds
        setInterval(() => {
            if (!this.state.loading) {
                this.loadData();
            }
        }, 30000);
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const app = document.getElementById('app');
        
        if (loadingScreen && app) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                app.classList.remove('hidden');
            }, 1000);
        }
    }

    // Utility functions
    calculateFairOdds(homeOdds, awayOdds) {
        const homeImplied = 1 / homeOdds;
        const awayImplied = 1 / awayOdds;
        const totalImplied = homeImplied + awayImplied;
        
        const fairHomeProb = homeImplied / totalImplied;
        const fairAwayProb = awayImplied / totalImplied;
        
        return [1 / fairHomeProb, 1 / fairAwayProb];
    }

    calculateEV(fairProb, bookOdds) {
        const impliedProb = 1 / bookOdds;
        return ((fairProb - impliedProb) / impliedProb) * 100;
    }

    calculateKelly(fairProb, bookOdds) {
        const b = bookOdds - 1; // net odds
        const p = fairProb;
        const q = 1 - p;
        return Math.max(0, (b * p - q) / b);
    }

    calculateHold(outcomes) {
        const totalImplied = outcomes.reduce((sum, outcome) => sum + (1 / outcome.price), 0);
        return (totalImplied - 1) * 100;
    }

    detectArbitrage(odds1, odds2) {
        const implied1 = 1 / odds1;
        const implied2 = 1 / odds2;
        const totalImplied = implied1 + implied2;
        
        if (totalImplied < 1) {
            const profit = ((1 - totalImplied) / totalImplied) * 100;
            return {
                isArb: profit >= 1.5,
                profit,
                stake1Ratio: implied1 / totalImplied,
                stake2Ratio: implied2 / totalImplied
            };
        }
        
        return { isArb: false };
    }

    detect3WayArbitrage(odds1Array, odds2Array) {
        // Simplified 3-way arbitrage detection
        const bestOdds = [
            Math.max(odds1Array[0], odds2Array[0]),
            Math.max(odds1Array[1], odds2Array[1]),
            Math.max(odds1Array[2], odds2Array[2])
        ];
        
        const totalImplied = bestOdds.reduce((sum, odds) => sum + (1 / odds), 0);
        
        if (totalImplied < 1) {
            const profit = ((1 - totalImplied) / totalImplied) * 100;
            return {
                isArb: profit >= 1.5,
                profit,
                stakes: bestOdds.map(odds => (1 / odds) / totalImplied)
            };
        }
        
        return { isArb: false };
    }

    calculatePropEV(prop) {
        // Simplified prop EV calculation
        return Math.random() * 10; // Placeholder
    }

    calculateZScore(prop, recentForm) {
        // Simplified Z-score calculation
        return Math.random() * 2 - 1; // Placeholder
    }

    formatOdds(decimal) {
        if (decimal >= 2) {
            return `+${Math.round((decimal - 1) * 100)}`;
        } else {
            return `${Math.round(-100 / (decimal - 1))}`;
        }
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    copyBet(id) {
        const opp = this.data.evOpportunities.find(o => o.id === id);
        if (!opp) return;
        
        const text = `${opp.homeTeam} vs ${opp.awayTeam} - ${opp.side} @ ${this.formatOdds(opp.odds)} (${opp.bookmaker}) - EV: +${opp.ev.toFixed(1)}%`;
        navigator.clipboard.writeText(text);
        this.showToast('Bet copied to clipboard!');
    }

    copyArb(id) {
        const arb = this.data.arbOpportunities.find(a => a.id === id);
        if (!arb) return;
        
        const text = `ARB: ${arb.homeTeam} vs ${arb.awayTeam} - ${arb.book1} ${arb.side1} @ ${this.formatOdds(arb.odds1)} + ${arb.book2} ${arb.side2} @ ${this.formatOdds(arb.odds2)} - Profit: ${arb.profit.toFixed(1)}%`;
        navigator.clipboard.writeText(text);
        this.showToast('Arbitrage copied to clipboard!');
    }

    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    showError(message) {
        this.showToast(message, 'error');
    }
}

// Initialize the application
const app = new EdgeFinderPro();

// Make app globally available for debugging
window.app = app;