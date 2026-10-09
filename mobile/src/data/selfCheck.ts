import { buildDeck } from './deck';
import { buildIntroEmail, mailtoUrl } from './email';
import { effectiveStatus, emptyRecruiting } from './format';
import { FIT_FACTORS, scoreProgram } from './fitScore';
import { profileFromDraft, validateDraft, type ProfileDraft } from './profileDraft';
import { regionForState } from './regions';
import { SAMPLE_PROGRAMS } from './samplePrograms';
import { SAMPLE_SPONSORS } from './sponsored';
import { DIVISIONS, POSITIONS, type PlayerProfile } from './types';

const failures: string[] = [];

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message);
}

check(SAMPLE_PROGRAMS.length === 40, `expected 40 programs, got ${SAMPLE_PROGRAMS.length}`);
check(new Set(SAMPLE_PROGRAMS.map((program) => program.id)).size === 40, 'program ids are not unique');

for (const division of DIVISIONS) {
  const count = SAMPLE_PROGRAMS.filter((program) => program.division === division).length;
  const expected = { 'NCAA D1': 10, 'NCAA D2': 8, 'NCAA D3': 10, NAIA: 6, NJCAA: 6 }[division];
  check(count === expected, `${division} count ${count} !== ${expected}`);
}

const blockedNames = ['Stanford', 'Duke', 'UCLA', 'Alabama', 'Notre Dame', 'Florida State'];
for (const program of SAMPLE_PROGRAMS) {
  check(program.sample === true, `${program.id} is not marked sample`);
  check(Boolean(regionForState(program.state)), `${program.id} has an unknown state`);
  check(program.coaches.length >= 2, `${program.id} needs two coaches`);
  for (const coach of program.coaches) {
    check(
      /^[a-z0-9.]+@[a-z0-9-]+\.example\.com$/.test(coach.email),
      `${program.id} coach email is not a fictional example.com address: ${coach.email}`,
    );
  }
  for (const url of [program.questionnaireUrl, program.admissionsUrl, program.costUrl, program.athleticsUrl]) {
    check(url.startsWith('https://example.com/'), `${program.id} url is not example.com: ${url}`);
  }
  check(program.roster.length === POSITIONS.length, `${program.id} roster is missing positions`);
  for (const spot of program.roster) {
    check(spot.graduating <= spot.count && spot.graduating >= 0, `${program.id} ${spot.position} roster is invalid`);
  }
  check(!blockedNames.some((name) => program.schoolName.includes(name)), `${program.schoolName} looks like a real school`);
}

for (const sponsor of SAMPLE_SPONSORS) {
  check(sponsor.label === 'Sponsored', 'sponsor missing Sponsored label');
  check(sponsor.url.startsWith('https://example.com/'), 'sponsor url is not example.com');
  check(sponsor.placeholder, 'sponsor placeholder flag is off');
}

const weightSum = FIT_FACTORS.reduce((sum, factor) => sum + factor.weight, 0);
check(Math.abs(weightSum - 1) < 0.0001, `weights sum to ${weightSum}`);

const strong: PlayerProfile = {
  id: 'test-strong',
  name: 'Maya Chen',
  gradYear: 2028,
  positions: ['CB'],
  clubTeam: 'Valley United',
  league: 'ECNL',
  stats: { gamesPlayed: 18, goals: 2, assists: 4, cleanSheets: null, savePercentage: null },
  highlightVideoUrl: 'https://video.example.com/maya-chen',
  gpa: 3.6,
  sat: 1200,
  act: null,
  homeState: 'OR',
  preferredRegions: ['West'],
  schoolSizePreference: 'large',
  intendedMajor: 'Biology',
  budget: { id: '15-30', label: '$15–30k', min: 15000, max: 30000 },
  parentEmail: 'parent@example.com',
  updatedAt: '2026-10-09T00:00:00.000Z',
};

const northwind = SAMPLE_PROGRAMS.find((program) => program.id === 'northwind');
const amber = SAMPLE_PROGRAMS.find((program) => program.id === 'amber-plains');
const harbor = SAMPLE_PROGRAMS.find((program) => program.id === 'harbor-pine');
const cinder = SAMPLE_PROGRAMS.find((program) => program.id === 'cinder-valley');
if (!northwind || !amber || !harbor || !cinder) {
  failures.push('missing fixture schools');
} else {
  const best = scoreProgram(strong, northwind);
  const far = scoreProgram(strong, amber);
  check(best.total > far.total, `expected Northwind (${best.total}) to outrank Amber Plains (${far.total})`);
  check(best.total >= 0 && best.total <= 100 && far.total >= 0 && far.total <= 100, 'fit score out of range');
  check(best.why.length > 10, 'missing why line');
  check(best.factors.length === 6, 'expected 6 fit factors');

  const stretch: PlayerProfile = { ...strong, gpa: 2.7, sat: 980, homeState: 'AZ', preferredRegions: ['Southwest'] };
  const hard = scoreProgram(stretch, harbor);
  const open = scoreProgram(stretch, cinder);
  const hardAcademics = hard.factors.find((factor) => factor.key === 'academics')?.score ?? 0;
  const openAcademics = open.factors.find((factor) => factor.key === 'academics')?.score ?? 0;
  check(hardAcademics < openAcademics, 'selective school should score lower academically for a 2.7 GPA');

  const deck = buildDeck(SAMPLE_PROGRAMS, strong, emptyRecruiting(), SAMPLE_SPONSORS);
  check(deck.some((card) => card.type === 'sponsored'), 'deck is missing a sponsored card');
  check(deck[3]?.type === 'sponsored', 'first sponsored card should sit at index 3');
  const programCards = deck.filter((card) => card.type === 'program');
  check(programCards.length === 40, 'sponsored cards should not replace programs');
  if (programCards[0]?.type === 'program' && programCards[1]?.type === 'program') {
    check(
      programCards[0].fit.total >= programCards[1].fit.total,
      'deck programs are not ranked by fit',
    );
  }

  const email = buildIntroEmail(strong, northwind, northwind.coaches[0], '2026-10-09');
  check(email.subject.includes('Maya Chen'), 'subject missing player name');
  check(email.body.includes('Northwind University'), 'body missing school');
  check(email.body.includes('https://video.example.com/maya-chen'), 'body missing highlight');
  check(email.body.includes('2028'), 'body missing grad year');
  check(email.to.endsWith('.example.com'), 'email recipient is not example.com');
  check(email.cc === 'parent@example.com', 'parent email should be copied');
  const url = mailtoUrl(email);
  check(url.startsWith('mailto:'), 'mailto url missing scheme');
  check(url.includes(encodeURIComponent(email.subject)), 'mailto missing subject');
}

check(regionForState('OR') === 'West', 'Oregon should map to West');

const due = effectiveStatus(
  {
    programId: 'northwind',
    savedAt: '2026-10-01T00:00:00.000Z',
    status: 'emailed',
    followUpDate: '2026-10-01',
    coachId: null,
    subject: null,
    body: null,
  },
  '2026-10-09',
);
check(due === 'follow_up_due', 'past follow-up should be due');

const stillWaiting = effectiveStatus(
  {
    programId: 'northwind',
    savedAt: '2026-10-01T00:00:00.000Z',
    status: 'emailed',
    followUpDate: '2026-10-20',
    coachId: null,
    subject: null,
    body: null,
  },
  '2026-10-09',
);
check(stillWaiting === 'emailed', 'future follow-up should stay emailed');

const replied = effectiveStatus(
  {
    programId: 'northwind',
    savedAt: '2026-10-01T00:00:00.000Z',
    status: 'replied',
    followUpDate: '2026-10-01',
    coachId: null,
    subject: null,
    body: null,
  },
  '2026-10-09',
);
check(replied === 'replied', 'replied should not flip back to follow-up due');

const draft: ProfileDraft = {
  name: 'Maya Chen',
  gradYear: 2028,
  positions: ['CB', 'GK'],
  clubTeam: 'Valley United',
  league: 'ECNL',
  gamesPlayed: '18',
  goals: '1',
  assists: '0',
  cleanSheets: '8',
  savePercentage: '80',
  highlightVideoUrl: 'https://video.example.com/maya',
  gpa: '3.6',
  sat: '',
  act: '',
  homeState: 'OR',
  preferredRegions: ['West'],
  schoolSizePreference: 'large',
  intendedMajor: 'Biology',
  budgetId: '15-30',
  parentEmail: '',
};
check(Object.keys(validateDraft(draft)).length === 0, `draft should be valid: ${JSON.stringify(validateDraft(draft))}`);
const profile = profileFromDraft(draft, 'player-1');
check(profile.stats.savePercentage === 80, 'GK save percentage should be kept');
check(profile.sat === null, 'blank SAT should be null');

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Sample catalog OK: ${SAMPLE_PROGRAMS.length} programs, fit score and email checks passed.`);
