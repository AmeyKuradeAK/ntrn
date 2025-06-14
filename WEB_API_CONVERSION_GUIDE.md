# 🔄 Web API to React Native Conversion Guide - NTRN v2.2.9

This guide shows how NTRN intelligently converts web APIs to React Native equivalents with **enhanced verification** and **intelligent analysis**, ensuring you get a **fully working mobile app** instead of broken code.

## 🎯 Philosophy: Convert, Don't Remove

NTRN follows the principle of **intelligent conversion** rather than removal:
- ❌ **Basic converters**: Remove web APIs → Broken functionality
- ✅ **NTRN approach**: Convert to React Native equivalents → Working mobile app

## 🗄️ Storage APIs

### localStorage → AsyncStorage
```typescript
// WEB (Next.js)
localStorage.setItem('user', JSON.stringify(userData))
const user = JSON.parse(localStorage.getItem('user') || '{}')
localStorage.removeItem('user')

// MOBILE (React Native) - NTRN converts to:
import AsyncStorage from '@react-native-async-storage/async-storage'

const saveUser = async (userData) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(userData))
  } catch (error) {
    console.warn('Storage save failed:', error)
  }
}

const getUser = async () => {
  try {
    const user = await AsyncStorage.getItem('user')
    return user ? JSON.parse(user) : {}
  } catch (error) {
    console.warn('Storage read failed:', error)
    return {}
  }
}

const removeUser = async () => {
  try {
    await AsyncStorage.removeItem('user')
  } catch (error) {
    console.warn('Storage remove failed:', error)
  }
}

// Dependencies added: @react-native-async-storage/async-storage
```

### sessionStorage → AsyncStorage with Expiration
```typescript
// WEB (Next.js)
sessionStorage.setItem('tempData', 'value')
const data = sessionStorage.getItem('tempData')

// MOBILE (React Native) - NTRN converts to:
import AsyncStorage from '@react-native-async-storage/async-storage'

const setSessionData = async (key, value) => {
  try {
    const sessionData = {
      value,
      timestamp: Date.now(),
      expires: Date.now() + (30 * 60 * 1000) // 30 minutes
    }
    await AsyncStorage.setItem(`session_${key}`, JSON.stringify(sessionData))
  } catch (error) {
    console.warn('Session storage failed:', error)
  }
}

const getSessionData = async (key) => {
  try {
    const data = await AsyncStorage.getItem(`session_${key}`)
    if (!data) return null
    
    const sessionData = JSON.parse(data)
    if (Date.now() > sessionData.expires) {
      await AsyncStorage.removeItem(`session_${key}`)
      return null
    }
    
    return sessionData.value
  } catch (error) {
    console.warn('Session read failed:', error)
    return null
  }
}
```

## 🧭 Navigation APIs

### window.location → React Navigation
```typescript
// WEB (Next.js)
window.location.href = '/profile'
window.location.pathname // '/current-page'
window.location.search // '?id=123'

// MOBILE (React Native) - NTRN converts to:
import { useNavigation, useRoute } from '@react-navigation/native'

const MyComponent = () => {
  const navigation = useNavigation()
  const route = useRoute()
  
  const navigateToProfile = () => {
    navigation.navigate('Profile')
  }
  
  const currentScreen = route.name // 'CurrentScreen'
  const params = route.params // { id: '123' }
  
  return (
    <TouchableOpacity onPress={navigateToProfile}>
      <Text>Go to Profile</Text>
    </TouchableOpacity>
  )
}

// Dependencies added: @react-navigation/native
```

### window.history → Navigation Stack
```typescript
// WEB (Next.js)
window.history.back()
window.history.pushState(null, '', '/new-path')

// MOBILE (React Native) - NTRN converts to:
import { useNavigation } from '@react-navigation/native'

const MyComponent = () => {
  const navigation = useNavigation()
  
  const goBack = () => {
    navigation.goBack()
  }
  
  const pushNewScreen = () => {
    navigation.push('NewScreen')
  }
  
  return (
    <View>
      <TouchableOpacity onPress={goBack}>
        <Text>Go Back</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={pushNewScreen}>
        <Text>Push New Screen</Text>
      </TouchableOpacity>
    </View>
  )
}
```

## 📍 Geolocation APIs

### navigator.geolocation → Expo Location
```typescript
// WEB (Next.js)
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log(position.coords.latitude, position.coords.longitude)
  },
  (error) => console.error(error)
)

// MOBILE (React Native) - NTRN converts to:
import * as Location from 'expo-location'
import { useState, useEffect } from 'react'

const LocationComponent = () => {
  const [location, setLocation] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setErrorMsg('Location permission denied')
        return
      }

      const position = await Location.getCurrentPositionAsync({})
      setLocation(position)
    } catch (error) {
      setErrorMsg('Failed to get location')
      console.error(error)
    }
  }

  return (
    <View>
      {location ? (
        <Text>
          Lat: {location.coords.latitude}, 
          Lng: {location.coords.longitude}
        </Text>
      ) : (
        <Text>{errorMsg || 'Getting location...'}</Text>
      )}
    </View>
  )
}

// Dependencies added: expo-location
```

## 📋 Clipboard APIs

### navigator.clipboard → Expo Clipboard
```typescript
// WEB (Next.js)
navigator.clipboard.writeText('Hello World')
navigator.clipboard.readText().then(text => console.log(text))

// MOBILE (React Native) - NTRN converts to:
import * as Clipboard from 'expo-clipboard'
import { Alert } from 'react-native'

const ClipboardComponent = () => {
  const copyToClipboard = async (text) => {
    try {
      await Clipboard.setStringAsync(text)
      Alert.alert('Success', 'Copied to clipboard')
    } catch (error) {
      Alert.alert('Error', 'Failed to copy')
    }
  }

  const readFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync()
      console.log('Clipboard content:', text)
      return text
    } catch (error) {
      console.warn('Failed to read clipboard:', error)
      return ''
    }
  }

  return (
    <TouchableOpacity onPress={() => copyToClipboard('Hello World')}>
      <Text>Copy to Clipboard</Text>
    </TouchableOpacity>
  )
}

// Dependencies added: expo-clipboard
```

## 🔔 Notification APIs

### Web Notifications → Expo Notifications
```typescript
// WEB (Next.js)
if (Notification.permission === 'granted') {
  new Notification('Hello', { body: 'World' })
}

// MOBILE (React Native) - NTRN converts to:
import * as Notifications from 'expo-notifications'
import { useState, useEffect } from 'react'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const NotificationComponent = () => {
  const [permissionStatus, setPermissionStatus] = useState(null)

  useEffect(() => {
    requestPermissions()
  }, [])

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync()
      setPermissionStatus(status)
    } catch (error) {
      console.warn('Notification permission failed:', error)
    }
  }

  const sendNotification = async () => {
    if (permissionStatus === 'granted') {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Hello',
            body: 'World',
          },
          trigger: null, // Show immediately
        })
      } catch (error) {
        console.warn('Failed to send notification:', error)
      }
    }
  }

  return (
    <TouchableOpacity onPress={sendNotification}>
      <Text>Send Notification</Text>
    </TouchableOpacity>
  )
}

// Dependencies added: expo-notifications
```

## 📁 File APIs

### FileReader → Expo FileSystem
```typescript
// WEB (Next.js)
const fileInput = document.getElementById('file-input')
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0]
  const reader = new FileReader()
  reader.onload = (e) => console.log(e.target.result)
  reader.readAsText(file)
})

// MOBILE (React Native) - NTRN converts to:
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'

const FilePickerComponent = () => {
  const pickAndReadFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })
      
      if (!result.cancelled) {
        const fileContent = await FileSystem.readAsStringAsync(result.uri)
        console.log('File content:', fileContent)
      }
    } catch (error) {
      console.warn('File reading failed:', error)
    }
  }

  return (
    <TouchableOpacity onPress={pickAndReadFile}>
      <Text>Pick and Read File</Text>
    </TouchableOpacity>
  )
}

// Dependencies added: expo-document-picker, expo-file-system
```

## 🌐 Network APIs

### navigator.onLine → Expo NetInfo
```typescript
// WEB (Next.js)
console.log('Online:', navigator.onLine)
window.addEventListener('online', () => console.log('Back online'))
window.addEventListener('offline', () => console.log('Gone offline'))

// MOBILE (React Native) - NTRN converts to:
import NetInfo from '@react-native-netinfo/netinfo'
import { useState, useEffect } from 'react'

const NetworkComponent = () => {
  const [isConnected, setIsConnected] = useState(true)
  const [networkType, setNetworkType] = useState(null)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected)
      setNetworkType(state.type)
      
      if (state.isConnected) {
        console.log('Back online')
      } else {
        console.log('Gone offline')
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <View>
      <Text>
        Status: {isConnected ? 'Online' : 'Offline'}
      </Text>
      <Text>
        Type: {networkType}
      </Text>
    </View>
  )
}

// Dependencies added: @react-native-netinfo/netinfo
```

## 🎬 Media APIs

### HTML5 Audio/Video → Expo AV
```typescript
// WEB (Next.js)
const audio = new Audio('/music.mp3')
audio.play()

// MOBILE (React Native) - NTRN converts to:
import { Audio } from 'expo-av'
import { useState } from 'react'

const AudioComponent = () => {
  const [sound, setSound] = useState()

  const playAudio = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/music.mp3')
      )
      setSound(sound)
      await sound.playAsync()
    } catch (error) {
      console.warn('Audio playback failed:', error)
    }
  }

  const stopAudio = async () => {
    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
    }
  }

  return (
    <View>
      <TouchableOpacity onPress={playAudio}>
        <Text>Play Audio</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={stopAudio}>
        <Text>Stop Audio</Text>
      </TouchableOpacity>
    </View>
  )
}

// Dependencies added: expo-av
```

## 🎯 Result: Fully Working Mobile App

With these intelligent conversions, NTRN ensures that:

✅ **All functionality is preserved** - Nothing gets lost in translation  
✅ **Mobile-optimized patterns** - Uses proper React Native/Expo APIs  
✅ **Error handling** - Robust async/await patterns with try-catch  
✅ **Permissions** - Proper mobile permission handling  
✅ **Performance** - Native mobile performance instead of web emulation  
✅ **Platform-appropriate UX** - Touch interactions, alerts, native UI patterns  

**No more broken apps from removed APIs!** 🎉 