import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';

type NotifyPeopleModalProps = {
  visible: boolean;
  recipientCount: number;
  sending?: boolean;
  onSend: (title: string, body: string) => void;
  onClose: () => void;
};

export function NotifyPeopleModal({
  visible,
  recipientCount,
  sending = false,
  onSend,
  onClose,
}: NotifyPeopleModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!visible) {
      setTitle('');
      setBody('');
    }
  }, [visible]);

  const canSend = title.trim().length > 0 && body.trim().length > 0 && recipientCount > 0 && !sending;

  const handleClose = () => {
    if (sending) return;
    setTitle('');
    setBody('');
    onClose();
  };

  const handleSend = () => {
    if (!canSend) return;
    onSend(title.trim(), body.trim());
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center bg-black/50 px-4"
          activeOpacity={1}
          onPress={handleClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            className="bg-white rounded-2xl w-full max-w-[520px] p-5"
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-bold" style={{ color: colors.gray[800] }}>
                {t('Send notification')}
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={sending} hitSlop={8}>
                <MaterialIcons name="close" size={22} color={colors.gray[500]} />
              </TouchableOpacity>
            </View>

            <Text className="text-sm mb-3" style={{ color: colors.gray[500] }}>
              {t('This will send to {{count}} people.', { count: recipientCount })}
            </Text>

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t('Notification title')}
              placeholderTextColor={colors.gray[400]}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-2"
              maxLength={120}
            />
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder={t('Notification message')}
              placeholderTextColor={colors.gray[400]}
              className="border border-gray-200 rounded-lg px-3 py-2.5 mb-4"
              multiline
              numberOfLines={4}
              maxLength={1000}
              style={{ minHeight: 96, textAlignVertical: 'top' }}
            />

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleClose}
                disabled={sending}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold" style={{ color: colors.gray[700] }}>
                  {t('Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSend}
                disabled={!canSend}
                className="flex-[2] rounded-xl py-3 items-center"
                style={{
                  backgroundColor: canSend ? colors.primary[500] : colors.gray[300],
                }}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">{t('Send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}
