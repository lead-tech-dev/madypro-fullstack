import React from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HeaderLayout } from '@/components/layout/HeaderLayout';
import { Button } from '@/components/ui/Button';
import { theme } from '@/config/theme';
import { useAuthContext } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useStaggeredFadeIn } from '@/hooks/useStaggeredFadeIn';
import { AgentStackParamList } from '@/navigation/types';
import { createTeamPost, deleteTeamPost, listTeamFeed, TeamPost } from '@/services/api/team-feed.api';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Superviseur',
  AGENT: 'Agent',
};

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AgentTeamFeedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AgentStackParamList>>();
  const { token, user } = useAuthContext();
  const { showToast } = useToast();
  const { getItemStyle } = useStaggeredFadeIn();

  const [posts, setPosts] = React.useState<TeamPost[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listTeamFeed(token);
      setPosts(data);
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible de charger le fil.', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  React.useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load]),
  );

  const handlePost = async () => {
    if (!token || !message.trim()) return;
    setSubmitting(true);
    try {
      await createTeamPost(token, message.trim());
      setMessage('');
      load();
    } catch (err) {
      showToast('Erreur', err instanceof Error ? err.message : 'Impossible de publier.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!token) return;
    Alert.alert('Supprimer la publication', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTeamPost(token, id);
            setPosts((prev) => prev.filter((p) => p.id !== id));
          } catch (err) {
            showToast('Erreur', err instanceof Error ? err.message : 'Suppression impossible.', 'error');
          }
        },
      },
    ]);
  };

  return (
    <HeaderLayout
      title="Fil d'actualité"
      subtitle="Les annonces et messages de l'équipe"
      accent="Équipe"
      trailing={
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      }
    >
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Partager une actualité avec l'équipe..."
          placeholderTextColor={theme.colors.muted}
          value={message}
          onChangeText={setMessage}
          multiline
        />
        <Button
          title={isSubmitting ? 'Publication...' : 'Publier'}
          icon="send-outline"
          onPress={handlePost}
          disabled={isSubmitting || !message.trim()}
          fullWidth
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>Aucune publication pour le moment.</Text>
      ) : (
        <View style={styles.list}>
          {posts.map((post, index) => (
            <Animated.View key={post.id} style={getItemStyle(index)}>
              <View style={styles.item}>
                <View style={styles.itemHeader}>
                  <View>
                    <Text style={styles.author}>
                      {post.author.firstName} {post.author.lastName}
                    </Text>
                    <Text style={styles.meta}>
                      {ROLE_LABELS[post.author.role] ?? post.author.role} · {formatDateTime(post.createdAt)}
                    </Text>
                  </View>
                  {(post.author.id === user?.id || user?.role === 'ADMIN') && (
                    <TouchableOpacity onPress={() => handleDelete(post.id)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.muted} />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.message}>{post.message}</Text>
              </View>
            </Animated.View>
          ))}
        </View>
      )}
    </HeaderLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e2e8f0',
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 60,
    color: theme.colors.ink,
    textAlignVertical: 'top',
  },
  list: {
    gap: theme.spacing.md,
  },
  item: {
    backgroundColor: '#fff',
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8ecf2',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  author: {
    fontFamily: theme.fonts.bodySemiBold,
    color: theme.colors.ink,
    fontSize: 15,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  message: {
    color: theme.colors.ink,
    lineHeight: 20,
  },
  empty: {
    color: theme.colors.muted,
    fontStyle: 'italic',
  },
});
