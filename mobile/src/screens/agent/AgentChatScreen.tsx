import React from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { ChatMessage, listMyThread, markMyThreadRead, sendMyMessage } from '@/services/api/chat.api';

const formatTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

export default function AgentChatScreen() {
  const { token, user } = useAuthContext();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState('');
  const [isSending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const data = await listMyThread(token);
      setMessages(data);
      markMyThreadRead(token).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      const interval = setInterval(load, 15000);
      return () => clearInterval(interval);
    }, [load]),
  );

  const handleSend = async () => {
    if (!token || !draft.trim()) return;
    setSending(true);
    try {
      const message = await sendMyMessage(token, draft.trim());
      setMessages((prev) => [...prev, message]);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <HeaderLayout title="Messages" subtitle="Échangez avec vos superviseurs" accent="Communication" scrollable={false} showBack>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.headerRow}>
          <Ionicons name="chatbubbles-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.headerRowText}>Fil de discussion</Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.md }}
            ListEmptyComponent={<Text style={styles.empty}>Aucun message. Écrivez à votre superviseur.</Text>}
            renderItem={({ item }) => {
              const isMine = item.senderId === user?.id;
              return (
                <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{item.body}</Text>
                    <View style={styles.bubbleFooter}>
                      <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>{formatTime(item.createdAt)}</Text>
                      {isMine && (
                        <Ionicons
                          name={item.readAt ? 'checkmark-done-outline' : 'checkmark-outline'}
                          size={13}
                          color="rgba(255,255,255,0.7)"
                          style={styles.bubbleStatusIcon}
                        />
                      )}
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Votre message…"
            placeholderTextColor={theme.colors.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Button
            title={isSending ? '…' : 'Envoyer'}
            icon="send"
            onPress={handleSend}
            disabled={isSending || !draft.trim()}
            size="sm"
          />
        </View>
      </KeyboardAvoidingView>
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  headerRowText: {
    fontFamily: theme.fonts.bodySemiBold,
    fontSize: 15,
    color: theme.colors.ink,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: theme.spacing.xl,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowTheirs: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
  },
  bubbleMine: {
    backgroundColor: theme.colors.ink,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: theme.colors.sage,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: theme.colors.ink,
  },
  bubbleTextMine: {
    color: '#fff',
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  bubbleTime: {
    color: theme.colors.muted,
    fontSize: 11,
  },
  bubbleTimeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleStatusIcon: {
    marginTop: 0,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.clay,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.clay,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    maxHeight: 100,
    color: theme.colors.ink,
  },
});
