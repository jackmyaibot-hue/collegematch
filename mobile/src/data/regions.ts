import type { Region } from './types';

export type StateInfo = {
  code: string;
  name: string;
  region: Region;
};

export const STATES: StateInfo[] = [
  { code: 'AL', name: 'Alabama', region: 'Southeast' },
  { code: 'AK', name: 'Alaska', region: 'West' },
  { code: 'AZ', name: 'Arizona', region: 'Southwest' },
  { code: 'AR', name: 'Arkansas', region: 'Southeast' },
  { code: 'CA', name: 'California', region: 'West' },
  { code: 'CO', name: 'Colorado', region: 'West' },
  { code: 'CT', name: 'Connecticut', region: 'Northeast' },
  { code: 'DE', name: 'Delaware', region: 'Mid-Atlantic' },
  { code: 'DC', name: 'District of Columbia', region: 'Mid-Atlantic' },
  { code: 'FL', name: 'Florida', region: 'Southeast' },
  { code: 'GA', name: 'Georgia', region: 'Southeast' },
  { code: 'HI', name: 'Hawaii', region: 'West' },
  { code: 'ID', name: 'Idaho', region: 'West' },
  { code: 'IL', name: 'Illinois', region: 'Midwest' },
  { code: 'IN', name: 'Indiana', region: 'Midwest' },
  { code: 'IA', name: 'Iowa', region: 'Midwest' },
  { code: 'KS', name: 'Kansas', region: 'Midwest' },
  { code: 'KY', name: 'Kentucky', region: 'Southeast' },
  { code: 'LA', name: 'Louisiana', region: 'Southeast' },
  { code: 'ME', name: 'Maine', region: 'Northeast' },
  { code: 'MD', name: 'Maryland', region: 'Mid-Atlantic' },
  { code: 'MA', name: 'Massachusetts', region: 'Northeast' },
  { code: 'MI', name: 'Michigan', region: 'Midwest' },
  { code: 'MN', name: 'Minnesota', region: 'Midwest' },
  { code: 'MS', name: 'Mississippi', region: 'Southeast' },
  { code: 'MO', name: 'Missouri', region: 'Midwest' },
  { code: 'MT', name: 'Montana', region: 'West' },
  { code: 'NE', name: 'Nebraska', region: 'Midwest' },
  { code: 'NV', name: 'Nevada', region: 'West' },
  { code: 'NH', name: 'New Hampshire', region: 'Northeast' },
  { code: 'NJ', name: 'New Jersey', region: 'Mid-Atlantic' },
  { code: 'NM', name: 'New Mexico', region: 'Southwest' },
  { code: 'NY', name: 'New York', region: 'Northeast' },
  { code: 'NC', name: 'North Carolina', region: 'Southeast' },
  { code: 'ND', name: 'North Dakota', region: 'Midwest' },
  { code: 'OH', name: 'Ohio', region: 'Midwest' },
  { code: 'OK', name: 'Oklahoma', region: 'Southwest' },
  { code: 'OR', name: 'Oregon', region: 'West' },
  { code: 'PA', name: 'Pennsylvania', region: 'Mid-Atlantic' },
  { code: 'RI', name: 'Rhode Island', region: 'Northeast' },
  { code: 'SC', name: 'South Carolina', region: 'Southeast' },
  { code: 'SD', name: 'South Dakota', region: 'Midwest' },
  { code: 'TN', name: 'Tennessee', region: 'Southeast' },
  { code: 'TX', name: 'Texas', region: 'Southwest' },
  { code: 'UT', name: 'Utah', region: 'West' },
  { code: 'VT', name: 'Vermont', region: 'Northeast' },
  { code: 'VA', name: 'Virginia', region: 'Mid-Atlantic' },
  { code: 'WA', name: 'Washington', region: 'West' },
  { code: 'WV', name: 'West Virginia', region: 'Southeast' },
  { code: 'WI', name: 'Wisconsin', region: 'Midwest' },
  { code: 'WY', name: 'Wyoming', region: 'West' },
];

const BY_CODE = new Map(STATES.map((state) => [state.code, state]));

export function stateInfo(code: string): StateInfo | undefined {
  return BY_CODE.get(code);
}

export function stateName(code: string): string {
  return BY_CODE.get(code)?.name ?? code;
}

export function regionForState(code: string): Region | undefined {
  return BY_CODE.get(code)?.region;
}

/** Regions that share a border in this app's map. Used only for a partial location score. */
export const ADJACENT_REGIONS: Record<Region, Region[]> = {
  Northeast: ['Mid-Atlantic'],
  'Mid-Atlantic': ['Northeast', 'Southeast'],
  Southeast: ['Mid-Atlantic', 'Midwest', 'Southwest'],
  Midwest: ['Southeast', 'Southwest', 'West'],
  Southwest: ['Midwest', 'West', 'Southeast'],
  West: ['Southwest', 'Midwest'],
};
