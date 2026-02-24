import type { Migration } from '../migrator';

// Countries missing from the original seed data
const MISSING_COUNTRIES: [string, string, string, string][] = [
  ['WF', 'Wallis and Futuna', 'WLF', '876'],
  ['CK', 'Cook Islands', 'COK', '184'],
  ['NF', 'Norfolk Island', 'NFK', '574'],
  ['FK', 'Falkland Islands', 'FLK', '238'],
  ['TC', 'Turks and Caicos Islands', 'TCA', '796'],
  ['SH', 'Saint Helena', 'SHN', '654'],
  ['MS', 'Montserrat', 'MSR', '500'],
  ['PM', 'Saint Pierre and Miquelon', 'SPM', '666'],
  ['MP', 'Northern Mariana Islands', 'MNP', '580'],
];

// Common alternate names for the new countries
const ALIASES: Record<string, string[]> = {
  FK: ['Falkland Islands (Malvinas)', 'Malvinas', 'Islas Malvinas'],
  SH: ['Saint Helena, Ascension and Tristan da Cunha', 'St Helena', 'St. Helena'],
  PM: ['St Pierre and Miquelon', 'St. Pierre and Miquelon'],
  MP: ['Commonwealth of the Northern Mariana Islands', 'CNMI'],
  CK: ['Cook Is.'],
  TC: ['Turks & Caicos', 'Turks & Caicos Islands'],
};

const migration006: Migration = {
  version: 6,
  name: '006-missing-countries',
  up: (db) => {
    const insertCountry = db.prepare(
      `INSERT OR IGNORE INTO country_master (code, name, iso_alpha3, iso_numeric)
       VALUES (?, ?, ?, ?)`,
    );
    const insertAlias = db.prepare(
      `INSERT OR IGNORE INTO country_aliases (country_code, alias, source)
       VALUES (?, ?, 'seed')`,
    );

    const run = db.transaction(() => {
      for (const [code, name, alpha3, numeric] of MISSING_COUNTRIES) {
        insertCountry.run(code, name, alpha3, numeric);
      }
      for (const [code, aliases] of Object.entries(ALIASES)) {
        for (const alias of aliases) {
          insertAlias.run(code, alias);
        }
      }
    });

    run();
  },
};

export default migration006;
