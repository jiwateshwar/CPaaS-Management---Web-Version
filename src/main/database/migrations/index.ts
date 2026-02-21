import type { Migration } from '../migrator';
import migration001 from './001-initial-schema';
import migration002 from './002-seed-countries';
import migration003 from './003-rate-components';
import migration004 from './004-vendor-rate-discontinued';

export const migrations: Migration[] = [migration001, migration002, migration003, migration004];
