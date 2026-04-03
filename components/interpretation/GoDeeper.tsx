import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { callEdgeFunction } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, borderRadius } from '@/constants/theme';
import type { DreamConversation } from '@/types/database';

interface GoDeeperProps {
  dreamId: string;
}

export function GoDeeper({ dreamId }: GoDeeperProps) {
  const [messages, setMessages] = useState<DreamConversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Load existing conversation
  useEffect(() => {
    supabase
      .from('dream_conversations')
      .select('*')
      .eq('dream_id', dreamId)
      .order('exchange_number')
      .then(({ data }) => setMessages(data || []));
  }, [dreamId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    setLoading(true);

    try {
      const result = await callEdgeFunction<{ reply: string; remaining: number }>('go-deeper', {
        dream_id: dreamId,
        message: text,
      });

      // Refresh conversation
      const { data } = await supabase
        .from('dream_conversations')
        .select('*')
        .eq('dream_id', dreamId)
        .order('exchange_number');
      setMessages(data || []);
      setRemaining(result.remaining);
    } catch (err) {
      setInput(text);
      const errMsg = (err as Error).message;
      if (errMsg.includes('limit reached')) {
        setRemaining(0);
      }
    } finally {
      setLoading(false);
    }
  }, [input, dreamId]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Go Deeper</Text>

      {messages.map(msg => (
        <View key={msg.id} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.assistantText]}>
            {msg.content}
          </Text>
        </View>
      ))}

      {loading && (
        <Text style={styles.thinking}>Descending deeper...</Text>
      )}

      {remaining === 0 ? (
        <Text style={styles.limitText}>You've reached the depth limit for this dream.</Text>
      ) : (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about your dream..."
            placeholderTextColor={colors.deepTextSecondary}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable style={styles.sendButton} onPress={sendMessage} disabled={loading || !input.trim()}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      )}

      {remaining !== null && remaining > 0 && (
        <Text style={styles.remainingText}>{remaining} exchanges remaining</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.deepBg, borderRadius: borderRadius.md, paddingBottom: spacing.md },
  title: { fontFamily: fonts.serif, fontSize: 16, color: colors.deepAccent, fontStyle: 'italic', marginBottom: spacing.md },
  bubble: { padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.sm, maxWidth: '85%' },
  userBubble: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: colors.deepBgCard, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.deepBorder },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { fontFamily: fonts.serif, color: colors.deepTextPrimary },
  thinking: { fontFamily: fonts.serif, color: colors.deepTextSecondary, fontStyle: 'italic', marginBottom: spacing.sm },
  limitText: { fontFamily: fonts.serif, color: colors.deepTextSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  inputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  input: { flex: 1, backgroundColor: colors.deepBgCard, color: colors.deepTextPrimary, borderRadius: borderRadius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: colors.deepBorder, maxHeight: 100 },
  sendButton: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingHorizontal: 16, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
  remainingText: { color: colors.deepTextSecondary, fontSize: 12, textAlign: 'center', marginTop: spacing.xs },
});
