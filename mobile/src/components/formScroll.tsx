import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { findNodeHandle, ScrollView, View, type ScrollViewProps } from 'react-native';

const anchors = new Map<string, View>();
const focusers = new Map<string, () => void>();
let activeScroll: ScrollView | null = null;

export function FormScroll({ children, ...props }: ScrollViewProps & { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    activeScroll = scrollRef.current;
    return () => {
      if (activeScroll === scrollRef.current) activeScroll = null;
    };
  });
  return (
    <ScrollView ref={scrollRef} {...props}>
      {children}
    </ScrollView>
  );
}

export function registerFieldFocus(name: string, focus: () => void): () => void {
  focusers.set(name, focus);
  return () => {
    if (focusers.get(name) === focus) focusers.delete(name);
  };
}

export function FieldAnchor({
  name,
  invalid = false,
  children,
}: {
  name: string;
  invalid?: boolean;
  children: ReactNode;
}) {
  const setRef = useCallback(
    (node: View | null) => {
      if (node) anchors.set(name, node);
      else anchors.delete(name);
    },
    [name],
  );
  return (
    <View
      ref={setRef}
      nativeID={`field-${name}`}
      collapsable={false}
      style={invalid ? { borderWidth: 1, borderColor: '#E4376A', borderRadius: 16, padding: 8, marginBottom: 8 } : undefined}
    >
      {children}
    </View>
  );
}

function scrollField(node: HTMLElement) {
  let parent = node.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflow = `${style.overflowY} ${style.overflow}`;
    const canScroll = /(auto|scroll)/.test(overflow) && parent.scrollHeight > parent.clientHeight + 4;
    if (canScroll) {
      const parentRect = parent.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const next = nodeRect.top - parentRect.top + parent.scrollTop - parent.clientHeight / 2 + nodeRect.height / 2;
      parent.scrollTop = Math.max(0, next);
      return;
    }
    parent = parent.parentElement;
  }
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function focusWeb(name: string) {
  const node = document.getElementById(`field-${name}`);
  if (!node) return;
  scrollField(node);
  const input = node.querySelector('input, textarea');
  if (input instanceof HTMLElement) {
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  }
}

function focusNative(name: string) {
  const anchor = anchors.get(name);
  const scroll = activeScroll;
  const relative = scroll ? findNodeHandle(scroll) : null;
  if (anchor && scroll && relative) {
    anchor.measureLayout(
      relative,
      (_x, y) => {
        scroll.scrollTo({ y: Math.max(0, y - 20), animated: true });
        focusers.get(name)?.();
      },
      () => focusers.get(name)?.(),
    );
    return;
  }
  focusers.get(name)?.();
}

/** Scrolls to the first named field and focuses its text input when it has one. */
export function revealFields(names: string[]) {
  const first = names.find((name) => name.length > 0);
  if (!first) return;
  const run = () => {
    if (typeof document !== 'undefined') {
      focusWeb(first);
      return;
    }
    focusNative(first);
  };
  requestAnimationFrame(run);
  setTimeout(run, 80);
}
