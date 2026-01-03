// @ts-nocheck
/**
 * MARKET TRUST VALIDATOR (Reference Architecture)
 * 
 * A deterministic "Physics Engine" for validating AI betting predictions against live market data.
 * Inspired by the "Data Physics" principles of the BetSpecs Core.
 * 
 * Problem: "The Hallucinated Edge"
 * AI Agents frequently identify "Value" that is mathematically impossible because they ignore:
 * 1. The Vig (Bookmaker's Fee/Hold)
 * 2. Market Efficiency (The "Wisdom of the Crowds")
 * 3. Latency (Betting on a line that moved 5 seconds ago)
 * 
 * Solution: "Trust Layer Middleware"
 * This validator acts as a firewall between the Agent's signal generation and the Execution Layer.
 * It enforces strict mathematical constraints to prevent "Negative EV" execution.
 * 
 * Note: Requires `zod` dependency.
 */

// In a real project: import { z } from 'zod';
// For reference pattern purposes, we assume z is available or mocked:
import { z } from 'zod'; 

// ============ 0. DOMAIN PRIMITIVES (The Constants) ============

/**
 * Validates American Odds format using strict range boundaries.
 * "Dead Heat" rules and "Push" scenarios often break naive number validators.
 */
const AmericanOddsSchema = z.number().refine(
    (val: number) => val === 0 || val >= 100 || val <= -100,
    { message: 'Invalid American Odds: Must be >= +100 or <= -100 (or 0 for PK).' }
);

/**
 * Represents the State representation of a market at a specific timestamp.
 */
export interface MarketSnapshot {
    timestamp: number;
    homeOdds: number;
    awayOdds: number;
    spread?: number;
    bookmakerId: string;
    isSharp: boolean; // Is this a "Market Maker" book (e.g., Pinnacle, Circa)?
}

// ============ 1. MARKET PHYSICS (Vig, Hold & Fair Value) ============

export class MarketPhysics {
    /**
     * Converts American Odds to Implied Probability.
     * Handles positive (+150 -> 40%) and negative (-110 -> 52.38%) formats.
     */
    static toProbability(odds: number): number {
        if (odds === 0) return 0.5; // Pick'em
        if (odds > 0) return 100 / (odds + 100);
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }

    /**
     * Calculates the "Theoretical Hold" (Vig) of a market.
     * A hold > 5% indicates a recreational market; > 10% indicates high uncertainty.
     * 
     * @returns The bookmaker's edge (e.g., 0.045 = 4.5%)
     */
    static calculateHold(homeOdds: number, awayOdds: number): number {
        const homeImplied = this.toProbability(homeOdds);
        const awayImplied = this.toProbability(awayOdds);
        return (homeImplied + awayImplied) - 1.0;
    }

    /**
     * "De-Vigs" the line to find the No-Vig Fair Odds (NVFO).
     * Uses the Multiplicative Method, which is superior to Additive for spread markets.
     */
    static calculateFairValue(homeOdds: number, awayOdds: number) {
        const homeImplied = this.toProbability(homeOdds);
        const awayImplied = this.toProbability(awayOdds);
        const totalImplied = homeImplied + awayImplied;

        return {
            homeFairProb: homeImplied / totalImplied,
            awayFairProb: awayImplied / totalImplied,
            theoreticalHold: totalImplied - 1
        };
    }
}

// ============ 2. VELOCITY TRACKER (Steam & Stale Line Detection) ============

export class SteamDetector {
    // A "Steam Move" is a rapid line change triggered by sharp money.
    // Agents should NEVER bet against Steam unless they have proprietary info.
    private static VELOCITY_THRESHOLD_PTS_PER_HOUR = 0.5; 
    private static STALENESS_THRESHOLD_MS = 60 * 1000; // 1 minute

    static analyzeMovement(snapshots: MarketSnapshot[]) {
        if (snapshots.length < 2) return { isSteam: false, velocity: 0, isStale: false };

        const start = snapshots[0];
        const end = snapshots[snapshots.length - 1];
        const now = Date.now();

        // 1. Check for Staleness (Data Physics)
        // If the "Live" odds haven't updated in > 1 min during active trading, they are suspect.
        const isStale = (now - end.timestamp) > this.STALENESS_THRESHOLD_MS;

        // 2. Calculate Velocity (Points per Hour)
        const timeDeltaHours = (end.timestamp - start.timestamp) / (1000 * 60 * 60);
        const spreadMove = (end.spread || 0) - (start.spread || 0);

        // Avoid division by zero
        const velocity = timeDeltaHours > 0 ? spreadMove / timeDeltaHours : 0;
        
        // 3. Detect "Sharp Action"
        // If specific "Oracle" books (marked isSharp) moved first, this is high-confidence steam.
        const sharpMove = snapshots.some(s => s.isSharp && s.timestamp > start.timestamp);

        return {
            isSteam: Math.abs(velocity) >= this.VELOCITY_THRESHOLD_PTS_PER_HOUR,
            velocity, // +1.0 = Home team getting worse by 1 point/hour
            isStale,
            initiatedBySharps: sharpMove,
            recommendation: velocity > 0 ? 'FADE_HOME' : 'FADE_AWAY'
        };
    }
}

// ============ 3. ENTITY RESOLVER (Identity Physics) ============

export class EntityResolver {
    // In production, this uses a dedicated Vector Database or fuzzy search service.
    // Identifying that "Man Utd" === "Manchester United FC" is critical for arbitrage.
    private static ALIAS_MAP: Record<string, string> = {
        'lakers': 'LAL', 'la lakers': 'LAL', 'los angeles lakers': 'LAL',
        'knicks': 'NYK', 'ny knicks': 'NYK', 'new york knicks': 'NYK',
        'bkn': 'BKN', 'brooklyn': 'BKN', 'nets': 'BKN'
    };

    /**
     * Canonicalizes team identifiers to a standard Ticker (e.g., LAL, NYK).
     * Prevents "Ghost Arbs" where mismatched names create false arbitrage opportunities.
     */
    static resolve(rawString: string): string | null {
        const normalized = rawString.toLowerCase()
            .replace(/[^a-z0-9 ]/g, '') // Remove punc chars like '.' in 'St. Louis'
            .trim();
            
        return this.ALIAS_MAP[normalized] || null;
    }
}

// ============ 4. THE TRUST GATE (Main Validator) ============

interface AISignal {
    team: string; // e.g. "Lakers"
    odds: number; // e.g. -110
    confidence: number; // 0-1
}

interface MarketState {
    homeTeam: string;
    homeOdds: number;
    awayTeam: string;
    awayOdds: number;
    lineHistory: LineSnapshot[];
}

// Mocking external dependencies for pattern demonstration
type LineSnapshot = { timestamp: number; home: number; away: number; bookmakerId: string; isSharp: boolean; spread?: number; };

class MarketPhysicsImpl {
    static removeVig(home: number, away: number) { return { homeResults: 0.5, awayResults: 0.5 }; }
}

class SteamDetectorImpl {
    static analyze(history: LineSnapshot[]) { return { velocity: 0, isSharp: false, isSteam: false, direction: 'NONE' }; }
}

// In a real project, these are imports. For the pattern file, we alias them:
const MarketPhysics = MarketPhysicsImpl;
const SteamDetector = SteamDetectorImpl;

export class MarketTrustValidator {
    private static SAFETY_MARGIN = 0.02; // Required edge above Fair Value

    /**
     * The Gatekeeper Function.
     * Rejects hallucinations or negative-EV bets.
     */
    static validate(signal: AISignal, market: MarketState): { approved: boolean; reason: string } {
        
        // Step 1: Identity Check
        const resolvedTeam = EntityResolver.resolve(signal.team);
        const resolvedHome = EntityResolver.resolve(market.homeTeam);
        const resolvedAway = EntityResolver.resolve(market.awayTeam);

        if (resolvedTeam !== resolvedHome && resolvedTeam !== resolvedAway) {
            return { approved: false, reason: `ENTITY_MISMATCH: AI said '${signal.team}', Market has '${market.homeTeam} vs ${market.awayTeam}'` };
        }

        // Step 2: Hallucination Check (Odds Tolerance)
        // AI often "remembers" odds from training data vs live odds.
        const currentOdds = resolvedTeam === resolvedHome ? market.homeOdds : market.awayOdds;
        if (Math.abs(signal.odds - currentOdds) > 10) { 
            return { approved: false, reason: `HALLUCINATION: AI saw ${signal.odds}, Real is ${currentOdds}` };
        }

        // Step 3: The Physics Check (Positive Expected Value)
        // Does the AI's confidence exceed the "No-Vig" implied probability?
        const { homeResults, awayResults } = MarketPhysics.removeVig(market.homeOdds, market.awayOdds);
        const fairWinProb = resolvedTeam === resolvedHome ? homeResults : awayResults;

        // Check if Signal Confidence > Fair Probability + Safety Margin
        if (signal.confidence < (fairWinProb + this.SAFETY_MARGIN)) {
            return { 
                approved: false, 
                reason: `NEGATIVE_EV: Confidence (${signal.confidence.toFixed(2)}) < FairValue (${fairWinProb.toFixed(2)}) + Margin` 
            };
        }

        // Step 4: Steam Check
        // Don't bet against a "Steam Move" (Market consensus shifting rapidly against us).
        const steam = SteamDetector.analyze(market.lineHistory);
        if (steam.isSteam && steam.direction === (resolvedTeam === resolvedHome ? 'FADE_HOME' : 'FADE_AWAY')) {
             return { approved: false, reason: `STEAM_WARNING: Market is moving violently against this position.` };
        }

        return { approved: true, reason: 'PASSED' };
    }
}
