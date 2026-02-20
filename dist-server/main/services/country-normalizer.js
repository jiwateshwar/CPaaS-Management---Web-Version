"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CountryNormalizer = void 0;
const fastest_levenshtein_1 = require("fastest-levenshtein");
class CountryNormalizer {
    db;
    masterNames = new Map(); // lowercase name -> code
    masterCodes = new Set(); // all valid alpha-2 codes
    alpha3ToCode = new Map(); // alpha3 -> alpha2
    aliasMap = new Map(); // lowercase alias -> code
    allCandidates = [];
    candidateToCode = new Map();
    static FUZZY_CONFIDENCE_THRESHOLD = 0.8;
    static MAX_LEVENSHTEIN_DISTANCE = 5;
    constructor(db) {
        this.db = db;
        this.loadMasterData();
    }
    loadMasterData() {
        this.masterNames.clear();
        this.masterCodes.clear();
        this.alpha3ToCode.clear();
        this.aliasMap.clear();
        this.candidateToCode.clear();
        const countries = this.db
            .prepare('SELECT code, name, iso_alpha3 FROM country_master')
            .all();
        for (const c of countries) {
            const lower = c.name.toLowerCase().trim();
            this.masterNames.set(lower, c.code);
            this.masterCodes.add(c.code.toUpperCase());
            this.candidateToCode.set(lower, c.code);
            if (c.iso_alpha3) {
                this.alpha3ToCode.set(c.iso_alpha3.toUpperCase(), c.code);
            }
        }
        const aliases = this.db
            .prepare('SELECT country_code, alias FROM country_aliases')
            .all();
        for (const a of aliases) {
            const lower = a.alias.toLowerCase().trim();
            this.aliasMap.set(lower, a.country_code);
            this.candidateToCode.set(lower, a.country_code);
        }
        this.allCandidates = Array.from(this.candidateToCode.keys());
    }
    resolve(rawName) {
        const input = rawName.trim();
        if (!input) {
            return {
                status: 'unresolved',
                countryCode: null,
                confidence: 0,
                matchedAgainst: '',
                originalInput: rawName,
            };
        }
        const normalized = input.toLowerCase().trim();
        // Stage 1: Check if input is already an ISO alpha-2 code
        if (/^[A-Za-z]{2}$/.test(input)) {
            const upper = input.toUpperCase();
            if (this.masterCodes.has(upper)) {
                return {
                    status: 'exact_master',
                    countryCode: upper,
                    confidence: 1.0,
                    matchedAgainst: upper,
                    originalInput: input,
                };
            }
        }
        // Stage 2: Check if input is an ISO alpha-3 code
        if (/^[A-Za-z]{3}$/.test(input)) {
            const upper = input.toUpperCase();
            const code = this.alpha3ToCode.get(upper);
            if (code) {
                return {
                    status: 'exact_master',
                    countryCode: code,
                    confidence: 1.0,
                    matchedAgainst: upper,
                    originalInput: input,
                };
            }
        }
        // Stage 3: Exact match against master names
        if (this.masterNames.has(normalized)) {
            return {
                status: 'exact_master',
                countryCode: this.masterNames.get(normalized),
                confidence: 1.0,
                matchedAgainst: normalized,
                originalInput: input,
            };
        }
        // Stage 4: Exact match against aliases (case-insensitive)
        if (this.aliasMap.has(normalized)) {
            return {
                status: 'exact_alias',
                countryCode: this.aliasMap.get(normalized),
                confidence: 1.0,
                matchedAgainst: normalized,
                originalInput: input,
            };
        }
        // Stage 5: Fuzzy match using Levenshtein distance
        if (this.allCandidates.length > 0) {
            const bestMatch = (0, fastest_levenshtein_1.closest)(normalized, this.allCandidates);
            if (bestMatch) {
                const dist = (0, fastest_levenshtein_1.distance)(normalized, bestMatch);
                const maxLen = Math.max(normalized.length, bestMatch.length);
                const confidence = maxLen > 0 ? 1 - dist / maxLen : 0;
                if (confidence >= CountryNormalizer.FUZZY_CONFIDENCE_THRESHOLD &&
                    dist <= CountryNormalizer.MAX_LEVENSHTEIN_DISTANCE) {
                    return {
                        status: 'fuzzy_match',
                        countryCode: this.candidateToCode.get(bestMatch),
                        confidence,
                        matchedAgainst: bestMatch,
                        originalInput: input,
                    };
                }
            }
        }
        // Stage 6: Unresolved
        return {
            status: 'unresolved',
            countryCode: null,
            confidence: 0,
            matchedAgainst: '',
            originalInput: input,
        };
    }
    resolveBatch(rawNames) {
        const cache = new Map();
        const results = new Map();
        for (const name of rawNames) {
            const key = name.toLowerCase().trim();
            if (cache.has(key)) {
                results.set(name, cache.get(key));
            }
            else {
                const result = this.resolve(name);
                cache.set(key, result);
                results.set(name, result);
            }
        }
        return results;
    }
    reload() {
        this.loadMasterData();
    }
}
exports.CountryNormalizer = CountryNormalizer;
//# sourceMappingURL=country-normalizer.js.map