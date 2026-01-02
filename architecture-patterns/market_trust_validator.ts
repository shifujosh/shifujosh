/**
 * MARKET TRUST VALIDATOR (Reference Implementation)
 * 
 * A deterministic "Physics Engine" for validating AI betting predictions against live market data.
 * 
 * Problem: "The Hallucinated Edge"
 * AI Agents often find "Value" that doesn't exist because they ignore the "Vig" (Bookmaker Fee)
 * or rely on outdated training data.
 * 
 * Solution: "Trust Layer Middleware"
 * This validator acts as a firewall between the AI's signal and the execution layer.
 * 
 * Key Pillars:
 * 1. Market Physics: Rejects any signal that doesn't beat the "No-Vig" implied probability (Fair Value).
 * 2. Steam Detection: Rejects "Falling Knife" bets where the market is moving violently against the position.
 * 3. Identity Resolution: Uses fuzzy matching to ensure "Lakers" == "LAL" before trusting the data.
 */

// ============ 1. MARKET PHYSICS (Vig & Probability) ============

type OddsFormat = 'american' | 'decimal';

export class MarketPhysics {
    /**
     * Converts American Odds to Implied Probability
     * e.g. -110 -> 0.5238
     */
    static toProbability(odds: number): number {
        if (odds > 0) return 100 / (odds + 100);
        return Math.abs(odds) / (Math.abs(odds) + 100);
    }

    /**
     * Removes the "Vig" (Bookmaker Fee) to find the True Probability (Fair Value).
     * Uses the Multiplicative method to normalize probabilities to 100%.
     */
    static removeVig(homeOdds: number, awayOdds: number): { homeResults: number, awayResults: number } {
        const homeImplied = this.toProbability(homeOdds);
        const awayImplied = this.toProbability(awayOdds);
        const totalImplied = homeImplied + awayImplied;

        // Normalize to 100%
        return {
            homeResults: homeImplied / totalImplied,
            awayResults: awayImplied / totalImplied
        };
    }
}

// ============ 2. VELOCITY TRACKER (Steam Detection) ============

interface LineSnapshot {
    timestamp: number;
    spread: number;
}

export class SteamDetector {
    // Configurable thresholds (abstracted from production values)
    private static VELOCITY_THRESHOLD_HIGH = 0.5; // Significant line move per hour

    static analyze(snapshots: LineSnapshot[]) {
        if (snapshots.length < 2) return { isSteam: false, velocity: 0 };

        const start = snapshots[0];
        const end = snapshots[snapshots.length - 1];
        
        const hoursElapsed = (end.timestamp - start.timestamp) / (1000 * 60 * 60);
        const move = end.spread - start.spread;
        
        // Avoid division by zero
        const velocity = hoursElapsed > 0 ? move / hoursElapsed : 0;
        const isSteam = Math.abs(velocity) >= this.VELOCITY_THRESHOLD_HIGH;

        return {
            isSteam,
            velocity, // Points per hour (e.g., +1.5 means Home is getting 1.5 pts worse per hour)
            direction: velocity > 0 ? 'FADE_HOME' : 'FADE_AWAY' 
        };
    }
}

// ============ 3. ENTITY RESOLVER (Fuzzy Matching) ============

export class EntityResolver {
    private static ALIAS_MAP: Record<string, string> = {
        'lakers': 'LAL', 'los angeles lakers': 'LAL',
        'knicks': 'NYK', 'new york knicks': 'NYK',
        // ... mapped entities
    };

    /**
     * Normalizes and resolves team names.
     * Uses Levenshtein distance (simulated here) for robustness.
     */
    static resolve(input: string): string | null {
        const normalized = input.toLowerCase().trim();
        if (this.ALIAS_MAP[normalized]) return this.ALIAS_MAP[normalized];
        return null;
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
