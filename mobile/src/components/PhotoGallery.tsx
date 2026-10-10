import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { ImageSourcePropType } from 'react-native';
import { CARD_PHOTO_CAPTIONS } from './cardPhotos';
import { AppText } from './ui';

export function PhotoGallery({
  visible,
  photos,
  schoolName,
  onClose,
}: {
  visible: boolean;
  photos: ImageSourcePropType[];
  schoolName: string;
  onClose: () => void;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const sheetWidth = Math.min(windowWidth, 480);
  const photoHeight = Math.max(280, Math.min(windowHeight * 0.58, 640));
  const [page, setPage] = useState(0);
  const [failed, setFailed] = useState(false);
  const translateY = useSharedValue(0);
  const ready = useSharedValue(false);

  useEffect(() => {
    if (!visible) {
      ready.value = false;
      translateY.value = 0;
      return;
    }
    setPage(0);
    setFailed(false);
    translateY.value = 0;
    ready.value = false;
    const timer = setTimeout(() => {
      ready.value = true;
    }, 280);
    return () => clearTimeout(timer);
  }, [visible, ready, translateY]);

  const close = useCallback(() => {
    translateY.value = 0;
    onClose();
  }, [onClose, translateY]);

  const turn = useCallback(
    (delta: number) => {
      setPage((current) => {
        const next = current + delta;
        if (next < 0 || next >= photos.length) return current;
        setFailed(false);
        return next;
      });
    },
    [photos.length],
  );

  const drag = Gesture.Pan()
    .onUpdate((event) => {
      if (!ready.value) return;
      const vertical = Math.abs(event.translationY) > Math.abs(event.translationX);
      translateY.value = vertical ? Math.max(0, event.translationY) : 0;
    })
    .onEnd((event) => {
      if (!ready.value) {
        translateY.value = 0;
        return;
      }
      const vertical = event.translationY > 24 && Math.abs(event.translationY) > Math.abs(event.translationX);
      translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      if (vertical && (event.translationY > 90 || event.velocityY > 800)) {
        runOnJS(close)();
        return;
      }
      if (!vertical && (event.translationX <= -36 || event.velocityX < -700)) runOnJS(turn)(1);
      else if (!vertical && (event.translationX >= 36 || event.velocityX > 700)) runOnJS(turn)(-1);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const caption = CARD_PHOTO_CAPTIONS[page] ?? 'Photo';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close photos" style={styles.backdrop} onPress={close} />
        <GestureDetector gesture={drag}>
          <View style={{ width: sheetWidth }}>
          <Animated.View style={[styles.sheet, { width: sheetWidth, maxHeight: windowHeight * 0.92 }, sheetStyle]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <AppText variant="headline" color="#F7F4EE" numberOfLines={1}>
                  {caption}
                </AppText>
                <AppText variant="caption" color="#D5E6DC" numberOfLines={1}>
                  {schoolName} · {page + 1} of {photos.length}
                </AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={close} hitSlop={10} style={styles.close}>
                <Ionicons name="close" size={22} color="#F7F4EE" />
              </Pressable>
            </View>
            <View style={[styles.frame, { width: sheetWidth, height: photoHeight }]}>
              {failed ? (
                <AppText variant="body" color="#F7F4EE">
                  This photo did not load.
                </AppText>
              ) : (
                <Image
                  key={page}
                  source={photos[page]}
                  style={{ width: sheetWidth, height: photoHeight }}
                  resizeMode="cover"
                  onError={() => setFailed(true)}
                />
              )}
            </View>
            <View style={styles.dots}>
              {photos.map((_, index) => (
                <View key={index} style={[styles.dot, index === page && styles.dotOn]} />
              ))}
            </View>
            <AppText variant="caption" color="#D5E6DC" style={styles.hint}>
              Swipe sideways for the next photo · swipe down to close
            </AppText>
          </Animated.View>
          </View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(8, 14, 12, 0.55)' },
  sheet: {
    backgroundColor: '#10241C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 18,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(247, 244, 238, 0.45)',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 2 },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247, 244, 238, 0.14)',
  },
  frame: { backgroundColor: '#0C1A14', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(247, 244, 238, 0.35)' },
  dotOn: { width: 18, backgroundColor: '#F7F4EE' },
  hint: { textAlign: 'center', marginTop: 8 },
});
