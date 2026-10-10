import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { DeckCard } from '../data/deck';
import type { PlayerProfile } from '../data/types';
import { colors } from '../theme';
import { ProgramCard } from './ProgramCard';
import { SponsoredCard } from './SponsoredCard';
import { AppText } from './ui';

type Handle = { fling: (direction: 'left' | 'right') => void };

function CardFace({
  item,
  profile,
  onGalleryChange,
}: {
  item: DeckCard;
  profile: PlayerProfile;
  onGalleryChange?: (open: boolean) => void;
}) {
  if (item.type === 'sponsored') return <SponsoredCard placement={item.placement} />;
  return <ProgramCard program={item.program} fit={item.fit} profile={profile} onGalleryChange={onGalleryChange} />;
}

const TopCard = forwardRef<
  Handle,
  { item: DeckCard; profile: PlayerProfile; onDone: (direction: 'left' | 'right') => void }
>(function TopCard({ item, profile, onDone }, ref) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const intro = useSharedValue(0);
  const locked = useSharedValue(false);
  const galleryLock = useSharedValue(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const finish = useCallback((direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    onDoneRef.current(direction);
  }, []);

  useEffect(() => {
    intro.value = withSpring(1, { damping: 16, stiffness: 180 });
  }, [intro]);

  const exitFromJs = useCallback(
    (direction: 'left' | 'right') => {
      if (locked.value) return;
      locked.value = true;
      const sign = direction === 'right' ? 1 : -1;
      x.value = withTiming(sign * 560, { duration: 230 }, (finished) => {
        if (finished) runOnJS(finish)(direction);
      });
    },
    [finish, locked, x],
  );

  useImperativeHandle(ref, () => ({
    fling(direction) {
      exitFromJs(direction);
    },
  }));

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-20, 20])
        .failOffsetY([-14, 14])
        .onTouchesDown((_event, manager) => {
          if (galleryLock.value) manager.fail();
        })
        .onUpdate((event) => {
          if (locked.value || galleryLock.value) return;
          x.value = event.translationX;
          y.value = event.translationY * 0.25;
        })
        .onEnd((event) => {
          if (locked.value || galleryLock.value) {
            if (!locked.value) {
              x.value = withSpring(0);
              y.value = withSpring(0);
            }
            return;
          }
          const goRight = event.translationX > 110 || event.velocityX > 900;
          const goLeft = event.translationX < -110 || event.velocityX < -900;
          if (goRight || goLeft) {
            locked.value = true;
            const direction = goRight ? 'right' : 'left';
            const sign = goRight ? 1 : -1;
            x.value = withTiming(sign * 560, { duration: 230 }, (finished) => {
              if (finished) runOnJS(finish)(direction);
            });
            return;
          }
          x.value = withSpring(0);
          y.value = withSpring(0);
        }),
    [finish, galleryLock, locked, x, y],
  );

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: interpolate(intro.value, [0, 1], [16, 0]) + y.value },
      { scale: interpolate(intro.value, [0, 1], [0.96, 1]) },
      { rotate: `${interpolate(x.value, [-220, 0, 220], [-11, 0, 11])}deg` },
    ],
  }));
  const saveStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [20, 110], [0, 1], Extrapolation.CLAMP),
  }));
  const passStyle = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [-110, -20], [1, 0], Extrapolation.CLAMP),
  }));

  const saveLabel = 'SAVE';
  const passLabel = item.type === 'sponsored' ? 'SKIP' : 'PASS';

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.fill, cardStyle]}>
        <CardFace
          item={item}
          profile={profile}
          onGalleryChange={(open) => {
            galleryLock.value = open;
          }}
        />
        <Animated.View style={[styles.stamp, styles.saveStamp, saveStyle]}>
          <AppText variant="headline" color={colors.green} style={styles.stampText}>
            {saveLabel}
          </AppText>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.passStamp, passStyle]}>
          <AppText variant="headline" color={colors.rose} style={styles.stampText}>
            {passLabel}
          </AppText>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

export function SwipeDeck({
  items,
  profile,
  onSwipe,
}: {
  items: DeckCard[];
  profile: PlayerProfile;
  onSwipe: (direction: 'left' | 'right', item: DeckCard) => void;
}) {
  const top = items[0];
  const next = items[1];
  const cardRef = useRef<Handle>(null);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  if (!top) return null;
  const rightLabel = top.type === 'sponsored' ? 'Save camp' : 'Save';
  const leftLabel = top.type === 'sponsored' ? 'Skip' : 'Pass';
  const visitLabel = top.type === 'sponsored' ? 'More' : 'Visit';

  const openDetail = () => {
    if (top.type === 'sponsored') {
      router.push({ pathname: '/camp/[id]', params: { id: top.placement.id } });
      return;
    }
    router.push({ pathname: '/school/[id]', params: { id: top.program.id } });
  };

  return (
    <View style={styles.deck}>
      <View style={styles.stage}>
        {next ? (
          <View pointerEvents="none" style={[styles.fill, styles.back]}>
            <CardFace item={next} profile={profile} />
          </View>
        ) : null}
        <TopCard
          key={top.type === 'program' ? top.program.id : top.placement.id}
          ref={cardRef}
          item={top}
          profile={profile}
          onDone={(direction) => onSwipeRef.current(direction, top)}
        />
      </View>
      <View style={styles.actions}>
        <ActionButton
          label={leftLabel}
          glyph="✕"
          tone="pass"
          onPress={() => cardRef.current?.fling('left')}
        />
        <ActionButton label={visitLabel} glyph="→" tone="visit" onPress={openDetail} />
        <ActionButton
          label={rightLabel}
          glyph="♥"
          tone="save"
          onPress={() => cardRef.current?.fling('right')}
        />
      </View>
      <AppText variant="caption" style={styles.hint}>
        Swipe right to save · left to pass
      </AppText>
    </View>
  );
}

function ActionButton({
  label,
  glyph,
  tone,
  onPress,
}: {
  label: string;
  glyph: string;
  tone: 'pass' | 'save' | 'visit';
  onPress: () => void;
}) {
  const save = tone === 'save';
  const visit = tone === 'visit';
  const ink = save ? colors.ink : visit ? colors.greenDark : colors.rose;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        save ? styles.actionSave : visit ? styles.actionVisit : styles.actionPass,
        pressed && { opacity: 0.85 },
      ]}
    >
      <AppText variant="title" color={ink} style={styles.glyph}>
        {glyph}
      </AppText>
      <AppText variant="caption" color={ink} style={styles.actionLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  deck: { flex: 1 },
  stage: { flex: 1, marginBottom: 12 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  back: { transform: [{ scale: 0.96 }, { translateY: 14 }] },
  stamp: {
    position: 'absolute',
    top: 22,
    borderWidth: 3,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  saveStamp: { left: 18, borderColor: colors.green, transform: [{ rotate: '-12deg' }] },
  passStamp: { right: 18, borderColor: colors.rose, transform: [{ rotate: '12deg' }] },
  stampText: { letterSpacing: 1.5 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 },
  action: {
    width: 84,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionSave: { backgroundColor: colors.lime, borderColor: colors.lime },
  actionPass: { backgroundColor: colors.white },
  actionVisit: { width: 68, height: 60, borderRadius: 20, backgroundColor: colors.white },
  glyph: { fontSize: 22, lineHeight: 26 },
  actionLabel: { fontFamily: 'Outfit_700Bold' },
  hint: { textAlign: 'center', marginTop: 8 },
});
