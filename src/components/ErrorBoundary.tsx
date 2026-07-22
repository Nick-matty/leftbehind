import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Radius } from '../utils/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

/** Catches render crashes so users get a recovery screen instead of a blank white page. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Something went wrong' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('LeftBehind ErrorBoundary:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <MaterialIcons name="error-outline" size={48} color={Colors.blue} />
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          LeftBehind hit an unexpected error. Your saved trips are safe — try again.
        </Text>
        {!!this.state.message && <Text style={styles.detail}>{this.state.message}</Text>}
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleRetry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: '#F2F2F7',
    gap: Spacing.sm,
  },
  title: { ...Typography.h2, color: '#1C1C1E', marginTop: Spacing.md, textAlign: 'center' },
  body: { ...Typography.small, color: '#636366', textAlign: 'center', maxWidth: 300 },
  detail: { ...Typography.tiny, color: '#8E8E93', textAlign: 'center', marginTop: Spacing.xs },
  button: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.blue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
