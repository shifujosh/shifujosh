// @ts-nocheck
/**
 * STRUCTURED LLM PARSER (Reference Implementation)
 * 
 * A robust pattern for extracting type-safe data from various LLMs (Proprietary or Open-Source).
 * 
 * Core Concept: "The Cognitive Interface"
 * LLMs are fundamentally stochastic (probabilistic) engines, while software is deterministic.
 * This parser acts as the bridge, enforcing strict typing (Zod) and sanitization (Self-Healing)
 * to treat LLM outputs as reliable API responses.
 * 
 * Key Features:
 * 1. Zod Schema Enforcement: Validates not just JSON syntax, but deep data shapes.
 * 2. Self-Healing Mechanism: Strips "Chatter", markdown, and hallucinations from raw output.
 * 3. Provider Agnostic: Works seamlessly with OpenAI, Gemini, or local models (Ollama).
 * 4. Exponential Backoff: Handles transient network or model failures gracefully.
 */

import { z, ZodSchema } from 'zod';

// Abstract Provider Interface
interface LLMProvider {
    generate(prompt: string): Promise<string>;
}

interface ParserConfig {
    retries: number;
    responseMimeType?: string; // e.g., 'application/json' for Gemini
}

export class StructuredLLMParser {
    private provider: LLMProvider;
    private config: ParserConfig;

    constructor(provider: LLMProvider, config: ParserConfig = { retries: 3 }) {
        this.provider = provider;
        this.config = config;
    }

    /**
     * The Core Method: Text -> Typed Object
     * Wraps the generation process in a "Safety Harness" of validation and retry logic.
     */
    async extract<T>(prompt: string, schema: ZodSchema<T>): Promise<T> {
        return this.withRetry(async () => {
            
            // 1. Engineering the Prompt for Structure
            // Even if the model supports JSON mode, explicit instructions reduce entropy.
            const systemRefinement = `
                ${prompt}
                
                CRITICAL INSTRUCTIONS:
                - Output valid JSON only.
                - Do not wrap in markdown code blocks (e.g. \`\`\`json).
                - No conversational filler ("Here is the data...").
                - Ensure strict adherence to this schema structure.
            `;

            // 2. Generation
            const rawOutput = await this.provider.generate(systemRefinement);

            // 3. Sanitization (The "Self-Healing" Layer)
            // Removes common LLM artifacts that break JSON.parse()
            const cleanJson = this.sanitize(rawOutput);

            // 4. Parsing & Validation
            try {
                const parsed = JSON.parse(cleanJson);
                
                // 5. Zod Validation
                // Guarantees that even if valid JSON, it matches our Domain Model.
                return schema.parse(parsed);

            } catch (e) {
                console.warn(`[Parser] Validation Failed: ${e}. Retrying...`);
                throw e; // Triggers retry loop
            }
        });
    }

    /**
     * Sanitizes LLM output to extract pure JSON.
     * Handles:
     * - Markdown code blocks (```json ... ```)
     * - Conversational pre-ambles ("Here is your data: { ... }")
     */
    private sanitize(input: string): string {
        // Regex to extract finding the first '{' and the last '}'
        const jsonMatch = input.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return jsonMatch[0];
        }
        
        // Fallback: Aggressive cleanup
        return input
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();
    }

    /**
     * Exponential Backoff Retry Pattern
     */
    private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        let lastError;
        for (let i = 0; i <= this.config.retries; i++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                const delay = 1000 * Math.pow(2, i); // 1s, 2s, 4s...
                console.log(`[Parser] Attempt ${i+1} failed. Backing off for ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw lastError;
    }
}
