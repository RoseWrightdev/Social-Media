# Video Conferencing Hooks

**Quick Start**: Connect. Share media. Join rooms. Simple.

## Essential Hooks

### 1. Connection

```tsx
const { connect, disconnect, isConnected } = useRoomConnection();
```

### 2. Media

```tsx
const { localStream, toggleAudio, toggleVideo } = useMediaStream();
```

### 3. Room

```tsx
const { joinRoom, isJoined, participants } = useRoom();
```

## Complete Example

```tsx
import { useRoomConnection, useMediaStream, useRoom } from '../hooks';

export const VideoCall = () => {
  const { connect, isConnected } = useRoomConnection();
  const { localStream, toggleAudio, toggleVideo } = useMediaStream();
  const { joinRoom, isJoined } = useRoom();

  const handleJoin = async () => {
    await connect();
    await joinRoom('room-123', 'username');
  };

  return (
    <div>
      {!isJoined ? (
        <button onClick={handleJoin}>Join Call</button>
      ) : (
        <div>
          <video srcObject={localStream} autoPlay muted />
          <button onClick={toggleAudio}>Toggle Audio</button>
          <button onClick={toggleVideo}>Toggle Video</button>
        </div>
      )}
    </div>
  );
};
```

## Common Patterns

### Auto-cleanup

```tsx
useEffect(() => {
  return () => {
    cleanup();
    disconnect();
  };
}, []);
```

### Error handling

```tsx
try {
  await joinRoom(roomId, username);
} catch (error) {
  console.error('Join failed:', error);
}
```

### Device switching

```tsx
const { availableDevices, switchCamera } = useMediaStream();

// Switch to specific camera
await switchCamera(deviceId);
```

Done. Clean. Focused.
