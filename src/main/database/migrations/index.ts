import type { Migration } from '../migrator';
import migration001 from './001-initial-schema';
import migration002 from './002-seed-countries';

export const migrations: Migration[] = [migration001, migration002];
