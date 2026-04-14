import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

const SUGGESTED = [
  "What side effects should I watch for?",
  "Can I take ibuprofen with my medicines?",
  "What foods should I avoid?",
  "When should I go to emergency?",
];

const BOT_RESPONSES: Record<string, string> = {
  default:
    "I'm here to help with your recovery questions. I can explain your medicines, symptoms to watch for, and general post-discharge care. For urgent medical concerns, please contact your doctor or use the emergency button.",
  side:
    "Common side effects to watch for include nausea, dizziness, headache, or unusual fatigue. If you experience chest pain, difficulty breathing, or severe allergic reactions, seek emergency care immediately.",
  ibuprofen:
    "Ibuprofen (NSAIDs) can interact with some of your medications like Lisinopril and Aspirin. It's best to avoid it and use acetaminophen (Paracetamol) for pain relief unless your doctor specifically approves it.",
  food:
    "With your current medications: avoid grapefruit juice (interferes with Atorvastatin), limit salt intake (for blood pressure), and eat regular meals with Metformin. Alcohol should be minimized.",
  emergency:
    "Go to emergency immediately if you experience: severe chest pain, difficulty breathing, sudden confusion, loss of consciousness, signs of stroke (face drooping, arm weakness, slurred speech), or if your emergency button is needed. Don't wait — call emergency services.",
};

function getResponse(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("side") || lower.includes("effect")) return BOT_RESPONSES.side;
  if (lower.includes("ibuprofen") || lower.includes("nsaid")) return BOT_RESPONSES.ibuprofen;
  if (lower.includes("food") || lower.includes("eat") || lower.includes("diet") || lower.includes("avoid")) return BOT_RESPONSES.food;
  if (lower.includes("emergency") || lower.includes("urgent") || lower.includes("hospital")) return BOT_RESPONSES.emergency;
  return BOT_RESPONSES.default;
}

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      text: "Hello! I'm your DischargeBuddy health assistant. I can help answer questions about your medicines, symptoms, and recovery. What would you like to know?",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const send = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: msg,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [userMsg, ...prev]);
    setInput("");
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1200));

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      text: getResponse(msg),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [botMsg, ...prev]);
    setIsTyping(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.botAvatar, { backgroundColor: `${colors.primary}20` }]}>
          <Feather name="cpu" size={20} color={colors.primary} />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Health Assistant</Text>
          <Text style={[styles.headerSub, { color: colors.success }]}>Online</Text>
        </View>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        inverted
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          isTyping ? (
            <View style={[styles.bubble, styles.botBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.typingText, { color: colors.mutedForeground }]}>Typing...</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user"
                ? [styles.userBubble, { backgroundColor: colors.primary }]
                : [styles.botBubble, { backgroundColor: colors.card, borderColor: colors.border }],
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: item.role === "user" ? "#fff" : colors.foreground },
              ]}
            >
              {item.text}
            </Text>
            <Text
              style={[
                styles.bubbleTime,
                { color: item.role === "user" ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
              ]}
            >
              {item.time}
            </Text>
          </View>
        )}
      />

      {messages.length === 1 && (
        <View style={styles.suggestions}>
          <Text style={[styles.suggestLabel, { color: colors.mutedForeground }]}>Suggested questions:</Text>
          <View style={styles.suggestRow}>
            {SUGGESTED.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => send(s)}
                style={[styles.suggestChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.suggestText, { color: colors.primary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask a health question..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={() => send()}
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
          disabled={!input.trim()}
        >
          <Feather name="send" size={18} color={input.trim() ? "#fff" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 18,
    gap: 4,
  },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  botBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bubbleTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
  typingText: { fontSize: 14, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  suggestions: { paddingHorizontal: 16, paddingVertical: 12 },
  suggestLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginBottom: 8 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1,
  },
  suggestText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
