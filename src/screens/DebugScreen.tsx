// src/screens/DebugScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTailwind } from 'tailwind-rn';
import { DebugScreenProps } from '@navigation/types'; // Assuming you'll add this to types
import { useCallStore } from '@store/useCallStore';
import Logger from '@utils/logger';
import { SentryService } from '@services/sentryService';
import { Button, Icon } from '@components/common';
import { Colors } from '@constants/theme';
import { User } from '@customtypes/index';

const DebugScreen: React.FC<DebugScreenProps> = () => {
  const tw = useTailwind();
  const { connectionState: rtcConnectionState, connectedUsers, localStream, remoteStream } = useCallStore();
  const [logHistory, setLogHistory] = useState(Logger.getLogHistory());

  useEffect(() => {
    // Optionally, refresh log history if Logger might update it dynamically
    // For now, it gets a snapshot on mount/update.
    const interval = setInterval(() => {
        const newLogs = Logger.getLogHistory();
        // Only update if logs actually changed to prevent unnecessary re-renders
        if (newLogs.length !== logHistory.length || newLogs[newLogs.length -1] !== logHistory[logHistory.length-1]) {
            setLogHistory(newLogs);
        }
    }, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, [logHistory]); // Rerun effect if logHistory reference changes (e.g. initial set)

  const handleSendTestCrash = () => {
    try {
      throw new Error('Test Sentry Crash from Debug Panel (Synchronous Error)');
    } catch (error) {
      SentryService.captureException(error, { extra: { context: 'DebugPanelCrashButton' } });
      alert('Test crash sent to Sentry!');
    }
  };
  
  const handleSendTestMessage = () => {
    SentryService.captureMessage('Test Sentry Message from Debug Panel', 'debug');
    alert('Test message sent to Sentry!');
  };

  const renderLogItem = ({ item }: { item: ReturnType<typeof Logger.getLogHistory>[0] }) => (
    <View style={tw('mb-2 p-2 border-b border-gray-200')}>
      <Text style={tw('text-xs text-gray-500')}>{item.timestamp} [{item.level.toUpperCase()}]</Text>
      <Text style={tw('text-sm text-text')}>{item.message}</Text>
      {item.context && Object.keys(item.context).length > 0 && (
        <Text style={tw('text-xs text-gray-600 mt-1')}>
          Context: {JSON.stringify(item.context, null, 2)}
        </Text>
      )}
    </View>
  );

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={tw('p-2 border-b border-gray-200')}>
        <Text style={tw('text-sm text-text')}>{item.name} ({item.id.substring(0,8)}) - {item.role}</Text>
    </View>
  );

  return (
    <ScrollView style={tw('flex-1 bg-background')} contentContainerStyle={tw('p-4')}>
      <Text style={tw('text-2xl font-bold text-primary mb-6')}>Debug Panel</Text>

      <Section title="RTC Information">
        <InfoRow label="Connection State:" value={rtcConnectionState} />
        <InfoRow label="Local Stream:" value={localStream ? `Exists (ID: ${localStream.id.substring(0,8)})` : 'Not active'} />
        <InfoRow label="Remote Stream:" value={remoteStream ? `Exists (ID: ${remoteStream.id.substring(0,8)})` : 'Not active'} />
      </Section>

      <Section title={`Active Users in Call (${connectedUsers.length})`}>
        {connectedUsers.length > 0 ? (
            <FlatList
                data={connectedUsers}
                renderItem={renderUserItem}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 150 }} // Limit height for user list
                nestedScrollEnabled 
            />
        ) : (
            <Text style={tw('text-sm text-text-secondary')}>No users currently in call.</Text>
        )}
      </Section>
      
      <Section title="Sentry Testing">
        <Button
          title="Send Test Crash"
          onPress={handleSendTestCrash}
          type="destructive"
          leftIcon="Zap"
          style={tw('mb-2')}
        />
        <Button
          title="Send Test Message"
          onPress={handleSendTestMessage}
          type="secondary"
          leftIcon="MessageSquare"
        />
      </Section>

      <Section title="Log History (Last 100 entries)">
        <View style={[tw('border border-gray-300 rounded-md p-2'), {maxHeight: 400}]}>
            <FlatList
            data={logHistory.slice().reverse()} // Show newest logs first
            renderItem={renderLogItem}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            ListEmptyComponent={<Text style={tw('text-sm text-text-secondary p-2')}>Log buffer is empty.</Text>}
            nestedScrollEnabled
            />
        </View>
      </Section>
    </ScrollView>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const tw = useTailwind();
  return (
    <View style={tw('mb-6 p-4 bg-card rounded-lg shadow')}>
      <Text style={tw('text-lg font-semibold text-primary-dark mb-3')}>{title}</Text>
      {children}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const tw = useTailwind();
  return (
    <View style={tw('flex-row justify-between items-center py-1.5')}>
      <Text style={tw('text-sm font-medium text-text-secondary')}>{label}</Text>
      <Text style={tw('text-sm text-text text-right flex-shrink')} numberOfLines={1} ellipsizeMode="tail">{value}</Text>
    </View>
  );
};

export default DebugScreen;
