import { formatGpa } from './format';
import { stateName } from './regions';
import { dominantSideDisplay, leagueById, leagueNameList, positionSlash, SPORT_LABEL } from './sports';
import type { LeagueId, PlayerProfile } from './types';

export type ResumeRow = { label: string; value: string };
export type ResumeSection = { title: string; rows: ResumeRow[] };

const ACADEMY_LEAGUES: LeagueId[] = ['nwsl-academy', 'usl-academy'];

function row(label: string, value: string | null | undefined): ResumeRow | null {
  const text = value?.trim() ?? '';
  if (!text) return null;
  return { label, value: text };
}

function contactLine(person: { name: string; email: string; phone: string } | undefined): string {
  if (!person) return '';
  return [person.name, person.email, person.phone].map((part) => part.trim()).filter(Boolean).join(' · ');
}

function honorBits(profile: PlayerProfile): string {
  const honors = profile.honors;
  return [
    honors.valedictorian ? 'Valedictorian' : null,
    honors.salutatorian ? 'Salutatorian' : null,
    honors.nationalHonorSociety ? 'National Honor Society' : null,
    honors.honorRoll ? "Principal's list" : null,
    honors.asb ? (honors.asbRole ? `ASB, ${honors.asbRole}` : 'ASB') : null,
    honors.teamCaptain ? 'Team captain' : null,
    honors.apCourses ? `${honors.apCourses} AP` : null,
    honors.honorsCourses || null,
    honors.serviceHours ? `${honors.serviceHours} service hours` : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(' · ');
}

function academyLabel(leagues: LeagueId[]): string {
  return leagues
    .filter((id) => ACADEMY_LEAGUES.includes(id))
    .map((id) => leagueById(id)?.short ?? id)
    .join(', ');
}

/** The facts that go on the one-page resume. Empty facts are left off. */
export function resumeSections(profile: PlayerProfile): { subtitle: string; sections: ResumeSection[] } {
  const foot = dominantSideDisplay(profile.sport, profile.stats.dominantSide);
  const tests = [profile.sat != null ? `SAT ${profile.sat}` : null, profile.act != null ? `ACT ${profile.act}` : null]
    .filter(Boolean)
    .join(' · ');
  const awards = [profile.honors.scholarAthlete, profile.honors.otherAchievement, profile.proudOf]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(' · ');
  const sections: ResumeSection[] = [
    {
      title: 'Playing',
      rows: [
        row('Positions', positionSlash(profile.positions, profile.primaryPosition)),
        row('Foot', foot),
        row('Jersey', profile.stats.jerseyNumber == null ? '' : `#${profile.stats.jerseyNumber}`),
        row('Height', profile.stats.height),
        row('Club', profile.clubTeam),
        row('High school', profile.leagues.includes('other') ? 'High school / other club league' : ''),
        row(
          'Level',
          `${profile.stats.yearsAtLevel} ${profile.stats.yearsAtLevel === 1 ? 'year' : 'years'} · ${leagueNameList(profile.leagues)}`,
        ),
        row('Academy', academyLabel(profile.leagues)),
      ].filter((item): item is ResumeRow => item != null),
    },
    {
      title: 'Academics',
      rows: [
        row('GPA', formatGpa(profile.gpa, profile.gpaWeighted)),
        row('Tests', tests),
        row('Majors', profile.intendedMajors.join(', ')),
        row('Honors', honorBits(profile)),
      ].filter((item): item is ResumeRow => item != null),
    },
    {
      title: 'Awards and film',
      rows: [row('Awards', awards), row('Fun fact', profile.funFact), row('Highlights', profile.highlightVideoUrl)].filter(
        (item): item is ResumeRow => item != null,
      ),
    },
    {
      title: 'Eligibility and contacts',
      rows: [
        row('NCAA ID', profile.ncaaId),
        row('Parent', profile.parentEmail),
        row('Club coach', contactLine(profile.stats.clubCoach)),
        row('High school coach', contactLine(profile.stats.highSchoolCoach)),
      ].filter((item): item is ResumeRow => item != null),
    },
  ].filter((section) => section.rows.length > 0);

  return {
    subtitle: `Class of ${profile.gradYear}  ·  ${SPORT_LABEL[profile.sport]}  ·  ${stateName(profile.homeState)}`,
    sections,
  };
}

function pdfEscape(value: string): string {
  return value
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrap(text: string, size: number, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  const limit = Math.floor(width / (size * 0.5));
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** A one-page PDF using the standard Helvetica font. Nothing leaves the device. */
export async function buildResumePdf(profile: PlayerProfile): Promise<Uint8Array> {
  const { subtitle, sections } = resumeSections(profile);
  const commands: string[] = [];
  const text = (value: string, x: number, y: number, size: number, font: 'F1' | 'F2', color: string) => {
    commands.push(
      'BT',
      `${font} ${size} Tf`,
      color,
      `1 0 0 1 ${x} ${y} Tm`,
      `(${pdfEscape(value)}) Tj`,
      'ET',
    );
  };

  commands.push('0.047 0.231 0.173 rg', '0 714 612 78 re', 'f');
  text(profile.name, 40, 752, 22, 'F2', '0.973 0.957 0.933 rg');
  text(subtitle, 40, 730, 11, 'F1', '0.85 0.91 0.87 rg');

  let y = 690;
  for (const section of sections) {
    if (y < 72) break;
    text(section.title.toUpperCase(), 40, y, 9, 'F2', '0.047 0.231 0.173 rg');
    y -= 8;
    commands.push('0.85 0.82 0.76 RG', `40 ${y} m`, `572 ${y} l`, 'S');
    y -= 16;
    for (const item of section.rows) {
      const lines = wrap(item.value, 10, 420);
      if (y < 56) break;
      text(item.label, 40, y, 9, 'F2', '0.43 0.486 0.455 rg');
      lines.forEach((line, index) => {
        text(line, 150, y - index * 13, 10, 'F1', '0.09 0.129 0.11 rg');
      });
      y -= Math.max(16, lines.length * 13 + 4);
    }
    y -= 8;
  }
  text('Prepared on this device. CollegeMatch does not upload this resume.', 40, 32, 8, 'F1', '0.43 0.486 0.455 rg');

  const stream = commands.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(body);
}

export function resumeFileName(profile: PlayerProfile): string {
  const slug = profile.name
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'player'}-athletic-resume.pdf`;
}
