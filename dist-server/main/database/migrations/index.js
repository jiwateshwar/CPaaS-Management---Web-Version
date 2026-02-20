"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrations = void 0;
const _001_initial_schema_1 = __importDefault(require("./001-initial-schema"));
const _002_seed_countries_1 = __importDefault(require("./002-seed-countries"));
exports.migrations = [_001_initial_schema_1.default, _002_seed_countries_1.default];
//# sourceMappingURL=index.js.map