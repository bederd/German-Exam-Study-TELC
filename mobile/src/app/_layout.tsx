import { Tabs } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import { initDb } from '../services/db';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error(err);
        setDbError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const retryInit = () => {
    setDbError(null);
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error(err);
        setDbError(err instanceof Error ? err.message : String(err));
      });
  };

  if (dbError) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: Colors.error || 'red', fontSize: 16, textAlign: 'center', marginBottom: 20 }}>
          {dbError}
        </Text>
        <TouchableOpacity
          onPress={retryInit}
          style={{ backgroundColor: Colors.primary || '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ color: Colors.text, marginTop: 16 }}>Veritabanı Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          height: 60,
          paddingBottom: 8,
          position: 'absolute',
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'İstatistik',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📊</Text>,
        }}
      />
      <Tabs.Screen
        name="flashcards"
        options={{
          title: 'Kelimeler',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>📇</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color }}>⚙️</Text>,
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="exercises" options={{ href: null }} />
    </Tabs>
  );
}
