import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Clipboard,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';

interface InviteFriendsModalProps {
  open: boolean;
  onClose: () => void;
}

interface InvitedFriend {
  _id?: string;
  user_id?: string;
  email: string;
  invite_code?: string;
  invited_at?: string;
  accepted_at?: string;
  status: 'pending' | 'accepted';
}

export const InviteFriendsModal = ({
  open,
  onClose,
}: InviteFriendsModalProps) => {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { toast } = useToast();

  const [inviteMethod, setInviteMethod] = useState<'email' | 'link'>('email');
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState<InvitedFriend[]>([]);

  useEffect(() => {
    if (open) {
      fetchInvitedFriends();
    }
  }, [open]);

  const fetchInvitedFriends = async () => {
    if (!userInfo?.token) return;

    try {
      setLoadingFriends(true);
      const response = await api.get('/invite/friends', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });

      if (response.data && response.data.invited_friends) {
        setInvitedFriends(response.data.invited_friends);
      }
    } catch (error) {
      console.error('Error fetching invited friends:', error);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSendEmailInvite = async () => {
    if (!email.trim()) {
      toast({
        message: t('Email is required'),
        variant: 'destructive',
      });
      return;
    }

    if (!userInfo?.token) return;

    try {
      setLoading(true);
      const response = await api.post(
        '/invite/email',
        { email: email.trim().toLowerCase() },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        },
      );

      if (response.status === 200) {
        toast({
          message: t('Invite sent successfully'),
          variant: 'success',
        });
        setEmail('');
        fetchInvitedFriends();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || t('Error sending invite');
      toast({
        message: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!userInfo?.token) return;

    try {
      setLoading(true);
      const response = await api.post(
        '/invite/link',
        {},
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        },
      );

      if (response.status === 200) {
        setInviteLink(response.data.invite_link);
        setInviteCode(response.data.invite_code);
        toast({
          message: t('Invite link generated'),
          variant: 'success',
        });
        fetchInvitedFriends();
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || t('Error generating link');
      toast({
        message: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      try {
        if (Platform.OS === 'web') {
          await navigator.clipboard.writeText(inviteLink);
        } else {
          Clipboard.setString(inviteLink);
        }
        toast({
          message: t('Link copied to clipboard'),
          variant: 'success',
        });
      } catch (error) {
        console.error('Error copying link:', error);
      }
    }
  };

  const handleCopyCode = async () => {
    if (inviteCode) {
      try {
        if (Platform.OS === 'web') {
          await navigator.clipboard.writeText(inviteCode);
        } else {
          Clipboard.setString(inviteCode);
        }
        toast({
          message: t('Code copied to clipboard'),
          variant: 'success',
        });
      } catch (error) {
        console.error('Error copying code:', error);
      }
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={open}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end items-center bg-black/75">
        <View
          className="bg-white rounded-t-lg w-full h-[90%] p-6"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-2xl font-bold" style={{ color: colors.text }}>
              {t('Invite Friends')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Tabs para escolher método */}
          <View
            className="flex-row mb-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <TouchableOpacity
              onPress={() => setInviteMethod('email')}
              className="flex-1 pb-3 items-center"
              style={{
                borderBottomWidth: inviteMethod === 'email' ? 2 : 0,
                borderBottomColor:
                  inviteMethod === 'email'
                    ? colors.primary[500]
                    : 'transparent',
              }}
            >
              <Text
                className="font-semibold"
                style={{
                  color:
                    inviteMethod === 'email'
                      ? colors.primary[500]
                      : colors.textSecondary,
                }}
              >
                {t('By Email')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setInviteMethod('link')}
              className="flex-1 pb-3 items-center"
              style={{
                borderBottomWidth: inviteMethod === 'link' ? 2 : 0,
                borderBottomColor:
                  inviteMethod === 'link' ? colors.primary[500] : 'transparent',
              }}
            >
              <Text
                className="font-semibold"
                style={{
                  color:
                    inviteMethod === 'link'
                      ? colors.primary[500]
                      : colors.textSecondary,
                }}
              >
                {t('By Link')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Método por Email */}
            {inviteMethod === 'email' && (
              <View>
                <Text className="text-base mb-2" style={{ color: colors.text }}>
                  {t('Enter the email address to send an invite')}
                </Text>
                <View className="flex-row gap-2 mb-4">
                  <TextInput
                    className="flex-1 border rounded-lg px-4 py-3"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                    placeholder={t('Email address')}
                    placeholderTextColor={colors.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={handleSendEmailInvite}
                    disabled={loading || !email.trim()}
                    className="px-6 py-3 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor:
                        loading || !email.trim()
                          ? colors.gray[400]
                          : colors.primary[500],
                    }}
                  >
                    {loading ? (
                      <Loading />
                    ) : (
                      <MaterialIcons name="send" size={24} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Método por Link */}
            {inviteMethod === 'link' && (
              <View>
                <Text className="text-base mb-4" style={{ color: colors.text }}>
                  {t('Generate a unique invite link to share')}
                </Text>
                <TouchableOpacity
                  onPress={handleGenerateLink}
                  disabled={loading}
                  className="mb-4 px-6 py-3 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: loading
                      ? colors.gray[400]
                      : colors.primary[500],
                  }}
                >
                  {loading ? (
                    <Loading />
                  ) : (
                    <Text className="text-white font-semibold">
                      {inviteLink ? t('Regenerate Link') : t('Generate Link')}
                    </Text>
                  )}
                </TouchableOpacity>

                {inviteLink && (
                  <View className="mb-4">
                    <Text
                      className="text-sm mb-2"
                      style={{ color: colors.textSecondary }}
                    >
                      {t('Invite Link')}:
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        className="flex-1 border rounded-lg px-4 py-3"
                        style={{
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                        value={inviteLink}
                        editable={false}
                      />
                      <TouchableOpacity
                        onPress={handleCopyLink}
                        className="px-4 py-3 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary[500] }}
                      >
                        <MaterialIcons
                          name="content-copy"
                          size={20}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {inviteCode && (
                  <View>
                    <Text
                      className="text-sm mb-2"
                      style={{ color: colors.textSecondary }}
                    >
                      {t('Invite Code')}:
                    </Text>
                    <View className="flex-row gap-2">
                      <TextInput
                        className="flex-1 border rounded-lg px-4 py-3"
                        style={{
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          color: colors.text,
                        }}
                        value={inviteCode}
                        editable={false}
                      />
                      <TouchableOpacity
                        onPress={handleCopyCode}
                        className="px-4 py-3 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary[500] }}
                      >
                        <MaterialIcons
                          name="content-copy"
                          size={20}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Lista de Amigos Convidados */}
            <View className="mt-6">
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: colors.text }}
              >
                {t('Invited Friends')}
              </Text>

              {loadingFriends ? (
                <View className="items-center py-8">
                  <Loading />
                </View>
              ) : invitedFriends.length === 0 ? (
                <View className="items-center py-8">
                  <MaterialCommunityIcons
                    name="account-plus-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    className="text-base mt-4 text-center"
                    style={{ color: colors.textSecondary }}
                  >
                    {t('No friends invited yet')}
                  </Text>
                </View>
              ) : (
                <View>
                  {invitedFriends.map((friend, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between p-4 mb-3 rounded-lg"
                      style={{ backgroundColor: colors.background }}
                    >
                      <View className="flex-1">
                        <Text
                          className="font-semibold text-base"
                          style={{ color: colors.text }}
                        >
                          {friend.email}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View
                            className="px-2 py-1 rounded-full mr-2"
                            style={{
                              backgroundColor:
                                friend.status === 'accepted'
                                  ? colors.success[100]
                                  : colors.warning[100],
                            }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{
                                color:
                                  friend.status === 'accepted'
                                    ? colors.success[700]
                                    : colors.warning[700],
                              }}
                            >
                              {friend.status === 'accepted'
                                ? t('Accepted')
                                : t('Pending')}
                            </Text>
                          </View>
                          {friend.accepted_at && (
                            <Text
                              className="text-xs"
                              style={{ color: colors.textSecondary }}
                            >
                              {new Date(
                                friend.accepted_at,
                              ).toLocaleDateString()}
                            </Text>
                          )}
                        </View>
                      </View>
                      {friend.status === 'accepted' && (
                        <MaterialIcons
                          name="check-circle"
                          size={24}
                          color={colors.success[500]}
                        />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
