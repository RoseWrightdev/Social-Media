# Social Media

todo: intro

## Frontend

├── app/
│   └── (room)/
│       └── [roomId]/
│           ├── page.tsx          # Main room entry point
│           └── layout.tsx        # Room-specific layout
├── components/
│   ├── layout/
│   │   ├── VideoGrid.tsx
│   │   ├── ControlBar.tsx
│   │   └── SidePanel.tsx
│   ├── core/
│   │   ├── ParticipantTile.tsx
│   │   ├── Avatar.tsx
│   │   ├── ControlButton.tsx
│   │   └── Spinner.tsx
│   └── panels/
│       ├── ChatPanel.tsx
│       ├── ParticipantsPanel.tsx
│       └── WaitingRoomPanel.tsx
├── hooks/
│   ├── useRoomConnection.ts      # Manages WebSocket and WebRTC logic
│   └── useMediaStream.ts         # Handles local camera/mic access
├── lib/
│   ├── websocket.ts            # WebSocket connection utility
│   └── webrtc.ts               # WebRTC peer connection logic
├── store/
│   └── useRoomStore.ts         # Central Zustand store
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── store/
└── cypress/
    └── e2e/
        └── room_flow.cy.ts

The full set of designs is available on my [Figma account]([url](https://www.figma.com/design/7uD81ikYXdkFDPeAWfXRl8/Social-Media----Comms?node-id=41-2&t=lxks1c13fWrUnXKb-0)).
<img width="1512" height="982" alt="UI Shown Talking" src="https://github.com/user-attachments/assets/af9924f4-9724-4bc3-8b6f-cf4feac0755f" />
<img width="1512" height="982" alt="Chat   Particpants" src="https://github.com/user-attachments/assets/1354c553-7088-404d-851e-29c9c52f201b" />
<img width="1512" height="982" alt="UI Shown No Camera Talking-2" src="https://github.com/user-attachments/assets/4da5e28a-40dc-4d57-a886-259692388859" />

## Backend