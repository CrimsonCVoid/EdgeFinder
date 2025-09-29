/**
 * Load environment variables from .env file
 */
import dotenv from 'dotenv';
dotenv.config();

// Import configuration
import * as config from './config.js';

/**
 * EdgeFinder EV Engine (single-file service)
 * - Odds: The Odds API (per-bookmaker)
 * - Sharp reference (optional): Betfair Exchange
 * - Stats: MLB (no key), NBA (stats.nba.com), NHL, Soccer (football-data.org)
 *
 * Endpoints:
 *   GET /health
 *   GET /odds/:league?eventId=&markets=h2h,spreads,totals&region=us
 *   GET /stats/:league/:id
 *   GET /ev/:league/:eventId?markets=h2h&region=us&devig=proportional|shin
 *
 * Notes:
 *   - Works without any keys (MLB stats only). Add keys via env for more.
 *   - This is a teaching-quality baseline with clear TODOs to deepen models.
 */

import http from "node:http";
import { URL } from "node:url";
import path from "node:path";
import fs from "node:fs";

// ====== Config / Env =========================================================
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Debug: Log environment variables
console.log('🔍 Environment Debug:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('ODDS_API_KEY exists:', !!process.env.ODDS_API_KEY);
console.log('ODDS_API_KEY length:', process.env.ODDS_API_KEY?.length || 0);
console.log('ODDS_API_KEY value:', process.env.ODDS_API_KEY ? 'SET' : 'NOT SET');

// Keys (optional where noted)
const ODDS_API_KEY = process.env.ODDS_API_KEY || "";
const BETFAIR_APP_KEY = process.env.BETFAIR_APP_KEY || ""; // optional
const BETFAIR_USERNAME = process.env.BETFAIR_USERNAME || ""; // optional
const BETFAIR_PASSWORD = process.env.BETFAIR_PASSWORD || ""; // optional
const FOOTBALL_DATA_KEY = process.env.FOOTBALL_DATA_KEY || ""; // optional

// External base URLs
const ODDS_API = "https://api.the-odds-api.com/v4";
const MLB_STATS = "https://statsapi.mlb.com/api/v1";
const NHL_API = "https://statsapi.web.nhl.com/api/v1";
const NBA_STATS = "https://stats.nba.com/stats"; // server-side only; client-side is often blocked/CORS/ToS
const FOOTBALL_DATA = "https://api.football-data.org/v4";

// Supported leagues mapping to Odds API sport keys (extend as needed)
const LEAGUE_TO_ODDS_KEY: Record<string, string> = {
  nfl: "americanfootball_nfl",
  nba: "basketball_nba",
  mlb: "baseball_mlb",
  nhl: "icehockey_nhl",
  epl: "soccer_epl",
  uefa: "soccer_uefa_champs_league",
  mls: "soccer_usa_mls",
  bundesliga: "soccer_germany_bundesliga",
  laliga: "soccer_spain_la_liga",
  seriea: "soccer_italy_serie_a",
  ligue1: "soccer_france_ligue_one",
};

// Type definitions for better code clarity
interface OddsResponse {
  error: string | null;
  data: any[];
}

interface StatsResponse {
  error: string | null;
  data: any;
}

interface EVResult {
  eventId: string;
  league: string;
  markets: Record<string, any[]>;
}

interface Selection {
  name: string;
  american: number;
  implied: number;
  fair: number;
  blended: number;
  ev_100: number;
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

// ====== Odds: The Odds API ===================================================

/**
 * Get per-bookmaker odds for a given league + optional eventId.
 * markets: comma list e.g., "h2h,spreads,totals"
 * region: "us"|"uk"|"au" etc.
 */
async function getOddsByLeague(
  league: string, 
  markets = "h2h,spreads,totals", 
  region = "us", 
  eventId?: string
): Promise<OddsResponse> {
  if (!ODDS_API_KEY) {
    return { error: "ODDS_API_KEY not set; odds unavailable", data: [] };
  }
  
  const sportKey = LEAGUE_TO_ODDS_KEY[league.toLowerCase()];
  if (!sportKey) {
    return { error: `Unsupported league '${league}'. Supported: ${Object.keys(LEAGUE_TO_ODDS_KEY).join(', ')}`, data: [] };
  }

  const base = eventId
    ? `${ODDS_API}/sports/${sportKey}/events/${eventId}/odds`
    : `${ODDS_API}/sports/${sportKey}/odds`;

  const url = new URL(base);
  url.searchParams.set("apiKey", ODDS_API_KEY);
  url.searchParams.set("regions", region);
  url.searchParams.set("markets", markets);
  url.searchParams.set("oddsFormat", "american");

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

// ====== Stats: MLB (no key required) =========================================

/**
 * MLB Stats API integration - completely free, no authentication required
 * Provides comprehensive team and player statistics
 */
async function mlbTeamById(teamId: string): Promise<StatsResponse> {
  const url = `${MLB_STATS}/teams/${teamId}`;
  try {
    const res = await fetchT(url);
    if (!res.ok) return { error: `MLB Stats error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `MLB network error: ${(error as Error).message}`, data: null };
  }
}

async function mlbScheduleByDate(dateISO: string): Promise<StatsResponse> {
  const url = `${MLB_STATS}/schedule?sportId=1&date=${encodeURIComponent(dateISO)}`;
  try {
    const res = await fetchT(url);
    if (!res.ok) return { error: `MLB Stats error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `MLB network error: ${(error as Error).message}`, data: null };
  }
}

async function mlbPlayerStats(playerId: string, season?: string): Promise<StatsResponse> {
  const currentSeason = season || new Date().getFullYear().toString();
  const url = `${MLB_STATS}/people/${playerId}/stats?stats=season&season=${currentSeason}`;
  try {
    const res = await fetchT(url);
    if (!res.ok) return { error: `MLB Stats error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `MLB network error: ${(error as Error).message}`, data: null };
  }
}

// ====== Stats: NHL (public API) ==============================================

async function nhlTeamById(teamId: string): Promise<StatsResponse> {
  const url = `${NHL_API}/teams/${teamId}`;
  try {
    const res = await fetchT(url);
    if (!res.ok) return { error: `NHL API error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `NHL network error: ${(error as Error).message}`, data: null };
  }
}

async function nhlTeamStats(teamId: string, season?: string): Promise<StatsResponse> {
  // NHL seasons are formatted as "20232024" for 2023-24 season
  const currentYear = new Date().getFullYear();
  const nhlSeason = season || `${currentYear}${currentYear + 1}`;
  const url = `${NHL_API}/teams/${teamId}/stats?season=${nhlSeason}`;
  try {
    const res = await fetchT(url);
    if (!res.ok) return { error: `NHL API error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `NHL network error: ${(error as Error).message}`, data: null };
  }
}

// ====== Stats: NBA (server-side only) ========================================
// Note: NBA endpoints often require specific headers and are rate-limited/TOS-controlled.
// For demo, we'll include a placeholder request pattern.

async function nbaTeamSchedule(teamId: string, season?: string): Promise<StatsResponse> {
  const currentYear = new Date().getFullYear();
  const nbaSeason = season || `${currentYear - 1}-${(currentYear % 100).toString().padStart(2, "0")}`;
  
  const url = `${NBA_STATS}/teamschedule?TeamID=${encodeURIComponent(teamId)}&Season=${encodeURIComponent(nbaSeason)}&SeasonType=Regular%20Season`;
  
  try {
    const res = await fetchT(url, {
      headers: {
        // Typical headers used by community clients; adjust as needed.
        "Origin": "https://www.nba.com",
        "Referer": "https://www.nba.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { error: `NBA stats error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `NBA network error: ${(error as Error).message}`, data: null };
  }
}

async function nbaTeamStats(teamId: string, season?: string): Promise<StatsResponse> {
  const currentYear = new Date().getFullYear();
  const nbaSeason = season || `${currentYear - 1}-${(currentYear % 100).toString().padStart(2, "0")}`;
  
  const url = `${NBA_STATS}/teamdashboardbygeneralsplits?TeamID=${encodeURIComponent(teamId)}&Season=${encodeURIComponent(nbaSeason)}&SeasonType=Regular%20Season`;
  
  try {
    const res = await fetchT(url, {
      headers: {
        "Origin": "https://www.nba.com",
        "Referer": "https://www.nba.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) return { error: `NBA stats error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `NBA network error: ${(error as Error).message}`, data: null };
  }
}

// ====== Stats: Soccer (football-data.org; optional key) ======================

async function footballDataTeam(teamId: string): Promise<StatsResponse> {
  if (!FOOTBALL_DATA_KEY) {
    return { error: "FOOTBALL_DATA_KEY not set", data: null };
  }
  
  const url = `${FOOTBALL_DATA}/teams/${teamId}`;
  try {
    const res = await fetchT(url, { 
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } 
    });
    if (!res.ok) return { error: `Football-Data error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `Football-Data network error: ${(error as Error).message}`, data: null };
  }
}

async function footballDataCompetition(competitionId: string): Promise<StatsResponse> {
  if (!FOOTBALL_DATA_KEY) {
    return { error: "FOOTBALL_DATA_KEY not set", data: null };
  }
  
  const url = `${FOOTBALL_DATA}/competitions/${competitionId}/standings`;
  try {
    const res = await fetchT(url, { 
      headers: { "X-Auth-Token": FOOTBALL_DATA_KEY } 
    });
    if (!res.ok) return { error: `Football-Data error ${res.status}`, data: null };
    const data = await res.json();
    return { error: null, data };
  } catch (error) {
    return { error: `Football-Data network error: ${(error as Error).message}`, data: null };
  }
}

// ====== Sharp Reference: Betfair (optional) ==================================
// Placeholder: implementing full Betfair login/stream is beyond this single-file demo.
// We provide a stub that returns empty if creds are missing.

async function betfairPricesStub(marketId: string): Promise<StatsResponse> {
  if (!BETFAIR_APP_KEY || !BETFAIR_USERNAME || !BETFAIR_PASSWORD) {
    return { error: "Betfair credentials not set; skipping", data: [] };
  }
  
  // TODO: Implement Betfair login/session + listMarketBook call.
  // This would involve:
  // 1. POST to /api/certlogin with credentials to get session token
  // 2. Use session token for subsequent API calls
  // 3. Call listMarketBook with marketId to get current prices
  // 4. Handle Betfair's complex price ladder format
  
  console.log(`[TODO] Betfair integration for market ${marketId} - implement full OAuth flow`);
  return { error: "Betfair not implemented in this starter", data: [] };
}

// ====== Odds Math Utilities ===================================================

/** Convert American odds to decimal (>= 1.0) */
function americanToDecimal(american: number): number {
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

/** Convert decimal odds to American format */
function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

/** Implied probability from American odds */
function americanToImplied(american: number): number {
  if (american > 0) return 100 / (american + 100);
  return Math.abs(american) / (Math.abs(american) + 100);
}

/** Implied probability from decimal odds */
function decimalToImplied(decimal: number): number {
  return 1 / decimal;
}

/** 
 * Proportional de-vig for n-way markets
 * Removes bookmaker margin by scaling probabilities proportionally
 */
function devigProportional(probs: number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum === 0) return probs;
  return probs.map(p => p / sum);
}

/** 
 * Shin method (simplified) for two-way markets
 * Accounts for insider trading by estimating informed money parameter
 * More sophisticated than proportional method for sharp markets
 */
function devigShinTwoWay(p1: number, p2: number): [number, number] {
  // Simplified Shin: estimate insider trading parameter 'z' via closed-form for 2-way.
  // In practice you'd iterate; here we provide a light approximation.
  const overround = p1 + p2 - 1;
  
  if (overround <= 0) return [p1, p2]; // No overround to remove
  
  // Estimate insider trading parameter (simplified)
  const z = Math.min(0.1, Math.max(0, overround / 2)); // Cap at 10% insider money
  
  // Shin formula approximation
  const discriminant1 = z * z + 4 * (1 - z) * p1;
  const discriminant2 = z * z + 4 * (1 - z) * p2;
  
  const q1 = (Math.sqrt(discriminant1) - z) / (2 * (1 - z));
  const q2 = (Math.sqrt(discriminant2) - z) / (2 * (1 - z));
  
  // Normalize to ensure they sum to 1
  const sum = q1 + q2;
  return [q1 / sum, q2 / sum];
}

/** 
 * Compute Expected Value for a bet
 * EV = (probability_of_win * net_profit) - (probability_of_loss * stake)
 */
function evForBet(american: number, pFair: number, stake = 100): number {
  const decimal = americanToDecimal(american);
  const netWin = (decimal - 1) * stake; // Profit if win
  const netLoss = stake; // Loss if lose
  
  return pFair * netWin - (1 - pFair) * netLoss;
}

/** Calculate Kelly Criterion optimal bet size */
function kellyOptimal(american: number, pFair: number): number {
  const decimal = americanToDecimal(american);
  const b = decimal - 1; // Net odds received
  const p = pFair; // Probability of winning
  const q = 1 - p; // Probability of losing
  
  // Kelly formula: f = (bp - q) / b
  const kelly = (b * p - q) / b;
  return Math.max(0, kelly); // Never bet negative Kelly
}

// ====== Sport-Specific Priors (Toy Examples) =================================

/**
 * TODO: Replace these toy priors with sophisticated models per sport
 * 
 * MLB: Consider pitcher matchups, park factors, weather, lineup strength, bullpen usage
 * NBA: Account for rest days, injuries, pace, defensive efficiency, home court
 * NHL: Factor in goalie matchups, special teams, travel, back-to-backs
 * Soccer: Include form, head-to-head, home advantage, player availability
 */

function mlbPriors(homeTeam: string, awayTeam: string): [number, number] {
  // TODO: Implement sophisticated MLB model
  // - Starting pitcher ERA, WHIP, recent form
  // - Park factors (Coors Field vs Petco Park)
  // - Weather conditions (wind, temperature)
  // - Lineup strength vs opposing pitcher handedness
  // - Bullpen usage and availability
  // - Recent team form and momentum
  
  const homeAdvantage = 0.54; // MLB home teams win ~54% historically
  return [homeAdvantage, 1 - homeAdvantage];
}

function nbaPriors(homeTeam: string, awayTeam: string): [number, number] {
  // TODO: Implement sophisticated NBA model
  // - Team efficiency ratings (offensive/defensive)
  // - Pace and style matchups
  // - Rest advantage (days since last game)
  // - Injury reports and player availability
  // - Home court advantage (varies by venue)
  // - Recent form and momentum
  
  const homeAdvantage = 0.60; // NBA home teams win ~60% historically
  return [homeAdvantage, 1 - homeAdvantage];
}

function nhlPriors(homeTeam: string, awayTeam: string): [number, number] {
  // TODO: Implement sophisticated NHL model
  // - Goalie matchups and recent form
  // - Special teams efficiency (PP/PK)
  // - Travel and rest factors
  // - Head-to-head history
  // - Home ice advantage
  // - Injury reports
  
  const homeAdvantage = 0.55; // NHL home teams win ~55% historically
  return [homeAdvantage, 1 - homeAdvantage];
}

function soccerPriors(homeTeam: string, awayTeam: string): [number, number] {
  // TODO: Implement sophisticated soccer model
  // - Expected goals (xG) models
  // - Team form over last 5-10 matches
  // - Head-to-head historical results
  // - Home advantage (varies significantly by league/team)
  // - Player availability and suspensions
  // - Motivation factors (league position, cup competitions)
  
  const homeAdvantage = 0.46; // Soccer is more draw-heavy, home win ~46%
  return [homeAdvantage, 1 - homeAdvantage];
}

// ====== EV Composition =======================================================

/**
 * Blend market-derived fair probabilities with sport-specific priors
 * Alpha controls the weight: 1.0 = pure market, 0.0 = pure model
 */
function blendFair(
  pFromMarket: number[], 
  pFromPriors?: number[], 
  alpha = 0.8
): number[] {
  if (!pFromPriors || pFromPriors.length !== pFromMarket.length) {
    return pFromMarket;
  }
  return pFromMarket.map((p, i) => alpha * p + (1 - alpha) * pFromPriors[i]);
}

/**
 * Get sport-specific priors based on league
 */
function getSportPriors(league: string, homeTeam: string, awayTeam: string): [number, number] {
  const sport = league.toLowerCase();
  
  if (sport === 'mlb') return mlbPriors(homeTeam, awayTeam);
  if (sport === 'nba') return nbaPriors(homeTeam, awayTeam);
  if (sport === 'nhl') return nhlPriors(homeTeam, awayTeam);
  if (sport.includes('soccer') || sport === 'epl' || sport === 'mls') {
    return soccerPriors(homeTeam, awayTeam);
  }
  
  // Default: modest home advantage
  return [0.52, 0.48];
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
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        services: {
          odds_api: !!ODDS_API_KEY,
          betfair: !!(BETFAIR_APP_KEY && BETFAIR_USERNAME && BETFAIR_PASSWORD),
          football_data: !!FOOTBALL_DATA_KEY,
          mlb_stats: true, // Always available
          nhl_api: true,   // Always available
          nba_stats: true  // Available but may be rate limited
        },
        features: config.features || {}
      };
      return sendJSON(res, 200, status);
    }

    // Root endpoint - serve web app
    if (req.method === "GET" && path === "/") {
      return serveStaticFile(res, "index.html");
    }

    // /odds/:league endpoint
    if (req.method === "GET" && path.startsWith("/odds/")) {
      const league = decodeURIComponent(path.split("/")[2] || "");
      if (!league) return sendError(res, 400, "League parameter required");

      const region = url.searchParams.get("region") || "us";
      const markets = url.searchParams.get("markets") || "h2h,spreads,totals";
      const eventId = url.searchParams.get("eventId") || undefined;

      const odds = await getOddsByLeague(league, markets, region, eventId);
      return sendJSON(res, 200, odds);
    }

    // /stats/:league/:id endpoint
    if (req.method === "GET" && path.startsWith("/stats/")) {
      const pathParts = path.split("/");
      const league = pathParts[2];
      const id = pathParts[3];
      
      if (!league || !id) {
        return sendError(res, 400, "Both league and id parameters required");
      }

      const leagueLower = league.toLowerCase();
      let result: StatsResponse;

      if (leagueLower === "mlb") {
        // Check if it's a player ID (typically longer) or team ID
        if (id.length > 3) {
          result = await mlbPlayerStats(id);
        } else {
          result = await mlbTeamById(id);
        }
      } else if (leagueLower === "nhl") {
        result = await nhlTeamById(id);
      } else if (leagueLower === "nba") {
        const season = url.searchParams.get("season");
        result = await nbaTeamStats(id, season || undefined);
      } else if (leagueLower === "soccer" || leagueLower.includes("soccer")) {
        result = await footballDataTeam(id);
      } else {
        return sendError(res, 400, `Unsupported league '${league}' for stats`);
      }

      return sendJSON(res, 200, result);
    }

    // /ev/:league/:eventId endpoint - The main EV calculation
    if (req.method === "GET" && path.startsWith("/ev/")) {
      const pathParts = path.split("/");
      const league = pathParts[2];
      const eventId = pathParts[3];
      
      if (!league || !eventId) {
        return sendError(res, 400, "Both league and eventId parameters required");
      }

      const region = url.searchParams.get("region") || "us";
      const markets = url.searchParams.get("markets") || "h2h";
      const devigMethod = (url.searchParams.get("devig") || "proportional").toLowerCase();
      const priorWeight = parseFloat(url.searchParams.get("prior_weight") || "0.2");

      // 1) Get odds from The Odds API
      const oddsResp = await getOddsByLeague(league, markets, region, eventId);
      if (oddsResp.error) {
        return sendJSON(res, 200, { 
          error: oddsResp.error, 
          eventId, 
          league, 
          markets: {} 
        });
      }

      // Normalize odds response to single event
      const eventData = Array.isArray(oddsResp.data) ? oddsResp.data[0] : oddsResp.data;
      if (!eventData || !eventData.bookmakers || eventData.bookmakers.length === 0) {
        return sendJSON(res, 200, { 
          error: "No bookmakers found for event", 
          eventId, 
          league, 
          markets: {} 
        });
      }

      // 2) Build EV results structure
      const result: EVResult = {
        eventId,
        league,
        markets: {},
      };

      // Extract team names for priors (if available)
      const homeTeam = eventData.home_team || "Home";
      const awayTeam = eventData.away_team || "Away";

      // Process each bookmaker and market
      for (const bookmaker of eventData.bookmakers) {
        if (!bookmaker.markets) continue;

        for (const market of bookmaker.markets) {
          const marketKey = market.key;
          if (!result.markets[marketKey]) {
            result.markets[marketKey] = [];
          }

          const outcomes = market.outcomes || [];
          if (outcomes.length < 2) continue; // Need at least 2 outcomes

          // Extract odds and team/outcome names
          const selections: Selection[] = [];
          const americans = outcomes.map((outcome: any) => Number(outcome.price));
          const names = outcomes.map((outcome: any) => outcome.name || outcome.description || "Unknown");

          // Calculate implied probabilities (with vig)
          const implied = americans.map(americanToImplied);

          // Apply de-vig method
          let fair: number[];
          if (devigMethod === "shin" && implied.length === 2) {
            fair = devigShinTwoWay(implied[0], implied[1]);
          } else {
            fair = devigProportional(implied);
          }

          // Get sport-specific priors and blend
          let blended = fair;
          if (marketKey === "h2h" && outcomes.length === 2) {
            const priors = getSportPriors(league, homeTeam, awayTeam);
            blended = blendFair(fair, priors, 1 - priorWeight);
          }

          // Calculate EV and Kelly for each selection
          for (let i = 0; i < outcomes.length; i++) {
            const ev100 = evForBet(americans[i], blended[i], 100);
            const kelly = kellyOptimal(americans[i], blended[i]);

            selections.push({
              name: names[i],
              american: americans[i],
              implied: Number(implied[i].toFixed(4)),
              fair: Number(fair[i].toFixed(4)),
              blended: Number(blended[i].toFixed(4)),
              ev_100: Number(ev100.toFixed(2)),
            });
          }

          // Add to results
          result.markets[marketKey].push({
            bookmaker: bookmaker.title || bookmaker.key,
            last_update: bookmaker.last_update || new Date().toISOString(),
            selections,
            devig_method: devigMethod,
            prior_weight: priorWeight,
          });
        }
      }

      return sendJSON(res, 200, result);
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
  console.log(`🚀 EdgeFinder EV Engine running on port ${PORT}`);
  console.log(`📊 Available endpoints:`);
  console.log(`   GET /health`);
  console.log(`   GET /odds/:league?markets=h2h&region=us&eventId=<id>`);
  console.log(`   GET /stats/:league/:id`);
  console.log(`   GET /ev/:league/:eventId?markets=h2h&devig=proportional`);
  console.log(`🔑 API Keys configured:`);
  console.log(`   Odds API: ${ODDS_API_KEY ? '✅' : '❌'}`);
  console.log(`   Betfair: ${BETFAIR_APP_KEY ? '✅' : '❌'}`);
  console.log(`   Football Data: ${FOOTBALL_DATA_KEY ? '✅' : '❌'}`);
  console.log(`   MLB Stats: ✅ (always available)`);
  console.log(`   NHL API: ✅ (always available)`);
  console.log(`   NBA Stats: ✅ (rate limited)`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down EdgeFinder EV Engine...');
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