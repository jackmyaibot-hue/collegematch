import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { playerStore, programCatalog, recruitingStore, sponsorInventory } from '../data';
import { emptyRecruiting, isoToday } from '../data/format';
import type { PlayerProfile, Program, RecruitingState, SavedProgram, SponsoredPlacement } from '../data/types';

type AppContextValue = {
  ready: boolean;
  error: string | null;
  profile: PlayerProfile | null;
  programs: Program[];
  sponsors: SponsoredPlacement[];
  recruiting: RecruitingState;
  dataSourceId: string;
  canUndo: boolean;
  saveProfile: (profile: PlayerProfile) => Promise<void>;
  clearAll: () => Promise<void>;
  saveProgram: (programId: string) => Promise<void>;
  passProgram: (programId: string) => Promise<void>;
  unsaveProgram: (programId: string) => Promise<void>;
  saveSponsor: (sponsorId: string) => Promise<void>;
  dismissSponsor: (sponsorId: string) => Promise<void>;
  setOutreach: (programId: string, patch: Partial<SavedProgram>) => Promise<void>;
  resetPasses: () => Promise<void>;
  undo: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sponsors, setSponsors] = useState<SponsoredPlacement[]>([]);
  const [recruiting, setRecruiting] = useState<RecruitingState>(emptyRecruiting());
  const [undoState, setUndoState] = useState<RecruitingState | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedProfile, storedRecruiting, storedPrograms, storedSponsors] = await Promise.all([
          playerStore.load(),
          recruitingStore.load(),
          programCatalog.listPrograms(),
          sponsorInventory.listPlacements(),
        ]);
        if (cancelled) return;
        setProfile(storedProfile);
        setRecruiting(storedRecruiting);
        setPrograms(storedPrograms);
        setSponsors(storedSponsors);
      } catch {
        if (!cancelled) setError('CollegeMatch could not read saved data on this phone.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: RecruitingState, undoFrom?: RecruitingState | null) => {
    setUndoState(undoFrom ?? null);
    setRecruiting(next);
    await recruitingStore.save(next);
  }, []);

  const saveProfile = useCallback(async (next: PlayerProfile) => {
    await playerStore.save(next);
    setProfile(next);
  }, []);

  const clearAll = useCallback(async () => {
    await playerStore.clear();
    await recruitingStore.clear();
    setProfile(null);
    setRecruiting(emptyRecruiting());
    setUndoState(null);
  }, []);

  const saveProgram = useCallback(
    async (programId: string) => {
      if (recruiting.saved[programId]) return;
      const { [programId]: _removed, ...passed } = recruiting.passed;
      const saved: SavedProgram = {
        programId,
        savedAt: new Date().toISOString(),
        status: 'not_contacted',
        followUpDate: null,
        coachId: null,
        subject: null,
        body: null,
      };
      await persist(
        { ...recruiting, passed, saved: { ...recruiting.saved, [programId]: saved } },
        recruiting,
      );
    },
    [persist, recruiting],
  );

  const passProgram = useCallback(
    async (programId: string) => {
      if (recruiting.passed[programId]) return;
      await persist(
        {
          ...recruiting,
          passed: { ...recruiting.passed, [programId]: { at: new Date().toISOString() } },
        },
        recruiting,
      );
    },
    [persist, recruiting],
  );

  const unsaveProgram = useCallback(
    async (programId: string) => {
      if (!recruiting.saved[programId]) return;
      const { [programId]: _removed, ...saved } = recruiting.saved;
      await persist({ ...recruiting, saved });
    },
    [persist, recruiting],
  );

  const saveSponsor = useCallback(
    async (sponsorId: string) => {
      await persist(
        {
          ...recruiting,
          sponsors: {
            ...recruiting.sponsors,
            [sponsorId]: { status: 'saved', at: new Date().toISOString() },
          },
        },
        recruiting,
      );
    },
    [persist, recruiting],
  );

  const dismissSponsor = useCallback(
    async (sponsorId: string) => {
      await persist(
        {
          ...recruiting,
          sponsors: {
            ...recruiting.sponsors,
            [sponsorId]: { status: 'dismissed', at: new Date().toISOString() },
          },
        },
        recruiting,
      );
    },
    [persist, recruiting],
  );

  const setOutreach = useCallback(
    async (programId: string, patch: Partial<SavedProgram>) => {
      const current: SavedProgram = recruiting.saved[programId] ?? {
        programId,
        savedAt: new Date().toISOString(),
        status: 'not_contacted',
        followUpDate: null,
        coachId: null,
        subject: null,
        body: null,
      };
      let followUpDate = patch.followUpDate === undefined ? current.followUpDate : patch.followUpDate;
      const status = patch.status ?? current.status;
      if (status === 'follow_up_due' && !followUpDate) followUpDate = isoToday();
      const { [programId]: _ignored, ...passed } = recruiting.passed;
      await persist({
        ...recruiting,
        passed,
        saved: {
          ...recruiting.saved,
          [programId]: { ...current, ...patch, status, followUpDate },
        },
      });
    },
    [persist, recruiting],
  );

  const resetPasses = useCallback(async () => {
    await persist({ ...recruiting, passed: {} });
  }, [persist, recruiting]);

  const undo = useCallback(async () => {
    if (!undoState) return;
    await persist(undoState);
  }, [persist, undoState]);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      error,
      profile,
      programs,
      sponsors,
      recruiting,
      dataSourceId: programCatalog.sourceId,
      canUndo: undoState != null,
      saveProfile,
      clearAll,
      saveProgram,
      passProgram,
      unsaveProgram,
      saveSponsor,
      dismissSponsor,
      setOutreach,
      resetPasses,
      undo,
    }),
    [
      ready,
      error,
      profile,
      programs,
      sponsors,
      recruiting,
      undoState,
      saveProfile,
      clearAll,
      saveProgram,
      passProgram,
      unsaveProgram,
      saveSponsor,
      dismissSponsor,
      setOutreach,
      resetPasses,
      undo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useAppState must be used inside AppStateProvider');
  return value;
}
