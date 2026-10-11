import { matchingCampusLife } from './fitScore';
import { formatLongDate, isoToday, joinLabels } from './format';
import { stateName } from './regions';
import { dominantSidePhrase, leagueShortList, positionsInDisplayOrder, programSidePhrase } from './sports';
import {
  POSITION_LABEL,
  type CampusLife,
  type Coach,
  type HonorsProfile,
  type PersonContact,
  type PlayerProfile,
  type Program,
} from './types';

export type IntroEmail = {
  subject: string;
  body: string;
  to: string;
  cc: string | null;
};

function leaguePhrase(profile: PlayerProfile): string {
  return leagueShortList(profile.leagues);
}

function yearsPhrase(years: number): string {
  if (years <= 0) return 'This is my first year at this league level';
  if (years === 1) return "I've played at this league level for 1 year";
  return `I've played at this league level for ${years} years`;
}

function positionSentence(profile: PlayerProfile): string {
  const ordered = positionsInDisplayOrder(profile.positions, profile.primaryPosition);
  const primary = POSITION_LABEL[profile.primaryPosition].toLowerCase();
  const secondary = ordered
    .filter((position) => position !== profile.primaryPosition)
    .map((position) => POSITION_LABEL[position].toLowerCase());
  if (secondary.length === 0) return `My position is ${primary}`;
  if (secondary.length === 1) return `My primary position is ${primary}, and I also play ${secondary[0]}`;
  const last = secondary[secondary.length - 1];
  return `My primary position is ${primary}, and I also play ${secondary.slice(0, -1).join(', ')} and ${last}`;
}

function contactLine(role: string, person: PersonContact): string | null {
  const name = person.name.trim();
  if (!name) return null;
  const bits = [person.email.trim(), person.phone.trim()].filter(Boolean);
  return bits.length > 0 ? `My ${role} is ${name} (${bits.join(', ')}).` : `My ${role} is ${name}.`;
}

function gameSentence(profile: PlayerProfile): string {
  const details = [
    profile.stats.jerseyNumber != null ? `I wear #${profile.stats.jerseyNumber}` : null,
    dominantSidePhrase(profile.sport, profile.stats.dominantSide),
    yearsPhrase(profile.stats.yearsAtLevel),
  ].filter((line): line is string => Boolean(line));
  return `${positionSentence(profile)}. I play for ${profile.clubTeam} (${leaguePhrase(profile)}) in ${stateName(profile.homeState)}. ${details.join('. ')}.`;
}

function studyLine(majors: string[]): string {
  const named = majors.map((major) => major.trim()).filter(Boolean);
  if (named.length === 0) return '';
  return `I'm planning to study ${joinLabels(named)}.`;
}

function honorsSentence(honors: HonorsProfile): string | null {
  const roles: string[] = [];
  if (honors.valedictorian) roles.push('valedictorian');
  else if (honors.salutatorian) roles.push('salutatorian');
  if (honors.teamCaptain) roles.push('team captain');
  if (honors.nationalHonorSociety) roles.push('National Honor Society');
  if (honors.asb) {
    const role = honors.asbRole.trim();
    roles.push(role ? `student government (${role})` : 'student government');
  }
  if (honors.honorRoll) roles.push("principal's list");

  const details: string[] = [];
  if (honors.apCourses.trim()) {
    const courses = honors.apCourses.trim();
    details.push(/course/i.test(courses) ? courses : `${courses} AP courses`);
  }
  if (honors.honorsCourses.trim()) details.push(honors.honorsCourses.trim());
  if (honors.scholarAthlete.trim()) details.push(honors.scholarAthlete.trim());
  if (honors.serviceHours.trim()) {
    const hours = honors.serviceHours.trim();
    details.push(/hour/i.test(hours) ? `${hours} of community service` : `${hours} community service hours`);
  }
  if (honors.otherAchievement.trim()) details.push(honors.otherAchievement.trim());

  if (roles.length === 0 && details.length === 0) return null;
  const picked = roles.slice(0, 3);
  const extra = details.slice(0, 2);
  if (picked.length === 0) return `In school: ${joinLabels(extra)}.`;
  const lead = `In school: ${joinLabels(picked)}`;
  return extra.length === 0 ? `${lead}.` : `${lead}, plus ${joinLabels(extra)}.`;
}

function personalSentence(profile: PlayerProfile): string | null {
  const proud = profile.proudOf.trim();
  const fact = profile.funFact.trim();
  const parts: string[] = [];
  if (proud) {
    parts.push(/^i['’]?m proud\b/i.test(proud) ? proud.replace(/\.$/, '') : `I'm proud of ${lowerFirst(proud).replace(/\.$/, '')}`);
  }
  if (fact) {
    parts.push(/^fun fact\b/i.test(fact) ? fact.replace(/\.$/, '') : `Fun fact: ${fact.replace(/\.$/, '')}`);
  }
  return parts.length > 0 ? `${parts.join('. ')}.` : null;
}

/**
 * A short note from the player to the coach.
 * Campus-life matches are fine. Fit-score wording and admit stats are not.
 */
function interestSentence(profile: PlayerProfile, program: Program): string {
  const phrases = matchingCampusLife(profile, program)
    .slice(0, 2)
    .map((item) => campusLifeForCoach(item));
  if (phrases.length === 0) {
    return "I'd love to learn more about the program and what you're looking for.";
  }
  return `I'm drawn to ${joinLabels(phrases.map((phrase) => `your ${phrase}`))}.`;
}

function campusLifeForCoach(item: CampusLife): string {
  switch (item) {
    case 'game-days':
      return 'big-time game days';
    case 'close-knit':
      return 'close-knit campus community';
    case 'city':
      return 'city campus';
    case 'college-town':
      return 'college-town setting';
    case 'beach':
      return 'campus near the beach';
    case 'mountains':
      return 'mountains and the outdoors';
    case 'faith':
      return 'faith community';
    case 'greek':
      return 'Greek life';
    case 'diverse':
      return 'diverse campus';
    case 'close-to-home':
      return 'campus close to home';
    case 'far-from-home':
      return 'chance to start somewhere new';
    case 'warm-weather':
      return 'warm-weather campus';
    case 'four-seasons':
      return 'four-season campus';
    case 'arts':
      return 'arts and music scene';
    case 'research':
      return 'research opportunities';
  }
}

function lowerFirst(value: string): string {
  if (/^[A-Z]{2,}/.test(value)) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function nextCamp(program: Program, today: string): Program['idCamps'][number] | undefined {
  return [...program.idCamps]
    .filter((camp) => camp.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function buildIntroEmail(
  profile: PlayerProfile,
  program: Program,
  coach: Coach,
  today = isoToday(),
): IntroEmail {
  const lastName = coach.name.split(' ').slice(-1)[0] ?? coach.name;
  const ordered = positionsInDisplayOrder(profile.positions, profile.primaryPosition);
  const positions = ordered
    .map((position) => {
      const label = POSITION_LABEL[position];
      return position === profile.primaryPosition && ordered.length > 1 ? `${label} (primary)` : label;
    })
    .join(' / ');
  const positionCodes = ordered.join('/');
  const camp = nextCamp(program, today);
  const tests = [
    profile.sat != null ? `SAT ${profile.sat}` : null,
    profile.act != null ? `ACT ${profile.act}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const film = profile.highlightVideoUrl
    ? `Highlights: ${profile.highlightVideoUrl}`
    : 'I can send highlight film if that is useful.';
  const campLine = camp
    ? `I also saw your ${camp.name} on ${formatLongDate(camp.date)} and would like to know if it is a good fit for a ${profile.gradYear}.`
    : 'I would love to know if you have an ID camp or questionnaire I should complete.';
  const parentLine = profile.parentEmail ? 'My parent is copied on this email.' : '';

  const jersey = profile.stats.jerseyNumber != null ? ` #${profile.stats.jerseyNumber}` : '';
  const coaches = [
    contactLine('club coach', profile.stats.clubCoach),
    contactLine('high school coach', profile.stats.highSchoolCoach),
  ]
    .filter((line): line is string => Boolean(line))
    .join(' ');
  const subject = `${profile.gradYear} ${positionCodes}${jersey} | ${profile.name} | ${profile.clubTeam}`;
  const body = [
    `Hi Coach ${lastName},`,
    '',
    `I'm ${profile.name}, class of ${profile.gradYear}. ${gameSentence(profile)} I'm interested in ${programSidePhrase(program)} at ${program.schoolName}. ${interestSentence(profile, program)}`,
    '',
    coaches,
    film,
    `GPA: ${profile.gpa.toFixed(2)}${tests ? ` · ${tests}` : ''}. ${studyLine(profile.intendedMajors)}`.trim(),
    honorsSentence(profile.honors) ?? '',
    personalSentence(profile) ?? '',
    '',
    `Are you recruiting ${positions.toLowerCase()} for the class of ${profile.gradYear}? ${campLine}`,
    '',
    parentLine,
    'Thank you for your time,',
    profile.name,
    profile.clubTeam,
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    subject,
    body,
    to: coach.email ?? '',
    cc: profile.parentEmail || null,
  };
}

export function mailtoUrl(email: IntroEmail): string {
  const query = [
    `subject=${encodeURIComponent(email.subject)}`,
    `body=${encodeURIComponent(email.body)}`,
    email.cc ? `cc=${encodeURIComponent(email.cc)}` : '',
  ]
    .filter(Boolean)
    .join('&');
  return `mailto:${email.to}?${query}`;
}
