import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { callEdgeFunction } from '@/lib/ai';
import { supabase } from '@/lib/supabase';
import { InsufficientLumenError } from '@/hooks/useLumen';
import { useLumenGate } from '@/hooks/useLumenGate';
import { LumenGateSheets } from '@/components/lumen/LumenGateSheets';
import { colors, fonts, spacing } from '@/constants/theme';
import type { DreamConversation } from '@/types/database';

const MAX_EXCHANGES = 10;
const SUGGESTED_PROMPTS = [
  'Explore the shadow figures',
  'Interpret the falling sensation',
  'Why now?',
];

interface GoDeeperProps {
  dreamId: string;
}

export function GoDeeper({ dreamId }: GoDeeperProps) {
  const [messages, setMessages] = useState<DreamConversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const lumenGate = useLumenGate();

  useEffect(() => {
    supabase
      .from('dream_conversations')
      .select('*')
      .eq('dream_id', dreamId)
      .order('exchange_number')
      .then(({ data }) => {
        setMessages(data || []);
        if (data) setRemaining(Math.max(0, MAX_EXCHANGES - Math.ceil(data.length / 2)));
      });
  }, [dreamId]);

  const sendMessage = useCallback(async (text?: string, opts?: { useAdCredit?: boolean }) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setLoading(true);

    try {
      // go-deeper deducts Lumen server-side (and consumes an ad credit if
      // use_ad_credit: true). Was client-side until the migration 20 lockdown.
      const result = await callEdgeFunction<{ reply: string; remaining: number }>('go-deeper', {
        dream_id: dreamId,
        message: msg,
        use_ad_credit: opts?.useAdCredit,
      });
      // Append locally instead of re-fetching every row. Temp IDs are fine —
      // the effect re-reads from DB if the user navigates away and back.
      const now = new Date().toISOString();
      setMessages(prev => {
        const nextNumber = prev.length + 1;
        const tempId = Date.now();
        const userMsg: DreamConversation = {
          id: `opt-u-${tempId}`,
          dream_id: dreamId,
          role: 'user',
          content: msg,
          exchange_number: nextNumber,
          created_at: now,
        };
        const aiMsg: DreamConversation = {
          id: `opt-a-${tempId}`,
          dream_id: dreamId,
          role: 'assistant',
          content: result.reply,
          exchange_number: nextNumber + 1,
          created_at: now,
        };
        return [...prev, userMsg, aiMsg];
      });
      setRemaining(result.remaining);
      setPendingMessage(null);
    } catch (err) {
      setInput(msg);
      if (err instanceof InsufficientLumenError) {
        setPendingMessage(msg);
        lumenGate.openInsufficient(err.current, err.required);
      } else if ((err as Error).message.includes('limit reached')) {
        setRemaining(0);
      }
    } finally {
      setLoading(false);
    }
  }, [input, dreamId, loading]);

  const exchangesUsed = Math.ceil(messages.length / 2);

  return (
    <View style={styles.container}>
      {/* Header — Stitch: psychology icon + "Analyst" */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.analystIcon}>
            <MaterialIcons name="psychology" size={22} color={colors.tertiaryFixedDim} />
          </View>
          <View>
            <Text style={styles.analystTitle}>Analyst</Text>
            <Text style={styles.analystSub}>DEEP ZONE ACTIVE</Text>
          </View>
        </View>
        <MaterialIcons name="auto-awesome" size={20} color={colors.tertiaryFixedDim} />
      </View>

      {/* Messages — Stitch chat bubbles */}
      {messages.map(msg => (
        <View
          key={msg.id}
          style={[styles.msgWrap, msg.role === 'user' ? styles.msgWrapUser : styles.msgWrapAi]}
        >
          <Text style={styles.msgLabel}>
            {msg.role === 'user' ? 'You' : 'Analyst'}
          </Text>
          {msg.role === 'user' ? (
            <LinearGradient
              colors={[colors.primary, colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.bubble, styles.userBubble]}
            >
              <Text style={styles.userText}>{msg.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.aiText}>{msg.content}</Text>
            </View>
          )}
        </View>
      ))}

      {loading && (
        <Text style={styles.thinking}>Descending deeper...</Text>
      )}

      {/* Interaction counter — Stitch dots */}
      <View style={styles.counterWrap}>
        <View style={styles.counterPill}>
          <View style={styles.dots}>
            {Array.from({ length: MAX_EXCHANGES }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < exchangesUsed ? styles.dotUsed : styles.dotEmpty]}
              />
            ))}
          </View>
          <Text style={styles.counterText}>
            {remaining !== null ? `${remaining}/${MAX_EXCHANGES} exchanges left` : `${MAX_EXCHANGES} exchanges`}
          </Text>
        </View>
      </View>

      {/* Input — Stitch: deep-zone-glass rounded-full */}
      {remaining === 0 ? (
        <Text style={styles.limitText}>You've reached the depth limit for this dream.</Text>
      ) : (
        <>
          <View style={styles.inputBar}>
            <MaterialIcons name="mic-none" size={22} color={colors.tertiaryFixedDim} style={{ padding: 12 }} />
            <TextInput
              style={styles.input}
              placeholder="Speak to the subconscious..."
              placeholderTextColor={`${colors.deepTextPrimary}4D`}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
              onPress={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              <MaterialIcons name="send" size={18} color="#ffffff" />
            </Pressable>
          </View>

          {/* Suggested prompts — Stitch */}
          {messages.length === 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll}>
              <View style={styles.promptsRow}>
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <Pressable
                    key={i}
                    style={styles.promptPill}
                    onPress={() => sendMessage(prompt)}
                  >
                    <Text style={styles.promptText}>{prompt}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}

      <LumenGateSheets
        gate={lumenGate}
        action="go_deeper"
        onAdCredited={() => {
          if (pendingMessage) sendMessage(pendingMessage, { useAdCredit: true });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  analystIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: `${colors.tertiaryContainer}66`, // tertiary-container/40
    borderWidth: 1,
    borderColor: `${colors.deepTextPrimary}1A`, // tertiary-fixed/10
    alignItems: 'center', justifyContent: 'center',
  },
  analystTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
    color: colors.deepTextPrimary,
    letterSpacing: -0.3,
  },
  analystSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: `${colors.tertiaryFixedDim}99`, // /60
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Messages
  msgWrap: {
    maxWidth: '85%',
    marginBottom: 32,
  },
  msgWrapUser: {
    alignSelf: 'flex-end',
  },
  msgWrapAi: {
    alignSelf: 'flex-start',
  },
  msgLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: `${colors.tertiaryFixedDim}66`, // /40
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bubble: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  userBubble: {
    borderRadius: 12,
    borderTopRightRadius: 0,
    shadowColor: `${colors.primary}1A`,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  aiBubble: {
    backgroundColor: 'rgba(120, 107, 173, 0.2)', // deep-zone-glass
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: `${colors.deepTextPrimary}0D`, // tertiary-fixed/5
  },
  userText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 24,
  },
  aiText: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.deepTextPrimary,
    lineHeight: 24,
  },
  thinking: {
    fontFamily: fonts.serifItalic,
    color: colors.deepTextSecondary,
    marginBottom: 16,
  },

  // Counter
  counterWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${colors.deepBg}99`,
    borderWidth: 1,
    borderColor: `${colors.deepTextPrimary}1A`,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
  },
  dotUsed: {
    backgroundColor: colors.primary,
  },
  dotEmpty: {
    backgroundColor: `${colors.tertiaryContainer}4D`, // /30
  },
  counterText: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    color: `${colors.tertiaryFixedDim}B3`, // /70
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(120, 107, 173, 0.2)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.deepTextPrimary}33`, // /20
    padding: 4,
    shadowColor: 'rgba(0,0,0,0.4)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.deepTextPrimary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    maxHeight: 80,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  limitText: {
    fontFamily: fonts.serifItalic,
    color: colors.deepTextSecondary,
    textAlign: 'center',
    marginTop: 16,
  },

  // Suggested prompts
  promptsScroll: {
    marginTop: 16,
  },
  promptsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  promptPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: `${colors.deepTextPrimary}1A`,
    backgroundColor: `${colors.tertiaryContainer}1A`, // /10
  },
  promptText: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.tertiaryFixedDim,
  },
});
