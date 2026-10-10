import { PLAYMAKERS } from '../copy';
import { AppText, Button } from './ui';
import { SPORT_LABEL } from '../data/sports';
import type { Sport } from '../data/types';
import { StyleSheet, View } from 'react-native';

export function ComingSoon({
  sport,
  detail,
  onTrySoccer,
}: {
  sport: Sport;
  detail?: string;
  onTrySoccer?: () => void;
}) {
  const name = SPORT_LABEL[sport];
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{name} is coming soon.</AppText>
      <AppText variant="body">
        {detail ??
          `We'll let you know when ${name.toLowerCase()} programs are ready for ${PLAYMAKERS} to swipe. Your pick stays on this phone.`}
      </AppText>
      <AppText variant="body">Girls' soccer is open now if you want to start.</AppText>
      {onTrySoccer ? <Button label="Try girls' soccer" onPress={onTrySoccer} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14, paddingTop: 12 },
});
