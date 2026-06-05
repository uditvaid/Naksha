/**
 * Root error boundary — last line of defence against a render-time
 * throw white-screening the entire app.
 *
 * Wraps the navigation tree in `_layout.tsx`. When any child throws
 * during render or lifecycle, we:
 *   1. Capture the error in Sentry with the React component stack
 *   2. Show a calm fallback screen (matches app's aesthetic — not the
 *      RN red-box, which gets shipped to production users on dev
 *      builds and is alarming)
 *   3. Offer a single "Try again" button that resets the boundary's
 *      key, forcing React to re-mount the subtree
 *
 * Class component because hooks can't catch render errors — this is
 * the one React.Component case in the codebase.
 */

import { Component, ReactNode } from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Spacing } from '@constants/theme';
import { reportError } from '@services/telemetry';

interface Props {
  children: ReactNode;
}

interface State {
  /** The error currently displayed. Null when healthy. */
  error: Error | null;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // Forward to Sentry. componentStack helps narrow down which screen
    // / component threw, which is otherwise hard to reconstruct from
    // the JS stack alone in production builds where names are mangled.
    reportError(error, {
      source: 'root_error_boundary',
      componentStack: info.componentStack?.slice(0, 500) ?? 'unknown',
    });
  }

  private handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.sparkle}>✦</Text>
          <Text style={styles.title}>Something went sideways.</Text>
          <Text style={styles.body}>
            Naksha hit an unexpected error. Your data is safe — nothing has been lost.
            Try again, and if the issue keeps happening, restart the app.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <Text style={styles.btnText}>Try Again ✦</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <Text style={styles.devError}>
              {this.state.error.message}
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.midnight },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sparkle: {
    fontSize: 48,
    color: Colors.gold,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 22,
    fontFamily: Fonts.cinzel,
    color: Colors.gold,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: Fonts.crimson,
    color: Colors.star,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  btn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
  },
  btnText: {
    fontSize: 14,
    fontFamily: Fonts.cinzel,
    color: Colors.midnight,
    letterSpacing: 0.5,
  },
  devError: {
    fontSize: 11,
    color: Colors.amber,
    fontFamily: Fonts.crimson,
    marginTop: Spacing.lg,
    textAlign: 'center',
    maxWidth: 320,
  },
});
