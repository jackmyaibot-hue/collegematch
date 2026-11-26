import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import {
  BUDGET_OPTIONS,
  GRAD_YEARS,
  MAJOR_SUGGESTIONS,
  type FieldErrors,
  type ProfileDraft,
} from '../data/profileDraft';
import { dominantSidePrompt, GENDER_OPTIONS, positionSlash, sportSetup, SPORT_SETUPS } from '../data/sports';
import {
  CAMPUS_LIFE,
  CAMPUS_LIFE_LABEL,
  LEVEL_LABEL,
  LEVEL_PREFS,
  POSITION_LABEL,
  REGIONS,
  SIZE_LABEL,
  type CampusLife,
  type LeagueId,
  type LevelPref,
  type Position,
  type Region,
  type SchoolSizePreference,
  type Sport,
} from '../data/types';
import { colors, radius } from '../theme';
import { DateField } from './DateField';
import { FieldAnchor } from './formScroll';
import { StateSelect } from './StateSelect';
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
  openSports = [],
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
  /** Sports that already have programs for the athlete's gender. */
  openSports?: Sport[];
}) {
  return (
    <View>
      <FieldAnchor name="sport" invalid={Boolean(errors.sport)}>
      <AppText variant="label">Your sport</AppText>
      <AppText variant="caption" style={styles.help}>
        Athletes, start here. Pick the sport you want college programs for.
      </AppText>
      <View style={styles.sportGrid}>
        {SPORT_SETUPS.map((sport) => {
          const selected = draft.sport === sport.id;
          const ready = openSports.includes(sport.id);
          return (
            <Pressable
              key={sport.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange({ sport: sport.id })}
              style={[styles.sportCard, selected && styles.sportOn]}
            >
              <AppText variant="headline" color={selected ? '#F4F1EA' : colors.ink}>
                {sport.label}
              </AppText>
              <AppText variant="caption" color={selected ? '#D5E6DC' : colors.muted}>
                {ready ? 'Ready' : 'Soon'}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {errors.sport ? <Error text={errors.sport} /> : null}
      </FieldAnchor>
      <TextField
        field="name"
        label="Name"
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="Your name"
        autoCapitalize="words"
        error={errors.name}
      />
      <DateField
        field="birthdate"
        label="Birthday"
        value={draft.birthdate}
        onChange={(birthdate) => onChange({ birthdate })}
        error={errors.birthdate}
        hint="Stays on this phone. Used so programs match your class."
      />
      <FieldAnchor name="gender" invalid={Boolean(errors.gender)}>
      <AppText variant="label">Gender</AppText>
      <AppText variant="caption" style={styles.help}>
        Required. Female matches women's programs. Male matches men's programs.
      </AppText>
      <Wrap>
        {GENDER_OPTIONS.map((option) => (
          <Chip
            key={option.id}
            label={option.label}
            selected={draft.gender === option.id}
            onPress={() => onChange({ gender: option.id })}
          />
        ))}
      </Wrap>
      {errors.gender ? <Error text={errors.gender} /> : null}
      </FieldAnchor>
      <FieldAnchor name="gradYear" invalid={Boolean(errors.gradYear)}>
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
      </FieldAnchor>
      <StateSelect
        field="homeState"
        label="Home state"
        value={draft.homeState}
        onChange={(homeState) => onChange({ homeState })}
        error={errors.homeState}
        hint="All 50 states and DC. Used for region matching. Stays on this phone."
      />
    </View>
  );
}

function togglePosition(draft: ProfileDraft, position: Position): Partial<ProfileDraft> {
  const has = draft.positions.includes(position);
  const positions = has ? draft.positions.filter((item) => item !== position) : [...draft.positions, position];
  let primary = draft.primaryPosition;
  if (!has && positions.length === 1) primary = position;
  if (has && primary === position) primary = positions[0] ?? null;
  if (primary && !positions.includes(primary)) primary = positions[0] ?? null;
  return { positions, primaryPosition: primary };
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
  const setup = sportSetup(draft.sport ?? 'soccer');
  const selectedPositions = draft.positions;

  function toggleLeague(id: LeagueId) {
    const leagues = draft.leagues.includes(id)
      ? draft.leagues.filter((item) => item !== id)
      : [...draft.leagues, id];
    onChange({ leagues });
  }

  return (
    <View>
      <FieldAnchor name="positions" invalid={Boolean(errors.positions)}>
        <AppText variant="label">Positions</AppText>
        <AppText variant="caption" style={styles.help}>
          Select every position you play. A check means it's on. Mark one as primary — that's the spot we list first.
        </AppText>
        {setup.positions.length === 0 ? (
          <AppText variant="body">Positions for this sport are coming soon.</AppText>
        ) : (
          <Wrap>
            {setup.positions.map((position) => {
              const id = position.id as Position;
              const selected = selectedPositions.includes(id);
              return (
                <Chip
                  key={position.id}
                  label={position.label}
                  selected={selected}
                  badge={selected && draft.primaryPosition === id ? 'Primary' : undefined}
                  onPress={() => onChange(togglePosition(draft, id))}
                />
              );
            })}
          </Wrap>
        )}
        {errors.positions ? <Error text={errors.positions} /> : null}
      </FieldAnchor>
      {selectedPositions.length > 1 ? (
        <FieldAnchor name="primaryPosition" invalid={Boolean(errors.primaryPosition)}>
          <View style={styles.primaryBlock}>
            <AppText variant="label">Primary position</AppText>
            <Wrap>
              {selectedPositions.map((position) => (
                <Chip
                  key={`primary-${position}`}
                  label={POSITION_LABEL[position]}
                  selected={draft.primaryPosition === position}
                  onPress={() => onChange({ primaryPosition: position })}
                />
              ))}
            </Wrap>
          </View>
          {errors.primaryPosition ? <Error text={errors.primaryPosition} /> : null}
        </FieldAnchor>
      ) : null}
      <TextField
        field="clubTeam"
        label="Club team"
        value={draft.clubTeam}
        onChangeText={(clubTeam) => onChange({ clubTeam })}
        placeholder="Valley United"
        autoCapitalize="words"
        error={errors.clubTeam}
      />
      <FieldAnchor name="leagues" invalid={Boolean(errors.leagues)}>
        <AppText variant="label">Leagues</AppText>
        <AppText variant="caption" style={styles.help}>
          Select every league you play in. More than one is fine.
        </AppText>
        <View style={styles.stack}>
          {setup.leagues.map((league) => {
            const selected = draft.leagues.includes(league.id);
            return (
              <Pressable
                key={league.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                onPress={() => toggleLeague(league.id)}
                style={[styles.league, selected && styles.leagueOn]}
              >
                <View style={[styles.box, selected && styles.boxOn]}>
                  {selected ? <Ionicons name="checkmark" size={16} color={colors.greenDark} /> : null}
                </View>
                <AppText variant="headline" color={colors.ink} style={styles.leagueLabel}>
                  {league.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {errors.leagues ? <Error text={errors.leagues} /> : null}
      </FieldAnchor>
    </View>
  );
}

export function GameFields({
  draft,
  onChange,
  errors,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
}) {
  const side = dominantSidePrompt(draft.sport ?? 'soccer');
  const slash = positionSlash(draft.positions, draft.primaryPosition);
  return (
    <View>
      <TextField
        field="highlightVideoUrl"
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
      <View style={styles.recap}>
        <AppText variant="label">Positions</AppText>
        <AppText variant="headline">{slash || 'Pick positions on the previous screen'}</AppText>
        <AppText variant="caption">
          Primary is listed first. Everything after the slash is secondary. Change them on the previous screen.
        </AppText>
      </View>
      {side ? (
        <FieldAnchor name="dominantSide" invalid={Boolean(errors.dominantSide)}>
          <AppText variant="label">{side.label}</AppText>
          <AppText variant="caption" style={styles.help}>
            {side.hint}
          </AppText>
          <Wrap>
            {side.options.map((option) => (
              <Chip
                key={option.id}
                label={option.label}
                selected={draft.dominantSide === option.id}
                onPress={() => onChange({ dominantSide: option.id })}
              />
            ))}
          </Wrap>
          {errors.dominantSide ? <Error text={errors.dominantSide} /> : null}
        </FieldAnchor>
      ) : (
        <AppText variant="caption" style={styles.help}>
          We'll ask for the equivalent, such as a dominant hand, when this sport opens.
        </AppText>
      )}
      <TextField
        field="yearsAtLevel"
        label="Years at this league level"
        value={draft.yearsAtLevel}
        onChangeText={(yearsAtLevel) => onChange({ yearsAtLevel })}
        keyboardType="number-pad"
        placeholder="3"
        error={errors.yearsAtLevel}
        hint="How many years you've played at your current league level. Use 0 if this is year one."
      />
      <TextField
        field="jerseyNumber"
        label="Jersey number"
        value={draft.jerseyNumber}
        onChangeText={(jerseyNumber) => onChange({ jerseyNumber })}
        keyboardType="number-pad"
        placeholder="4"
        error={errors.jerseyNumber}
        hint="The number coaches should look for on film or at a showcase."
      />
      <AppText variant="label">Height</AppText>
      <AppText variant="caption" style={styles.help}>
        Optional. Use the number pad. 5 and 6 becomes 5'6" on your CV.
      </AppText>
      <View style={styles.heightRow}>
        <View style={styles.heightCell}>
          <TextField
            field="heightFeet"
            label="Feet"
            value={draft.heightFeet}
            onChangeText={(heightFeet) => onChange({ heightFeet: heightFeet.replace(/\D/g, '').slice(0, 1) })}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="5"
            maxLength={1}
            error={errors.heightFeet}
          />
        </View>
        <View style={styles.heightCell}>
          <TextField
            field="heightInches"
            label="Inches"
            value={draft.heightInches}
            onChangeText={(heightInches) => onChange({ heightInches: heightInches.replace(/\D/g, '').slice(0, 2) })}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="6"
            maxLength={2}
            error={errors.heightInches}
          />
        </View>
      </View>
    </View>
  );
}

export function CoachFields({
  draft,
  onChange,
  errors,
  showLaterNote = false,
}: {
  draft: ProfileDraft;
  onChange: (patch: Partial<ProfileDraft>) => void;
  errors: FieldErrors;
  /** Onboarding only. Profile edit is already the place to add them later. */
  showLaterNote?: boolean;
}) {
  return (
    <View>
      <AppText variant="body" style={styles.help}>
        Optional. Add a club coach, a high school coach, or leave both blank.
      </AppText>
      {showLaterNote ? (
        <AppText variant="caption" style={styles.help}>
          You can add this later from Profile.
        </AppText>
      ) : null}
      <AppText variant="label">Club coach</AppText>
      <TextField
        field="clubCoachName"
        label="Name"
        value={draft.clubCoachName}
        onChangeText={(clubCoachName) => onChange({ clubCoachName })}
        autoCapitalize="words"
        placeholder="Optional"
        error={errors.clubCoachName}
      />
      <TextField
        field="clubCoachEmail"
        label="Email"
        value={draft.clubCoachEmail}
        onChangeText={(clubCoachEmail) => onChange({ clubCoachEmail })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Optional"
        error={errors.clubCoachEmail}
      />
      <TextField
        field="clubCoachPhone"
        label="Phone"
        value={draft.clubCoachPhone}
        onChangeText={(clubCoachPhone) => onChange({ clubCoachPhone })}
        keyboardType="phone-pad"
        placeholder="Optional"
        error={errors.clubCoachPhone}
      />
      <AppText variant="label" style={styles.section}>
        High school coach
      </AppText>
      <TextField
        field="highSchoolCoachName"
        label="Name"
        value={draft.highSchoolCoachName}
        onChangeText={(highSchoolCoachName) => onChange({ highSchoolCoachName })}
        autoCapitalize="words"
        placeholder="Optional"
        error={errors.highSchoolCoachName}
      />
      <TextField
        field="highSchoolCoachEmail"
        label="Email"
        value={draft.highSchoolCoachEmail}
        onChangeText={(highSchoolCoachEmail) => onChange({ highSchoolCoachEmail })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Optional"
        error={errors.highSchoolCoachEmail}
      />
      <TextField
        field="highSchoolCoachPhone"
        label="Phone"
        value={draft.highSchoolCoachPhone}
        onChangeText={(highSchoolCoachPhone) => onChange({ highSchoolCoachPhone })}
        keyboardType="phone-pad"
        placeholder="Optional"
        error={errors.highSchoolCoachPhone}
      />
    </View>
  );
}

function sameMajor(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
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
  const extras = draft.intendedMajors.filter(
    (major) => !MAJOR_SUGGESTIONS.some((suggestion) => sameMajor(suggestion, major)),
  );

  function toggleMajor(major: string) {
    const has = draft.intendedMajors.some((item) => sameMajor(item, major));
    onChange({
      intendedMajors: has
        ? draft.intendedMajors.filter((item) => !sameMajor(item, major))
        : [...draft.intendedMajors, major],
    });
  }

  function addCustomMajor() {
    const next = draft.customMajor.trim();
    if (next.length < 2) {
      onChange({ customMajor: next });
      return;
    }
    if (draft.intendedMajors.some((item) => sameMajor(item, next))) {
      onChange({ customMajor: '' });
      return;
    }
    const known = MAJOR_SUGGESTIONS.find((item) => sameMajor(item, next));
    onChange({
      intendedMajors: [...draft.intendedMajors, known ?? next],
      customMajor: '',
    });
  }

  function toggleFlag(key: 'asb' | 'honorRoll' | 'nationalHonorSociety' | 'teamCaptain') {
    onChange({ [key]: !draft[key] });
  }

  return (
    <View>
      <TextField
        field="gpa"
        label="GPA"
        value={draft.gpa}
        onChangeText={(gpa) => onChange({ gpa })}
        keyboardType="decimal-pad"
        placeholder="3.5"
        error={errors.gpa}
        hint="0 to 6.0, up to two decimals. Weighted GPAs can go above 4.0, up to 5.0 or 6.0 at some schools."
      />
      <AppText variant="label">GPA scale</AppText>
      <Wrap>
        <Chip
          label="Unweighted"
          selected={!draft.gpaWeighted}
          onPress={() => onChange({ gpaWeighted: false })}
        />
        <Chip label="Weighted" selected={draft.gpaWeighted} onPress={() => onChange({ gpaWeighted: true })} />
      </Wrap>
      <TextField
        field="sat"
        label="SAT"
        value={draft.sat}
        onChangeText={(sat) => onChange({ sat })}
        keyboardType="number-pad"
        placeholder="Optional"
        error={errors.sat}
      />
      <TextField
        field="act"
        label="ACT"
        value={draft.act}
        onChangeText={(act) => onChange({ act })}
        keyboardType="number-pad"
        placeholder="Optional"
        error={errors.act}
      />
      <TextField
        field="ncaaId"
        label="NCAA Eligibility Center ID"
        value={draft.ncaaId}
        onChangeText={(ncaaId) => onChange({ ncaaId })}
        keyboardType="number-pad"
        placeholder="Optional"
        error={errors.ncaaId}
        hint="Optional. Added to coach emails and your CV. Stays on this phone."
      />
      <FieldAnchor name="intendedMajors" invalid={Boolean(errors.intendedMajors)}>
      <AppText variant="label">Intended majors</AppText>
      <AppText variant="caption" style={styles.help}>
        Tap every one you are considering. This is for you. It is not part of the fit score.
      </AppText>
      <Wrap>
        {MAJOR_SUGGESTIONS.map((major) => (
          <Chip
            key={major}
            label={major}
            selected={draft.intendedMajors.some((item) => sameMajor(item, major))}
            onPress={() => toggleMajor(major)}
          />
        ))}
        {extras.map((major) => (
          <Chip key={major} label={major} selected onPress={() => toggleMajor(major)} />
        ))}
      </Wrap>
      {errors.intendedMajors ? <Error text={errors.intendedMajors} /> : null}
      </FieldAnchor>
      <FieldAnchor name="customMajor" invalid={Boolean(errors.customMajor)}>
      <View style={styles.addRow}>
        <TextInput
          value={draft.customMajor}
          onChangeText={(customMajor) => onChange({ customMajor })}
          placeholder="Add your own major"
          placeholderTextColor={colors.muted}
          onSubmitEditing={addCustomMajor}
          style={styles.addInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Add major" onPress={addCustomMajor} style={styles.addButton}>
          <AppText variant="caption" color="#F4F1EA">
            Add
          </AppText>
        </Pressable>
      </View>
      {errors.customMajor ? <Error text={errors.customMajor} /> : null}
      </FieldAnchor>

      <AppText variant="label" style={styles.section}>
        Honors & leadership
      </AppText>
      <AppText variant="caption" style={styles.help}>
        Tap anything that fits. Add a detail only where it helps.
      </AppText>
      <Wrap>
        <Chip label="ASB / student government" selected={draft.asb} onPress={() => toggleFlag('asb')} />
        <Chip
          label="Valedictorian"
          selected={draft.valedictorian}
          onPress={() => onChange({ valedictorian: !draft.valedictorian, salutatorian: false })}
        />
        <Chip
          label="Salutatorian"
          selected={draft.salutatorian}
          onPress={() => onChange({ salutatorian: !draft.salutatorian, valedictorian: false })}
        />
        <Chip label="Honor roll / Principal's list" selected={draft.honorRoll} onPress={() => toggleFlag('honorRoll')} />
        <Chip
          label="National Honor Society"
          selected={draft.nationalHonorSociety}
          onPress={() => toggleFlag('nationalHonorSociety')}
        />
        <Chip label="Team captain" selected={draft.teamCaptain} onPress={() => toggleFlag('teamCaptain')} />
      </Wrap>
      {draft.asb ? (
        <TextField
          field="asbRole"
          label="Student government role"
          value={draft.asbRole}
          onChangeText={(asbRole) => onChange({ asbRole })}
          placeholder="President, treasurer, class rep"
          error={errors.asbRole}
        />
      ) : null}
      <TextField
        field="apCourses"
        label="AP courses"
        value={draft.apCourses}
        onChangeText={(apCourses) => onChange({ apCourses })}
        placeholder="4, or Calc and Biology"
        error={errors.apCourses}
        hint="Optional. A count or a short list."
      />
      <TextField
        field="honorsCourses"
        label="Honors, IB, or dual enrollment"
        value={draft.honorsCourses}
        onChangeText={(honorsCourses) => onChange({ honorsCourses })}
        placeholder="IB History, dual-enrolled English"
        error={errors.honorsCourses}
        hint="Optional."
      />
      <TextField
        field="scholarAthlete"
        label="Scholar-athlete awards"
        value={draft.scholarAthlete}
        onChangeText={(scholarAthlete) => onChange({ scholarAthlete })}
        placeholder="All-league scholar, academic all-state"
        error={errors.scholarAthlete}
        hint="Optional."
      />
      <TextField
        field="serviceHours"
        label="Community service hours"
        value={draft.serviceHours}
        onChangeText={(serviceHours) => onChange({ serviceHours })}
        keyboardType="number-pad"
        placeholder="80"
        error={errors.serviceHours}
        hint="Optional."
      />
      <TextField
        field="otherAchievement"
        label="Other achievement"
        value={draft.otherAchievement}
        onChangeText={(otherAchievement) => onChange({ otherAchievement })}
        placeholder="Started a club, published a poem"
        error={errors.otherAchievement}
        hint="Optional."
      />
    </View>
  );
}

export function AboutFields({
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
      <AppText variant="body" style={styles.help}>
        Coaches remember a person. Two short answers are plenty, and you can skip either one.
      </AppText>
      <TextField
        field="proudOf"
        label="Something I'm proud of"
        value={draft.proudOf}
        onChangeText={(proudOf) => onChange({ proudOf })}
        placeholder="Making varsity, a class I loved, showing up for my little sister"
        error={errors.proudOf}
        hint="On the field or off. A sentence is perfect."
        multiline
        style={styles.shortNote}
      />
      <TextField
        field="funFact"
        label="Fun fact about me"
        value={draft.funFact}
        onChangeText={(funFact) => onChange({ funFact })}
        placeholder="I bake for the bus, or I can name every World Cup winner"
        error={errors.funFact}
        hint="The thing your teammates would tell a stranger."
        multiline
        style={styles.shortNote}
      />
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

  function toggleLevel(level: LevelPref) {
    const has = draft.levels.includes(level);
    onChange({
      openToAllLevels: false,
      levels: has ? draft.levels.filter((item) => item !== level) : [...draft.levels, level],
    });
  }

  function toggleLife(life: CampusLife) {
    onChange({ campusLife: toggle(draft.campusLife, life) });
  }

  return (
    <View>
      <AppText variant="body" style={styles.help}>
        Four years is a long time. Show us the kind of place that would feel like home.
      </AppText>
      <FieldAnchor name="levels" invalid={Boolean(errors.levels)}>
      <AppText variant="label">Level</AppText>
      <AppText variant="caption" style={styles.help}>
        Pick every level you'd actually play. Open to all if you are still looking around.
      </AppText>
      <Wrap>
        {LEVEL_PREFS.map((level) => (
          <Chip
            key={level}
            label={LEVEL_LABEL[level]}
            selected={!draft.openToAllLevels && draft.levels.includes(level)}
            onPress={() => toggleLevel(level)}
          />
        ))}
        <Chip
          label="Open to all"
          selected={draft.openToAllLevels}
          onPress={() => onChange({ openToAllLevels: !draft.openToAllLevels, levels: [] })}
        />
      </Wrap>
      {errors.levels ? <Error text={errors.levels} /> : null}
      </FieldAnchor>
      <FieldAnchor name="preferredRegions" invalid={Boolean(errors.preferredRegions)}>
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
      </FieldAnchor>
      <FieldAnchor name="schoolSizePreference" invalid={Boolean(errors.schoolSizePreference)}>
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
      </FieldAnchor>
      <AppText variant="label" style={styles.section}>
        Campus life
      </AppText>
      <AppText variant="caption" style={styles.help}>
        Optional. Tap the vibes you want. We'll mention a match on the card.
      </AppText>
      <Wrap>
        {CAMPUS_LIFE.map((life) => (
          <Chip
            key={life}
            label={CAMPUS_LIFE_LABEL[life]}
            selected={draft.campusLife.includes(life)}
            onPress={() => toggleLife(life)}
          />
        ))}
      </Wrap>
      <FieldAnchor name="budgetId" invalid={Boolean(errors.budgetId)}>
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
      </FieldAnchor>
      <TextField
        field="parentEmail"
        label="Parent email"
        value={draft.parentEmail}
        onChangeText={(parentEmail) => onChange({ parentEmail })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="parent@email.com"
        error={errors.parentEmail}
        hint="Required. We email a one-time approval link here when you publish a bio. It is also copied on coach emails, and it is not shown on the public page."
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
  heightRow: { flexDirection: 'row', gap: 8 },
  heightCell: { flex: 1 },
  stack: { gap: 8, marginBottom: 8 },
  sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  sportCard: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  sportOn: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  primaryBlock: { marginTop: 4, marginBottom: 8 },
  league: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  leagueOn: { borderColor: colors.greenDark, backgroundColor: '#E7F6EE' },
  leagueLabel: { flex: 1 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  boxOn: { borderColor: colors.greenDark, backgroundColor: colors.lime },
  section: { marginTop: 12 },
  recap: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
    marginBottom: 16,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  addInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  addButton: {
    backgroundColor: colors.greenDark,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  shortNote: { minHeight: 88, textAlignVertical: 'top' },
  error: { marginBottom: 10 },
});
