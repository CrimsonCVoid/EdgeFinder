/**
 * Load environment variables from .env file
 */
import dotenv from 'dotenv';
dotenv.config();

/**
 * EdgeFinder Pro - EV & Arbitrage Detection Engine
 * 
 * A professional-grade sports betting analytics platform that:
 * - Detects positive expected value (+EV) opportunities
 * - Identifies arbitrage opportunities across sportsbooks
 * - Uses Pinnacle as baseline for fair odds calculation
 * - Provides stake calculators and risk management tools
 *
 * Endpoints:
 *   GET /health
 *   GET /api/odds/:sport?market=h2h&region=us
 *   GET /api/ev-opportunities/:sport
 *   GET /api/arbitrage-opportunities/:sport
 *   GET /api/player-props/:sport
 *   GET /fixtures (test data)
 *
 * Features:
 *   - Real-time odds from 40+ sportsbooks via The Odds API
 *   - Pinnacle-based fair value calculations
 *   - Advanced arbitrage detection with stake calculators
 *   - Player props integration
 *   - Mobile-responsive professional UI
 */

import http from "node:http";
import { URL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// Import configuration
const config = require('./config.js');

// ====== Config / Env =========================================================
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Keys (optional where noted)
const ODDS_API_KEY = config.env?.ODDS_API_KEY || process.env.ODDS_API_KEY || "";
const PLAYER_API_KEY = config.env?.PLAYER_API_KEY || process.env.PLAYER_API_KEY || "";
const BASELINE_BOOK = config.env?.BASELINE_BOOK || process.env.BASELINE_BOOK || "pinnacle";

// External base URLs
const ODDS_API = "https://api.the-odds-api.com/v4";

// Debug: Log environment variables
console.log('🔍 EdgeFinder Pro Configuration:');
console.log('ODDS_API_KEY:', ODDS_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('PLAYER_API_KEY:', PLAYER_API_KEY ? '✅ Configured' : '❌ Missing');
console.log('BASELINE_BOOK:', BASELINE_BOOK);

// Type definitions for better code clarity
interface APIResponse {
  error: string | null;
  data: any[];
}

interface EVOpportunity {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  side: 'home' | 'away';
  bookmaker: string;
  odds: number;
  fairOdds: number;
  ev: number;
  hold: number;
}

interface ArbitrageOpportunity {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  book1: string;
  book2: string;
  odds1: number;
  odds2: number;
  side1: 'home' | 'away';
  side2: 'home' | 'away';
  profit: number;
  stake1Ratio: number;
  stake2Ratio: number;
}

interface PlayerProp {
  id: string;
  playerName: string;
  team: string;
  market: string;
  fairLine: string;
  bestLine: string;
  bookmaker: string;
  ev: number;
}

// Simple fetch with timeout and retry logic
async function fetchT(url: string, init: RequestInit = {}, timeoutMs = 10000, retries = 2): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, { ...init, signal: ctrl.signal });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt < retries) {
        // Exponential backoff: wait 1s, then 2s
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error("Fetch failed after retries");
}

// ====== Core Odds & Analytics Functions =====================================

/**
 * Fetch odds from The Odds API for a specific sport
 */
async function fetchOddsForSport(sport: string, market = "h2h", region = "us"): Promise<APIResponse> {
  if (!ODDS_API_KEY) {
    return { error: "ODDS_API_KEY not configured", data: [] };
  }
  
  const sportConfig = config.sports?.[sport];
  const sportKey = sportConfig?.key;
  
  if (!sportKey) {
    return { error: `Unsupported sport '${sport}'`, data: [] };
  }

  const url = new URL(`${ODDS_API}/sports/${sportKey}/odds`);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("regions", region);
  url.searchParams.set("markets", market);
  url.searchParams.set("oddsFormat", "decimal");

  try {
    const res = await fetchT(url.toString());
    if (!res.ok) {
      const text = await res.text();
      return { error: `Odds API error ${res.status}: ${text}`, data: [] };
    }
    const json = await res.json();
    return { error: null, data: json };
  } catch (error) {
    return { error: `Network error: ${(error as Error).message}`, data: [] };
  }
}

/**
 * Calculate fair odds using Pinnacle as baseline (remove vig)
 */
function calculateFairOdds(pinnacleHomeOdds: number, pinnacleAwayOdds: number): [number, number] {
  const homeImplied = 1 / pinnacleHomeOdds;
  const awayImplied = 1 / pinnacleAwayOdds;
  const totalImplied = homeImplied + awayImplied;
  
  // Remove vig proportionally
  const fairHomeProb = homeImplied / totalImplied;
  const fairAwayProb = awayImplied / totalImplied;
  
  return [1 / fairHomeProb, 1 / fairAwayProb];
}

/**
 * Calculate Expected Value percentage
 */
function calculateEV(fairProb: number, bookOdds: number): number {
  const impliedProb = 1 / bookOdds;
  return ((fairProb - impliedProb) / impliedProb) * 100;
}

/**
 * Detect arbitrage opportunities between two odds
 */
function detectArbitrage(odds1: number, odds2: number): { isArb: boolean; profit?: number; stake1Ratio?: number; stake2Ratio?: number } {
  const implied1 = 1 / odds1;
  const implied2 = 1 / odds2;
  const totalImplied = implied1 + implied2;
  
  if (totalImplied < 1) {
    const profit = ((1 - totalImplied) / totalImplied) * 100;
    return {
      isArb: profit >= 1.5, // Minimum 1.5% profit threshold
      profit,
      stake1Ratio: implied1 / totalImplied,
      stake2Ratio: implied2 / totalImplied
    };
  }
  
  return { isArb: false };
}

/**
 * Process odds data to find EV and arbitrage opportunities
 */
function processOddsData(oddsData: any[]): { evOpportunities: EVOpportunity[]; arbOpportunities: ArbitrageOpportunity[] } {
  const evOpportunities: EVOpportunity[] = [];
  const arbOpportunities: ArbitrageOpportunity[] = [];
  
  oddsData.forEach(game => {
    if (!game.bookmakers || game.bookmakers.length < 2) return;
    
    // Find Pinnacle (baseline)
    const pinnacle = game.bookmakers.find((b: any) => b.key === 'pinnacle');
    if (!pinnacle || !pinnacle.markets?.[0]?.outcomes) return;
    
    const pinnacleMarket = pinnacle.markets[0];
    const pinnacleHomeOdds = pinnacleMarket.outcomes[0].price;
    const pinnacleAwayOdds = pinnacleMarket.outcomes[1].price;
    
    // Calculate fair odds
    const [fairHomeOdds, fairAwayOdds] = calculateFairOdds(pinnacleHomeOdds, pinnacleAwayOdds);
    const fairHomeProb = 1 / fairHomeOdds;
    const fairAwayProb = 1 / fairAwayOdds;
    
    // Check each bookmaker for EV opportunities
    game.bookmakers.forEach((bookmaker: any) => {
      if (bookmaker.key === 'pinnacle' || !bookmaker.markets?.[0]?.outcomes) return;
      
      const market = bookmaker.markets[0];
      const homeOdds = market.outcomes[0].price;
      const awayOdds = market.outcomes[1].price;
      
      // Calculate EV for both sides
      const homeEV = calculateEV(fairHomeProb, homeOdds);
      const awayEV = calculateEV(fairAwayProb, awayOdds);
      
      // Add +EV opportunities (threshold: 2%)
      if (homeEV >= 2.0) {
        evOpportunities.push({
          id: game.id,
          sport: game.sport_title,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          commenceTime: game.commence_time,
          side: 'home',
          bookmaker: bookmaker.title,
          odds: homeOdds,
          fairOdds: fairHomeOdds,
          ev: homeEV,
          hold: ((1/pinnacleHomeOdds + 1/pinnacleAwayOdds - 1) * 100)
        });
      }
      
      if (awayEV >= 2.0) {
        evOpportunities.push({
          id: game.id,
          sport: game.sport_title,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          commenceTime: game.commence_time,
          side: 'away',
          bookmaker: bookmaker.title,
          odds: awayOdds,
          fairOdds: fairAwayOdds,
          ev: awayEV,
          hold: ((1/pinnacleHomeOdds + 1/pinnacleAwayOdds - 1) * 100)
        });
      }
    });
    
    // Check for arbitrage opportunities
    const bookmakers = game.bookmakers.filter((b: any) => b.markets?.[0]?.outcomes);
    for (let i = 0; i < bookmakers.length; i++) {
      for (let j = i + 1; j < bookmakers.length; j++) {
        const book1 = bookmakers[i];
        const book2 = bookmakers[j];
        
        const book1HomeOdds = book1.markets[0].outcomes[0].price;
        const book1AwayOdds = book1.markets[0].outcomes[1].price;
        const book2HomeOdds = book2.markets[0].outcomes[0].price;
        const book2AwayOdds = book2.markets[0].outcomes[1].price;
        
        // Check home@book1 vs away@book2
        const arb1 = detectArbitrage(book1HomeOdds, book2AwayOdds);
        if (arb1.isArb) {
          arbOpportunities.push({
            id: game.id,
            sport: game.sport_title,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            book1: book1.title,
            book2: book2.title,
            odds1: book1HomeOdds,
            odds2: book2AwayOdds,
            side1: 'home',
            side2: 'away',
            profit: arb1.profit!,
            stake1Ratio: arb1.stake1Ratio!,
            stake2Ratio: arb1.stake2Ratio!
          });
        }
        
        // Check away@book1 vs home@book2
        const arb2 = detectArbitrage(book1AwayOdds, book2HomeOdds);
        if (arb2.isArb) {
          arbOpportunities.push({
            id: game.id,
            sport: game.sport_title,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            book1: book1.title,
            book2: book2.title,
            odds1: book1AwayOdds,
            odds2: book2HomeOdds,
            side1: 'away',
            side2: 'home',
            profit: arb2.profit!,
            stake1Ratio: arb2.stake1Ratio!,
            stake2Ratio: arb2.stake2Ratio!
          });
        }
      }
    }
  });
  
  return { evOpportunities, arbOpportunities };
}

/**
 * Generate mock player props data
 */
function generateMockProps(): PlayerProp[] {
  return [
    {
      id: 'prop1',
      playerName: 'Aaron Judge',
      team: 'NYY',
      market: 'Home Runs O/U 0.5',
      fairLine: '+180',
      bestLine: '+220',
      bookmaker: 'DraftKings',
      ev: 3.2
    },
    {
      id: 'prop2',
      playerName: 'Mookie Betts',
      team: 'LAD',
      market: 'Hits O/U 1.5',
      fairLine: '-120',
      bestLine: '-105',
      bookmaker: 'FanDuel',
      ev: 2.8
    }
  ];
}

// ====== Test Fixtures ======================================================

/**
 * Get test fixtures for development
 */
function getTestFixtures() {
  return {
    odds: [
      {
        id: 'test_mlb_1',
        sport_title: 'MLB',
        home_team: 'New York Yankees',
        away_team: 'Boston Red Sox',
        commence_time: '2024-04-15T19:10:00Z',
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
          },
          {
            key: 'fanduel',
            title: 'FanDuel',
            markets: [{
              key: 'h2h',
              outcomes: [
                { name: 'New York Yankees', price: 2.20 },
                { name: 'Boston Red Sox', price: 1.75 }
              ]
            }]
          }
        ]
      },
      {
        id: 'test_nba_1',
        sport_title: 'NBA',
        home_team: 'Los Angeles Lakers',
        away_team: 'Boston Celtics',
        commence_time: '2024-04-15T20:00:00Z',
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
          },
          {
            key: 'betmgm',
            title: 'BetMGM',
            markets: [{
              key: 'h2h',
              outcomes: [
                { name: 'Los Angeles Lakers', price: 2.10 },
                { name: 'Boston Celtics', price: 1.85 }
              ]
            }]
          }
        ]
      }
    ]
  };
}


// ====== HTTP Routing =========================================================

function sendJSON(res: http.ServerResponse, code: number, payload: any): void {
  res.writeHead(code, { 
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendError(res: http.ServerResponse, code: number, message: string): void {
  sendJSON(res, code, { error: message, timestamp: new Date().toISOString() });
}

function serveStaticFile(res: http.ServerResponse, filePath: string): void {
  const fullPath = path.join(process.cwd(), 'public', filePath);
  
  // Security check - ensure we're serving from public directory
  if (!fullPath.startsWith(path.join(process.cwd(), 'public'))) {
    return sendError(res, 403, "Forbidden");
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      return sendError(res, 404, "File not found");
    }

    // Set content type based on file extension
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    };

    const contentType = contentTypes[ext] || 'text/plain';
    res.writeHead(200, { 
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}
const server = http.createServer(async (req, res) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return sendJSON(res, 200, { ok: true });
    }

    if (!req.url) return sendError(res, 400, "No URL provided");
    
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    // Serve static files from public directory
    if (req.method === "GET" && path !== "/" && !path.startsWith("/api/") && !path.startsWith("/odds/") && !path.startsWith("/stats/") && !path.startsWith("/ev/") && !path.startsWith("/health")) {
      const filePath = path === "/" ? "index.html" : path.substring(1);
      return serveStaticFile(res, filePath);
    }

    // Configuration endpoint
    if (req.method === "GET" && path === "/config") {
      const clientConfig = {
        leagues: config.leagues || {},
        markets: config.markets || {},
        features: config.features || {},
        ui: config.ui || {}
      };
      return sendJSON(res, 200, clientConfig);
    }

    // Health check endpoint
    if (req.method === "GET" && path === "/health") {
      const status = {
        ok: true,
        timestamp: new Date().toISOString(),
        version: "2.0.0",
        environment: process.env.NODE_ENV || "development",
        services: {
          odds_api: !!ODDS_API_KEY,
          player_api: !!PLAYER_API_KEY,
          baseline_book: BASELINE_BOOK
        },
        config: {
          baseline_book: BASELINE_BOOK,
          supported_sports: Object.keys(config.sports || {}),
          supported_books: Object.keys(config.sportsbooks || {})
        }
      };
      return sendJSON(res, 200, status);
    }

    // Root endpoint - serve web app
    if (req.method === "GET" && path === "/") {
      return serveStaticFile(res, "index.html");
    }

    // API endpoints
    if (req.method === "GET" && path.startsWith("/api/")) {
      const pathParts = path.split("/");
      const endpoint = pathParts[2];
      const param = pathParts[3];

      // /api/odds/:sport
      if (endpoint === "odds" && param) {
        const sport = param.toUpperCase();
        const market = url.searchParams.get("market") || "h2h";
        const region = url.searchParams.get("region") || "us";

        const oddsResponse = await fetchOddsForSport(sport, market, region);
        return sendJSON(res, 200, oddsResponse);
      }

      // /api/ev-opportunities/:sport
      if (endpoint === "ev-opportunities" && param) {
        const sport = param.toUpperCase();
        const oddsResponse = await fetchOddsForSport(sport);
        
        if (oddsResponse.error) {
          return sendJSON(res, 200, { error: oddsResponse.error, data: [] });
        }
        
        const { evOpportunities } = processOddsData(oddsResponse.data);
        return sendJSON(res, 200, { error: null, data: evOpportunities });
      }

      // /api/arbitrage-opportunities/:sport
      if (endpoint === "arbitrage-opportunities" && param) {
        const sport = param.toUpperCase();
        const oddsResponse = await fetchOddsForSport(sport);
        
        if (oddsResponse.error) {
          return sendJSON(res, 200, { error: oddsResponse.error, data: [] });
        }
        
        const { arbOpportunities } = processOddsData(oddsResponse.data);
        return sendJSON(res, 200, { error: null, data: arbOpportunities });
      }

      // /api/player-props/:sport
      if (endpoint === "player-props" && param) {
        const props = generateMockProps();
        return sendJSON(res, 200, { error: null, data: props });
      }
    }

    // Test fixtures endpoint
    if (req.method === "GET" && path === "/fixtures") {
      const fixtures = getTestFixtures();
      return sendJSON(res, 200, fixtures);
    }

    // Fallback for unknown routes
    return sendError(res, 404, `Route not found: ${path}`);

  } catch (err: any) {
    console.error("Server error:", err);
    return sendError(res, 500, err?.message || "Internal server error");
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 EdgeFinder Pro - EV & Arbitrage Detection running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health`);
  console.log(`   GET /api/odds/:sport?market=h2h&region=us`);
  console.log(`   GET /api/ev-opportunities/:sport`);
  console.log(`   GET /api/arbitrage-opportunities/:sport`);
  console.log(`   GET /api/player-props/:sport`);
  console.log(`   GET /fixtures (test data)`);
  console.log(`🔑 API Keys configured:`);
  console.log(`   Odds API: ${ODDS_API_KEY ? '✅' : '❌'}`);
  console.log(`   Player API: ${PLAYER_API_KEY ? '✅' : '❌'}`);
  console.log(`📍 Baseline Book: ${BASELINE_BOOK}`);
  console.log(`🎯 Features: +EV Detection, Arbitrage Detection, Stake Calculator`);
  console.log(`🌐 Web App: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down EdgeFinder Pro...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});