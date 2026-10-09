import { buildDeck } from './deck';
import { buildIntroEmail, mailtoUrl } from './email';
import { effectiveStatus, emptyRecruiting } from './format';
import { FIT_FACTORS, scoreProgram } from './fitScore';
import { instagramProfileUrl } from './poster';
import { profileFromDraft, validateDraft, type ProfileDraft } from './profileDraft';
import { regionForState } from './regions';
import { leagueNameList } from './sports';
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
  check(program.campusLife.length >= 2, `${program.id} needs campus life traits`);
  if (program.division === 'NJCAA') {
    check(program.jucoDivision === 'D1' || program.jucoDivision === 'D2' || program.jucoDivision === 'D3', `${program.id} needs a JUCO tier`);
  } else {
    check(program.jucoDivision === null, `${program.id} should not have a JUCO tier`);
  }
  check(/^cm[a-z0-9]+$/.test(program.instagramHandle), `${program.id} instagram handle is not a fictional cm handle`);
  check(
    instagramProfileUrl(program.instagramHandle) === `https://www.instagram.com/${program.instagramHandle}/`,
    `${program.id} instagram url is not an instagram.com profile`,
  );
  check(program.mascot.length >= 3, `${program.id} needs a mascot`);
  check(
    program.colors.length === 2 && program.colors.every((color) => /^#[0-9A-Fa-f]{6}$/.test(color)),
    `${program.id} colors should be two hex values`,
  );
  check(program.record.wins >= 0 && program.record.losses >= 0 && program.record.ties >= 0, `${program.id} record is invalid`);
  check(program.record.wins + program.record.losses + program.record.ties > 0, `${program.id} record is empty`);
  check(program.conferenceFinish.length > 0 && program.postseason.length > 0, `${program.id} needs a season story`);
  check(program.funFact.length > 0 && program.funFact.length <= 80, `${program.id} fun fact should stay one short line`);
  check(program.headCoachYears >= 1 && program.headCoachYears <= 40, `${program.id} coach years look wrong`);
  check(program.coachPortrait >= 0 && program.coachPortrait < 4, `${program.id} coach portrait index`);
  check(program.photoSet >= 0 && program.photoSet < 4, `${program.id} photo set index`);
  check((program.rosterOrigin.byState[program.state] ?? 0) >= 1, `${program.id} should have players from its state`);
  check((program.rosterOrigin.byLeague.ecnl ?? 0) >= 1, `${program.id} should list ECNL players`);
}

const handles = SAMPLE_PROGRAMS.map((program) => program.instagramHandle);
check(new Set(handles).size === 40, 'instagram handles are not unique');
check(handles.includes('cmnorthwind') && handles.includes('cmbayfern'), 'expected sample instagram handles');

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
  birthdate: '2010-04-12',
  gender: 'girls',
  sport: 'soccer',
  gradYear: 2028,
  positions: ['CB'],
  primaryPosition: 'CB',
  clubTeam: 'Valley United',
  leagues: ['ecnl'],
  stats: {
    yearsAtLevel: 3,
    dominantSide: 'left',
    jerseyNumber: 4,
    clubCoach: { name: 'Jordan Lee', email: 'jordan@club.example.com', phone: '503-555-0142' },
    highSchoolCoach: { name: 'Pat Nguyen', email: 'pat@school.example.com', phone: '503-555-0199' },
  },
  highlightVideoUrl: 'https://video.example.com/maya-chen',
  gpa: 3.6,
  sat: 1200,
  act: null,
  homeState: 'OR',
  preferredRegions: ['West'],
  openToAllLevels: true,
  levels: [],
  campusLife: [],
  schoolSizePreference: 'large',
  intendedMajors: ['Biology', 'Business'],
  honors: {
    asb: true,
    asbRole: 'President',
    valedictorian: false,
    salutatorian: false,
    honorRoll: true,
    nationalHonorSociety: true,
    apCourses: '4',
    honorsCourses: '',
    teamCaptain: true,
    scholarAthlete: '',
    serviceHours: '80',
    otherAchievement: '',
  },
  proudOf: 'sticking with my club through a hard season',
  funFact: 'I bake bread for the team bus',
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
  const passedThree = emptyRecruiting();
  deck
    .filter((card) => card.type === 'program')
    .slice(0, 3)
    .forEach((card) => {
      if (card.type === 'program') passedThree.passed[card.program.id] = { at: '2026-10-09T00:00:00.000Z' };
    });
  const afterThree = buildDeck(SAMPLE_PROGRAMS, strong, passedThree, SAMPLE_SPONSORS);
  check(afterThree[0]?.type === 'sponsored', 'sponsored card should reach the top after 3 passes');
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
  check(email.body.includes("I'm left-footed"), 'body missing dominant foot');
  check(email.body.includes('#4'), 'body missing jersey number');
  check(email.body.includes('3 years'), 'body missing years at league level');
  check(email.body.includes('Jordan Lee'), 'body missing club coach');
  check(email.body.includes('Pat Nguyen'), 'body missing high school coach');
  check(!/goals|assists|clean sheets|save percentage/i.test(email.body), 'body should not mention scoring stats');
  check(email.body.includes('Biology') && email.body.includes('Business'), 'body should name every intended major');
  check(email.body.includes('National Honor Society'), 'body should mention a standout honor');
  check(email.body.includes('team captain'), 'body should mention team captain');
  check(email.body.includes('80 community service hours'), 'body should mention service hours');
  check(email.body.includes("I'm proud of sticking with my club through a hard season"), 'body should include what they are proud of');
  check(email.body.includes('Fun fact: I bake bread for the team bus'), 'body should include the fun fact');
  check(email.body.includes('2028'), 'body missing grad year');
  check(email.to.endsWith('.example.com'), 'email recipient is not example.com');
  check(email.cc === 'parent@example.com', 'parent email should be copied');
  check(email.body.includes("I'd love to learn more about the program"), 'email should be in the player voice');
  check(!/your gpa|typical admit|you'd also get|fit score/i.test(email.body), 'email should not quote the fit card');
  const drawn = buildIntroEmail(
    { ...strong, campusLife: ['game-days', 'mountains', 'close-knit'] },
    northwind,
    northwind.coaches[0],
    '2026-10-09',
  );
  check(
    drawn.body.includes("I'm drawn to your big-time game days and your mountains and the outdoors"),
    'email should mention matching campus life in first person',
  );
  check(!/your gpa|typical admit|you'd also get/i.test(drawn.body), 'campus-life email should not quote the fit card');
  const url = mailtoUrl(email);
  check(url.startsWith('mailto:'), 'mailto url missing scheme');
  check(url.includes(encodeURIComponent(email.subject)), 'mailto missing subject');
}

check(regionForState('OR') === 'West', 'Oregon should map to West');
check(
  leagueNameList(['ecnl', 'other']) === 'Elite Clubs National League (ECNL), Other / High school',
  'league names should use the proper labels',
);
check(!leagueNameList(['ecnl', 'other']).toLowerCase().includes('ecnl, high school'), 'league list should not use the short high school form');

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
  birthdate: '2010-04-12',
  gender: 'girls',
  sport: 'soccer',
  gradYear: 2028,
  positions: ['CB', 'GK'],
  primaryPosition: 'CB',
  clubTeam: 'Valley United',
  leagues: ['ecnl', 'ga'],
  yearsAtLevel: '3',
  dominantSide: 'left',
  jerseyNumber: '4',
  clubCoachName: 'Jordan Lee',
  clubCoachEmail: 'jordan@club.example.com',
  clubCoachPhone: '503-555-0142',
  highSchoolCoachName: '',
  highSchoolCoachEmail: '',
  highSchoolCoachPhone: '',
  highlightVideoUrl: 'https://video.example.com/maya',
  gpa: '3.6',
  sat: '',
  act: '',
  homeState: 'OR',
  preferredRegions: ['West'],
  openToAllLevels: true,
  levels: [],
  campusLife: [],
  schoolSizePreference: 'large',
  intendedMajors: ['Biology', 'Business'],
  customMajor: 'Sports medicine',
  asb: true,
  asbRole: 'President',
  valedictorian: false,
  salutatorian: false,
  honorRoll: true,
  nationalHonorSociety: true,
  apCourses: '4',
  honorsCourses: '',
  teamCaptain: true,
  scholarAthlete: '',
  serviceHours: '80',
  otherAchievement: '',
  proudOf: 'sticking with my club through a hard season',
  funFact: 'I bake bread for the team bus',
  budgetId: '15-30',
  parentEmail: 'parent@example.com',
};
check(Object.keys(validateDraft(draft)).length === 0, `draft should be valid: ${JSON.stringify(validateDraft(draft))}`);
const profile = profileFromDraft(draft, 'player-1');
check(profile.stats.dominantSide === 'left', 'dominant foot should be kept');
check(profile.stats.jerseyNumber === 4, 'jersey number should be kept');
check(profile.stats.yearsAtLevel === 3, 'years at league level should be kept');
check(profile.stats.clubCoach.email === 'jordan@club.example.com', 'club coach email should be kept');
check(profile.stats.highSchoolCoach.name === '', 'blank high school coach should stay blank');
check(profile.sat === null, 'blank SAT should be null');
check(profile.leagues.includes('ecnl') && profile.leagues.includes('ga'), 'both leagues should be kept');
check(profile.primaryPosition === 'CB', 'primary position should be kept');
check(
  profile.intendedMajors.includes('Biology') &&
    profile.intendedMajors.includes('Business') &&
    profile.intendedMajors.includes('Sports medicine'),
  'selected majors and a custom major should be kept',
);
check(profile.honors.asbRole === 'President' && profile.honors.teamCaptain, 'honors should be kept');
check(profile.proudOf.includes('hard season') && profile.funFact.includes('bread'), 'personal notes should be kept');

const multi: PlayerProfile = { ...strong, positions: ['CB', 'ST'], primaryPosition: 'ST', leagues: ['ecnl', 'ga'] };
if (northwind) {
  const onlyCb = scoreProgram({ ...strong, positions: ['CB'], primaryPosition: 'CB' }, northwind);
  const onlySt = scoreProgram({ ...strong, positions: ['ST'], primaryPosition: 'ST' }, northwind);
  const both = scoreProgram(multi, northwind);
  const cbRoster = onlyCb.factors.find((factor) => factor.key === 'roster')?.score ?? -1;
  const stRoster = onlySt.factors.find((factor) => factor.key === 'roster')?.score ?? -1;
  const bothRoster = both.factors.find((factor) => factor.key === 'roster')?.score ?? -1;
  check(bothRoster === Math.max(cbRoster, stRoster), 'fit score should use the stronger of the selected positions');
  const multiEmail = buildIntroEmail(multi, northwind, northwind.coaches[0], '2026-10-09');
  check(multiEmail.body.toLowerCase().includes('center back'), 'email should name every selected position');
  check(multiEmail.body.toLowerCase().includes('striker'), 'email should name the second position');
  check(multiEmail.body.includes('ECNL') && multiEmail.body.includes('GA'), 'email should name every selected league');
  check(multiEmail.subject.startsWith('2028 ST/CB'), 'primary position should lead the subject');
}
const boysDeck = buildDeck(
  SAMPLE_PROGRAMS,
  { ...strong, gender: 'boys' },
  emptyRecruiting(),
  SAMPLE_SPONSORS,
);
check(boysDeck.length === 0, 'boys soccer should not show the women\'s sample deck');
check(SAMPLE_PROGRAMS.every((program) => program.sport === 'soccer' && program.side === 'women'), 'sample programs should be women\'s soccer');

const naiaDeck = buildDeck(
  SAMPLE_PROGRAMS,
  { ...strong, openToAllLevels: false, levels: ['NAIA'] },
  emptyRecruiting(),
  SAMPLE_SPONSORS,
);
const naiaPrograms = naiaDeck.filter((card) => card.type === 'program');
check(naiaPrograms.length === 6, `NAIA-only deck should have 6 programs, got ${naiaPrograms.length}`);
check(
  naiaPrograms.every((card) => card.type === 'program' && card.program.division === 'NAIA'),
  'level filter should drop other divisions',
);

if (northwind) {
  const lively = scoreProgram({ ...strong, campusLife: ['game-days', 'mountains'] }, northwind);
  check(lively.why.toLowerCase().includes('game days'), 'why line should mention a campus-life match');
  check(lively.total >= scoreProgram(strong, northwind).total, 'a campus-life match should not lower the score');
}

const missingParent = validateDraft({ ...draft, parentEmail: '' });
check(Boolean(missingParent.parentEmail), 'parent email should be required');
const badParent = validateDraft({ ...draft, parentEmail: 'not-an-email' });
check(Boolean(badParent.parentEmail), 'parent email should be validated');

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Sample catalog OK: ${SAMPLE_PROGRAMS.length} programs, fit score and email checks passed.`);
