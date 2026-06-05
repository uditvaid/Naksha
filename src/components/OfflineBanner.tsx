/**
 * Compact offline indicator pinned to the top of the screen tree.
 *
 * Renders nothing while connectivity looks healthy. Slides in a single-
 * line "you're offline" pill when NetInfo reports the device has lost
 * its connection AND has been offline for more than DEBOUNCE_MS — the
 * debounce on the online → offline transition stops a momentary radio
 * blip (e.g. switching from WiFi to cellular, brief tunnel) from
 * flashing the banner.
 *
 * The banner is purely informational. We don't gate UI: the panchang
 * card, the cosmic reading card, etc. each handle their own loading /
 * empty state. The banner exists so users understand *why* multiple
 * surfaces look quiet at once.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Colors, Fonts, Radius } from '@constants/theme';

const DEBOUNCE_MS = 1500;

export function OfflineBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const slide = useRef(new Animated.Value(-60)).current;
  // Hold a ref to the in-flight slide animation so we can cancel it
  // before starting a new one. Rapid online/offline flips otherwise
  // queue overlapping timings that fight each other.
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // NetInfo emits an initial event reflecting current state the
    // moment we subscribe. On a slow cold-launch with the radio still
    // negotiating, that first event can report offline even though the
    // device will be online a few hundred ms later — flashing the
    // banner during a normal boot. We skip the very first event to
    // avoid that false positive, and let the next genuine state-change
    // drive the banner.
    let isFirstEvent = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = NetInfo.addEventListener((state) => {
      if (isFirstEvent) {
        isFirstEvent = false;
        return;
      }
      const offline = state.isConnected === false || state.isInternetReachable === false;
      if (timer) { clearTimeout(timer); timer = null; }
      if (offline) {
        timer = setTimeout(() => setShowBanner(true), DEBOUNCE_MS);
      } else {
        setShowBanner(false);
      }
    });
    return () => {
      sub();
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    // Cancel any in-flight slide before starting a new one. Without this,
    // a quick offline→online→offline burst leaves overlapping animations
    // competing, draining battery on flaky networks.
    animationRef.current?.stop();
    animationRef.current = Animated.timing(slide, {
      toValue: showBanner ? 0 : -60,
      duration: 200,
      useNativeDriver: true,
    });
    animationRef.current.start();
  }, [showBanner, slide]);

  // pointerEvents=none so the banner never intercepts touches even
  // when it's animating off-screen.
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { transform: [{ translateY: slide }] }]}
    >
      <View style={styles.pill}>
        <Text style={styles.text}>You appear to be offline</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  pill: {
    backgroundColor: 'rgba(192, 57, 43, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  text: {
    color: Colors.star,
    fontFamily: Fonts.cinzel,
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
