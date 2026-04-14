import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Dimensions } from "react-native";

const SIDEBAR_WIDTH = Dimensions.get("window").width * 0.78;

interface SidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  translateX: Animated.Value;
  overlayOpacity: Animated.Value;
  SIDEBAR_WIDTH: number;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const open = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateX, overlayOpacity]);

  const close = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -SIDEBAR_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setIsOpen(false));
  }, [translateX, overlayOpacity]);

  const toggle = useCallback(() => {
    if (isOpen) close();
    else open();
  }, [isOpen, open, close]);

  return (
    <SidebarContext.Provider
      value={{ isOpen, open, close, toggle, translateX, overlayOpacity, SIDEBAR_WIDTH }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
