# EdgeFinder EV Engine

A comprehensive multi-sport Expected Value (EV) calculation engine for sports betting. This single-file TypeScript service provides real-time odds analysis, statistical modeling, and EV calculations across multiple sports.

## Features

- **Multi-Sport Support**: MLB, NBA, NHL, Soccer (EPL, MLS, etc.)
- **Real-Time Odds**: Integration with The Odds API for live bookmaker prices
- **Advanced De-Vig**: Proportional and Shin methods for removing bookmaker margin
- **Statistical Integration**: Free APIs for team/player statistics
- **EV Calculations**: Expected value analysis with Kelly Criterion sizing
- **Sharp Reference**: Optional Betfair Exchange integration
- **Zero Dependencies**: Built with Node.js built-ins only

## Quick Start

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Run the Server**:
   ```bash
   npm run dev
   ```

4. **Test the API**:
   ```bash
   curl http://localhost:3000/health
   ```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and configured services.

### Odds Data
```
GET /odds/:league?markets=h2h,spreads,totals&region=us&eventId=<id>
```
Get real-time odds from multiple bookmakers.

**Supported Leagues**: `mlb`, `nba`, `nhl`, `nfl`, `epl`, `mls`, `uefa`

### Statistics
```
GET /stats/:league/:id
```
Get team or player statistics for modeling.

### Expected Value
```
GET /ev/:league/:eventId?markets=h2h&devig=proportional&prior_weight=0.2
```
Calculate expected value across all bookmakers for an event.

**Parameters**:
- `devig`: `proportional` (default) or `shin`
- `prior_weight`: How much to weight statistical priors (0.0-1.0)

## Example Usage

### Get MLB Odds
```bash
curl "http://localhost:3000/odds/mlb?markets=h2h&region=us"
```

### Calculate EV for Specific Game
```bash
curl "http://localhost:3000/ev/mlb/EVENT_ID?devig=shin&prior_weight=0.3"
```

### Get Team Statistics
```bash
curl "http://localhost:3000/stats/mlb/147"  # Yankees team ID
```

## Configuration

### Required API Keys

- **The Odds API**: Get free key at [the-odds-api.com](https://the-odds-api.com/)
  - 500 free requests/month
  - Real-time odds from 40+ bookmakers

### Optional API Keys

- **Football Data**: Get free key at [football-data.org](https://www.football-data.org/)
  - Soccer statistics and fixtures
  - 10 requests/minute free tier

- **Betfair Exchange**: Developer account required
  - Sharp reference prices
  - Complex OAuth implementation (TODO)

### Free APIs (No Key Required)

- **MLB Stats API**: Complete baseball statistics
- **NHL API**: Hockey team and player data  
- **NBA Stats**: Basketball data (rate limited)

## EV Calculation Methods

### De-Vig Methods

1. **Proportional** (Default):
   - Removes bookmaker margin proportionally
   - Simple and effective for most markets
   - Formula: `fair_prob = implied_prob / sum(implied_probs)`

2. **Shin Method**:
   - Accounts for insider trading
   - More sophisticated for sharp markets
   - Estimates informed money parameter

### Prior Integration

The engine blends market-derived probabilities with statistical priors:

```typescript
blended_prob = (1 - prior_weight) * market_prob + prior_weight * model_prob
```

**Current Priors** (TODO: Enhance):
- MLB: Home advantage ~54%
- NBA: Home advantage ~60%  
- NHL: Home advantage ~55%
- Soccer: Home advantage ~46%

## Development Roadmap

### Immediate TODOs

1. **Enhanced Priors**:
   - MLB: Pitcher matchups, park factors, weather
   - NBA: Rest, pace, injuries, efficiency ratings
   - NHL: Goalie matchups, special teams, travel
   - Soccer: xG models, form, head-to-head

2. **Betfair Integration**:
   - OAuth flow implementation
   - Real-time price streaming
   - Exchange commission handling

3. **Risk Management**:
   - Bankroll management tools
   - Correlation analysis
   - Portfolio optimization

### Advanced Features

- Machine learning models for each sport
- Real-time line movement tracking
- Arbitrage opportunity detection
- Historical EV performance tracking
- Multi-way market support (3-way soccer, player props)

## Architecture

This is intentionally a single-file application for:
- Easy deployment and modification
- Clear code organization
- Minimal dependencies
- Educational value

The modular structure within the single file makes it easy to extract components as the system grows.

## Performance Notes

- Built-in request timeouts and retries
- Graceful degradation when APIs are unavailable
- Efficient caching opportunities (not implemented)
- Rate limiting considerations for external APIs

## License

MIT License - See LICENSE file for details.

## Contributing

This is a teaching-quality baseline. Contributions welcome for:
- Enhanced statistical models
- Additional sports/leagues
- Performance optimizations
- Better error handling
- Comprehensive testing

## Disclaimer

This software is for educational and research purposes. Sports betting involves risk. Always gamble responsibly and within your means. Check local laws regarding sports betting legality.