import { scoreProgram } from './fitScore';
import { formatLongDate, isoToday } from './format';
import { stateName } from './regions';
import { POSITION_LABEL, type Coach, type PlayerProfile, type Program } from './types';

export type IntroEmail = {
  subject: string;
  body: string;
  to: string;
  cc: string | null;
};

function leaguePhrase(profile: PlayerProfile): string {
  if (profile.league === 'other') return 'club / high school soccer';
  return profile.league;
}

function statsLine(profile: PlayerProfile): string {
  const games = profile.stats.gamesPlayed;
  if (profile.positions.includes('GK') && profile.positions.length === 1) {
    const saves =
      profile.stats.savePercentage != null ? `${profile.stats.savePercentage}% saves` : 'save numbers available on request';
    const sheets =
      profile.stats.cleanSheets != null ? `${profile.stats.cleanSheets} clean sheets` : null;
    const bits = [sheets, saves].filter(Boolean).join(', ');
    return games > 0 ? `This season: ${bits} in ${games} games.` : `This season: ${bits}.`;
  }
  if (games <= 0 && profile.stats.goals <= 0 && profile.stats.assists <= 0) {
    return 'I can send a full stat sheet with my film.';
  }
  return `This season: ${profile.stats.goals} goals and ${profile.stats.assists} assists in ${games} games.`;
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
  const positions = profile.positions.map((position) => POSITION_LABEL[position]).join(' / ');
  const fit = scoreProgram(profile, program);
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

  const subject = `${profile.gradYear} ${profile.positions.join('/')} | ${profile.name} | ${profile.clubTeam}`;
  const body = [
    `Hi Coach ${lastName},`,
    '',
    `I'm ${profile.name}, class of ${profile.gradYear}, a ${positions} with ${profile.clubTeam} (${leaguePhrase(profile)}) in ${stateName(profile.homeState)}. I'm interested in women's soccer at ${program.schoolName}. ${fit.why}`,
    '',
    statsLine(profile),
    film,
    `GPA: ${profile.gpa.toFixed(2)}${tests ? ` · ${tests}` : ''}. I'm planning to study ${profile.intendedMajor}.`,
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
    to: coach.email,
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
