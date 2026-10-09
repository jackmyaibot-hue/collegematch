import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  BUDGET_OPTIONS,
  GRAD_YEARS,
  MAJOR_SUGGESTIONS,
  type FieldErrors,
  type ProfileDraft,
} from '../data/profileDraft';
import { STATES } from '../data/regions';
import {
  LEAGUES,
  POSITIONS,
  POSITION_LABEL,
  REGIONS,
  SIZE_LABEL,
  type League,
  type Position,
  type Region,
  type SchoolSizePreference,
} from '../data/types';
import { colors, radius } from '../theme';
import { AppText, Chip, TextField } from './ui';

function Wrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function IdentityFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? STATES.filter(
          (state) => state.name.toLowerCase().includes(needle) || state.code.toLowerCase().includes(needle),
        )
      : STATES;
    return pool.slice(0, 8);
  }, [query]);
  const selected = STATES.find((state) => state.code === draft.homeState);

  return (
    <View>
      <TextField
        label="Name"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="Your name"
        autoCapitalize="words"
        error={errors.name}
      />
      <AppText variant="label">Grad year</AppText>
      <Wrap>
        {GRAD_YEARS.map((year) => (
          <Chip
            key={year}
            label={String(year)}
            selected={draft.gradYear === year}
            onPress={() => onChange({ gradYear: year })}
          />
        ))}
      </Wrap>
      {errors.gradYear ? <Error text={errors.gradYear} /> : null}
      <TextField
        label="Home state"
        value={query}
        onChangeText={setQuery}
        placeholder={selected ? selected.name : 'Search states'}
        autoCapitalize="words"
        error={errors.homeState}
        hint={selected ? `Selected: ${selected.name}` : 'Used for region matching. Stays on this phone.'}
      />
      <Wrap>
        {matches.map((state) => (
          <Chip
            key={state.code}
            label={state.name}
            selected={draft.homeState === state.code}
            onPress={() => {
              onChange({ homeState: state.code });
              setQuery('');
            }}
          />
        ))}
      </Wrap>
    </View>
  );
}

export function SoccerFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  return (
    <View>
      <AppText variant="label">Positions</AppText>
      <AppText variant="caption" style={styles.help}>
        Pick every spot you want coaches to see.
      </AppText>
      <Wrap>
        {POSITIONS.map((position) => (
          <Chip
            key={position}
            label={`${position} · ${POSITION_LABEL[position]}`}
            selected={draft.positions.includes(position)}
            onPress={() => onChange({ positions: toggle<Position>(draft.positions, position) })}
          />
        ))}
      </Wrap>
      {errors.positions ? <Error text={errors.positions} /> : null}
      <TextField
        label="Club team"
        value={draft.clubTeam}
        onChangeText={(clubTeam) => onChange({ clubTeam })}
        placeholder="Valley United"
        autoCapitalize="words"
        error={errors.clubTeam}
      />
      <AppText variant="label">League</AppText>
      <View style={styles.stack}>
        {LEAGUES.map((league) => (
          <LeagueCard
            key={league}
            league={league}
            selected={draft.league === league}
            onPress={() => onChange({ league })}
          />
        ))}
      </View>
      {errors.league ? <Error text={errors.league} /> : null}
    </View>
  );
}

function LeagueCard({
  league,
  selected,
  onPress,
}: {
  league: League;
  selected: boolean;
  onPress: () => void;
}) {
  const copy =
    league === 'ECNL'
      ? 'ECNL — top club league'
      : league === 'Girls Academy'
        ? 'Girls Academy — national club pathway'
        : 'Other league or high school';
  return (
    <Pressable onPress={onPress} style={[styles.league, selected && styles.leagueOn]}>
      <AppText variant="headline" color={selected ? '#F4F1EA' : colors.ink}>
        {copy}
      </AppText>
    </Pressable>
  );
}

export function StatsFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  const isGk = draft.positions.includes('GK');
  return (
    <View>
      <TextField
        label="Games played"
        value={draft.gamesPlayed}
        onChangeText={(gamesPlayed) => onChange({ gamesPlayed })}
        keyboardType="number-pad"
        placeholder="How many"
        error={errors.gamesPlayed}
      />
      <TextField
        label="Goals"
        value={draft.goals}
        onChangeText={(goals) => onChange({ goals })}
        keyboardType="number-pad"
        placeholder="0"
        error={errors.goals}
      />
      <TextField
        label="Assists"
        value={draft.assists}
        onChangeText={(assists) => onChange({ assists })}
        keyboardType="number-pad"
        placeholder="0"
        error={errors.assists}
      />
      {isGk ? (
        <>
          <TextField
            label="Clean sheets"
            value={draft.cleanSheets}
            onChangeText={(cleanSheets) => onChange({ cleanSheets })}
            keyboardType="number-pad"
            placeholder="Optional"
            error={errors.cleanSheets}
          />
          <TextField
            label="Save percentage"
            value={draft.savePercentage}
            onChangeText={(savePercentage) => onChange({ savePercentage })}
            keyboardType="decimal-pad"
            placeholder="80"
            error={errors.savePercentage}
            hint="Optional. A number from 0 to 100."
          />
        </>
      ) : null}
      <TextField
        label="Highlight video link"
        value={draft.highlightVideoUrl}
        onChangeText={(highlightVideoUrl) => onChange({ highlightVideoUrl })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://video.example.com/your-highlights"
        error={errors.highlightVideoUrl}
        hint="Optional. Paste a link coaches can open."
      />
    </View>
  );
}

export function AcademicFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  return (
    <View>
      <TextField
        label="GPA"
        value={draft.gpa}
        onChangeText={(gpa) => onChange({ gpa })}
        keyboardType="decimal-pad"
        placeholder="3.5"
        error={errors.gpa}
        hint="4.0 scale. Unweighted is fine."
      />
      <TextField
        label="SAT"
        value={draft.sat}
        onChangeText={(sat) => onChange({ sat })}
        keyboardType="number-pad"
        placeholder="Optional"
        error={errors.sat}
      />
      <TextField
        label="ACT"
        value={draft.act}
        onChangeText={(act) => onChange({ act })}
        keyboardType="number-pad"
        placeholder="Optional"
        error={errors.act}
      />
      <TextField
        label="Intended major"
        value={draft.intendedMajor}
        onChangeText={(intendedMajor) => onChange({ intendedMajor })}
        placeholder="Biology, business, undeclared..."
        error={errors.intendedMajor}
        hint="Shown to you on school pages. It is not part of the fit score."
      />
      <Wrap>
        {MAJOR_SUGGESTIONS.map((major) => (
          <Chip
            key={major}
            label={major}
            selected={draft.intendedMajor.toLowerCase() === major.toLowerCase()}
            onPress={() => onChange({ intendedMajor: major })}
          />
        ))}
      </Wrap>
    </View>
  );
}

export function PreferenceFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  const sizes: SchoolSizePreference[] = ['small', 'medium', 'large', 'any'];
  return (
    <View>
      <AppText variant="label">Preferred regions</AppText>
      <AppText variant="caption" style={styles.help}>
        Pick everywhere you would actually go.
      </AppText>
      <Wrap>
        {REGIONS.map((region) => (
          <Chip
            key={region}
            label={region}
            selected={draft.preferredRegions.includes(region)}
            onPress={() => onChange({ preferredRegions: toggle<Region>(draft.preferredRegions, region) })}
          />
        ))}
      </Wrap>
      {errors.preferredRegions ? <Error text={errors.preferredRegions} /> : null}
      <AppText variant="label" style={styles.section}>
        Campus size
      </AppText>
      <Wrap>
        {sizes.map((size) => (
          <Chip
            key={size}
            label={SIZE_LABEL[size]}
            selected={draft.schoolSizePreference === size}
            onPress={() => onChange({ schoolSizePreference: size })}
          />
        ))}
      </Wrap>
      {errors.schoolSizePreference ? <Error text={errors.schoolSizePreference} /> : null}
      <AppText variant="label" style={styles.section}>
        Budget for net cost
      </AppText>
      <Wrap>
        {BUDGET_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={draft.budgetId === option.id}
            onPress={() => onChange({ budgetId: option.id })}
          />
        ))}
      </Wrap>
      {errors.budgetId ? <Error text={errors.budgetId} /> : null}
      <TextField
        label="Parent email"
        value={draft.parentEmail}
        onChangeText={(parentEmail) => onChange({ parentEmail })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Optional"
        error={errors.parentEmail}
        hint="Optional. Copied on coach emails. Stored only on this phone."
      />
    </View>
  );
}

function Error({ text }: { text: string }) {
  return (
    <AppText variant="caption" color={colors.rose} style={styles.error}>
      {text}
    </AppText>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  help: { marginTop: -4, marginBottom: 10 },
  stack: { gap: 8, marginBottom: 8 },
  league: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  leagueOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  section: { marginTop: 12 },
  error: { marginBottom: 10 },
});
