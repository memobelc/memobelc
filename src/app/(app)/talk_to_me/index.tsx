import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    { id: '1', text: 'Hello! How can I help you?', sender: 'bot' },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (inputText.trim() === '') return;
    const newMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
    };
    setMessages([...messages, newMessage]);
    setInputText('');
  };

  const renderItem = ({ item }) => (
    <View
      style={{
        alignSelf: item.sender === 'user' ? 'flex-end' : 'flex-start',
        backgroundColor: item.sender === 'user' ? '#007AFF' : '#E5E5EA',
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '70%',
      }}
    >
      <Text style={{ color: item.sender === 'user' ? '#fff' : '#000' }}>
        {item.text}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: '#F5F5F5' }}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 10,
          backgroundColor: '#fff',
          borderRadius: 25,
        }}
      >
        <TextInput
          style={{
            flex: 1,
            padding: 10,
            borderRadius: 20,
            backgroundColor: '#E5E5EA',
          }}
          placeholder="Enter your message..."
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity onPress={handleSend} style={{ marginLeft: 10 }}>
          <Ionicons name="send" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatbotScreen;
