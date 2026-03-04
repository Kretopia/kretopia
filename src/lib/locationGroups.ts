/**
 * Location grouping for intelligent filter matching.
 * When a user selects a country/region, all cities in that group should match.
 */

const LOCATION_GROUPS: Record<string, string[]> = {
  'Trinidad & Tobago': [
    'Port of Spain, Trinidad',
    'San Fernando, Trinidad',
    'Chaguanas, Trinidad',
    'Tobago',
    'Trinidad & Tobago',
    'Trinidad',
  ],
  'United States': [
    'Los Angeles, CA',
    'New York, NY',
    'Atlanta, GA',
    'Miami, FL',
    'Nashville, TN',
    'Chicago, IL',
    'Austin, TX',
    'San Francisco, CA',
    'United States',
  ],
  'United Kingdom': [
    'London, UK',
    'Manchester, UK',
    'Birmingham, UK',
    'United Kingdom',
  ],
  'Canada': [
    'Toronto, Canada',
    'Vancouver, Canada',
    'Montreal, Canada',
    'Canada',
  ],
  'Europe': [
    'Berlin, Germany',
    'Paris, France',
    'Amsterdam, Netherlands',
    'Barcelona, Spain',
    'Stockholm, Sweden',
    'Europe',
  ],
  'Caribbean': [
    'Port of Spain, Trinidad',
    'San Fernando, Trinidad',
    'Chaguanas, Trinidad',
    'Tobago',
    'Trinidad & Tobago',
    'Jamaica',
    'Barbados',
    'Caribbean',
  ],
};

/**
 * Given a filter location value, returns all location strings that should match.
 * E.g. "Trinidad & Tobago" → ["Port of Spain, Trinidad", "San Fernando, Trinidad", ...]
 * For a specific city like "Port of Spain, Trinidad", returns just that city.
 */
export function getMatchingLocations(filterValue: string): string[] {
  // Check if this value is a group key
  if (LOCATION_GROUPS[filterValue]) {
    return LOCATION_GROUPS[filterValue];
  }

  // Check if this value belongs to any group — if so, just match the specific value
  // but also do a fuzzy includes for free-text locations
  return [filterValue];
}

/**
 * Check if a profile's location matches the selected filter location.
 * Handles country-level grouping and substring matching.
 */
export function locationMatchesFilter(profileLocation: string | null, filterValue: string): boolean {
  if (!profileLocation) return false;
  if (filterValue === 'all') return true;

  const normalizedProfile = profileLocation.toLowerCase().trim();
  const normalizedFilter = filterValue.toLowerCase().trim();

  // Direct match
  if (normalizedProfile === normalizedFilter) return true;

  // Check group membership
  const matchingLocations = getMatchingLocations(filterValue);
  if (matchingLocations.some(loc => normalizedProfile === loc.toLowerCase())) return true;

  // Fuzzy: check if filter term appears in profile location or vice versa
  // e.g. "Trinidad" in "Port of Spain, Trinidad"
  if (normalizedProfile.includes(normalizedFilter) || normalizedFilter.includes(normalizedProfile)) return true;

  return false;
}
