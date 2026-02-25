import type { Migration } from '../migrator';
import migration001 from './001-initial-schema';
import migration002 from './002-seed-countries';
import migration003 from './003-rate-components';
import migration004 from './004-vendor-rate-discontinued';
import migration005 from './005-use-cases';
import migration006 from './006-missing-countries';
import migration007 from './007-channels';
import migration008 from './008-drop-channel-checks';

export const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006, migration007, migration008];
