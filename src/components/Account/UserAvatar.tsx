import React, { useEffect, useState } from 'react'
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native'

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

interface Props {
  // Basta nome e (facoltativa) foto: vale anche per gli altri partecipanti
  user: { name: string; photoUrl?: string | null }
  size: number
  textColor?: string
  backgroundColor?: string
  style?: ViewStyle
}

// Foto profilo di Google; se manca o non si carica mostra le iniziali
const UserAvatar = ({ user, size, textColor = 'white', backgroundColor = '#FF5A5F', style }: Props) => {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [user.photoUrl])

  const showPhoto = !!user.photoUrl && !failed

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: showPhoto ? '#E2E8F0' : backgroundColor },
        style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri: user.photoUrl as string }}
          style={{ width: size, height: size }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { color: textColor, fontSize: size * 0.34 }]}>{getInitials(user.name)}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 0.3,
  },
})

export default UserAvatar
