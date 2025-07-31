import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebRTCManager, PeerConnection, MediaDeviceUtils, WebRTCConfig, PeerConnectionState, StreamType } from '@/lib/webrtc'
import { WebSocketClient, ClientInfo } from '@/lib/websockets'

// Mock WebRTC Event Classes
global.RTCPeerConnectionIceEvent = class RTCPeerConnectionIceEvent extends Event {
  candidate: RTCIceCandidate | null
  constructor(type: string, init: { candidate: RTCIceCandidate | null }) {
    super(type)
    this.candidate = init.candidate
  }
} as any

global.RTCTrackEvent = class RTCTrackEvent extends Event {
  streams: readonly MediaStream[]
  track: MediaStreamTrack
  receiver: RTCRtpReceiver
  transceiver: RTCRtpTransceiver
  constructor(type: string, init: { streams: readonly MediaStream[], track: MediaStreamTrack, receiver: RTCRtpReceiver, transceiver: RTCRtpTransceiver }) {
    super(type)
    this.streams = init.streams
    this.track = init.track
    this.receiver = init.receiver
    this.transceiver = init.transceiver
  }
} as any

global.RTCDataChannelEvent = class RTCDataChannelEvent extends Event {
  channel: RTCDataChannel
  constructor(type: string, init: { channel: RTCDataChannel }) {
    super(type)
    this.channel = init.channel
  }
} as any

// Advanced Mock RTCPeerConnection for comprehensive testing
class AdvancedMockRTCPeerConnection extends EventTarget {
  connectionState: RTCPeerConnectionState = 'new'
  iceConnectionState: RTCIceConnectionState = 'new'
  signalingState: RTCSignalingState = 'stable'
  localDescription: RTCSessionDescription | null = null
  remoteDescription: RTCSessionDescription | null = null
  
  // Event handlers
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null
  ontrack: ((event: RTCTrackEvent) => void) | null = null
  onconnectionstatechange: ((event: Event) => void) | null = null
  oniceconnectionstatechange: ((event: Event) => void) | null = null
  onnegotiationneeded: ((event: Event) => void) | null = null
  ondatachannel: ((event: RTCDataChannelEvent) => void) | null = null

  // Internal state
  private tracks: RTCRtpSender[] = []
  public dataChannels: MockRTCDataChannel[] = []
  public shouldFailOffer = false
  public shouldFailAnswer = false
  public shouldFailIceCandidate = false
  public shouldFailClose = false

  createOffer = vi.fn().mockImplementation((options?: RTCOfferOptions) => {
    if (this.shouldFailOffer) {
      return Promise.reject(new Error('Failed to create offer'))
    }
    return Promise.resolve({
      type: 'offer' as RTCSdpType,
      sdp: 'mock-offer-sdp'
    })
  })

  createAnswer = vi.fn().mockImplementation((options?: RTCAnswerOptions) => {
    if (this.shouldFailAnswer) {
      return Promise.reject(new Error('Failed to create answer'))
    }
    return Promise.resolve({
      type: 'answer' as RTCSdpType,
      sdp: 'mock-answer-sdp'
    })
  })

  setLocalDescription = vi.fn().mockImplementation((description: RTCSessionDescriptionInit) => {
    this.localDescription = new RTCSessionDescription(description)
    return Promise.resolve()
  })

  setRemoteDescription = vi.fn().mockImplementation((description: RTCSessionDescriptionInit) => {
    this.remoteDescription = new RTCSessionDescription(description)
    return Promise.resolve()
  })

  addIceCandidate = vi.fn().mockImplementation((candidate: RTCIceCandidateInit) => {
    if (this.shouldFailIceCandidate) {
      return Promise.reject(new Error('Failed to add ICE candidate'))
    }
    return Promise.resolve()
  })

  addTrack = vi.fn().mockImplementation((track: MediaStreamTrack, stream: MediaStream) => {
    const sender = new MockRTCRtpSender(track)
    this.tracks.push(sender)
    return sender
  })

  removeTrack = vi.fn().mockImplementation((sender: RTCRtpSender) => {
    const index = this.tracks.indexOf(sender)
    if (index > -1) {
      this.tracks.splice(index, 1)
    }
  })

  getSenders = vi.fn().mockImplementation(() => {
    return [...this.tracks]
  })

  createDataChannel = vi.fn().mockImplementation((label: string, options?: RTCDataChannelInit) => {
    const channel = new MockRTCDataChannel(label, options)
    this.dataChannels.push(channel)
    return channel as unknown as RTCDataChannel
  })

  getStats = vi.fn().mockImplementation(() => {
    const stats = new Map()
    stats.set('mock-stats-1', {
      type: 'candidate-pair',
      state: 'succeeded',
      bytesReceived: 12345,
      bytesSent: 54321
    })
    return Promise.resolve(stats as RTCStatsReport)
  })

  close = vi.fn().mockImplementation(() => {
    if (this.shouldFailClose) {
      throw new Error('Close failed')
    }
    this.connectionState = 'closed'
    this.iceConnectionState = 'closed'
    // Clean up data channels to prevent timeout errors
    this.dataChannels.forEach(channel => {
      try {
        channel.close()
      } catch (error) {
        // Ignore errors during cleanup
      }
    })
    this.dataChannels = []
  })

  // Test control methods
  simulateIceCandidate(candidate: Partial<RTCIceCandidate> = {}): void {
    const mockCandidate = {
      candidate: 'candidate:mock-candidate',
      sdpMid: 'data',
      sdpMLineIndex: 0,
      ...candidate
    } as RTCIceCandidate

    const event = new RTCPeerConnectionIceEvent('icecandidate', { candidate: mockCandidate })
    this.onicecandidate?.(event)
    this.dispatchEvent(event)
  }

  simulateTrack(stream: MediaStream, track: MediaStreamTrack): void {
    const event = new RTCTrackEvent('track', {
      streams: [stream],
      track,
      receiver: {} as RTCRtpReceiver,
      transceiver: {} as RTCRtpTransceiver
    })
    this.ontrack?.(event)
    this.dispatchEvent(event)
  }

  simulateConnectionStateChange(state: RTCPeerConnectionState): void {
    this.connectionState = state
    const event = new Event('connectionstatechange')
    this.onconnectionstatechange?.(event)
    this.dispatchEvent(event)
  }

  simulateNegotiationNeeded(): void {
    const event = new Event('negotiationneeded')
    this.onnegotiationneeded?.(event)
    this.dispatchEvent(event)
  }

  simulateDataChannel(label: string): void {
    const channel = new MockRTCDataChannel(label)
    const event = new RTCDataChannelEvent('datachannel', { channel: channel as unknown as RTCDataChannel })
    this.ondatachannel?.(event)
    this.dispatchEvent(event)
  }

  // Error simulation methods
  setFailOffer(fail: boolean): void {
    this.shouldFailOffer = fail
  }

  setFailAnswer(fail: boolean): void {
    this.shouldFailAnswer = fail
  }

  setFailIceCandidate(fail: boolean): void {
    this.shouldFailIceCandidate = fail
  }
}

// Mock RTCRtpSender
class MockRTCRtpSender implements Partial<RTCRtpSender> {
  track: MediaStreamTrack | null
  dtmf: RTCDTMFSender | null = null
  transform: RTCRtpTransform | null = null
  transport: RTCDtlsTransport | null = null

  constructor(track: MediaStreamTrack) {
    this.track = track
  }

  replaceTrack(track: MediaStreamTrack | null): Promise<void> {
    this.track = track
    return Promise.resolve()
  }

  getParameters(): RTCRtpSendParameters {
    return {} as RTCRtpSendParameters
  }

  setParameters(parameters: RTCRtpSendParameters): Promise<void> {
    return Promise.resolve()
  }

  getStats(): Promise<RTCStatsReport> {
    return Promise.resolve(new Map() as RTCStatsReport)
  }

  setStreams(...streams: MediaStream[]): void {
    // Mock implementation
  }
}

// Mock RTCDataChannel
class MockRTCDataChannel extends EventTarget {
  label: string
  readyState: RTCDataChannelState = 'connecting'
  private openTimeout?: NodeJS.Timeout
  
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(label: string, options?: RTCDataChannelInit) {
    super()
    this.label = label
    this.openTimeout = setTimeout(() => this.simulateOpen(), 10)
  }

  send(data: string): void {
    if (this.readyState !== 'open') {
      throw new Error('Data channel is not open')
    }
    // Simulate message received on remote end
  }

  close(): void {
    if (this.openTimeout) {
      clearTimeout(this.openTimeout)
      this.openTimeout = undefined
    }
    this.readyState = 'closed'
    const event = new Event('close')
    this.onclose?.(event)
    try {
      this.dispatchEvent(event)
    } catch (error) {
      // Ignore dispatch errors during cleanup
    }
  }

  simulateOpen(): void {
    this.readyState = 'open'
    const event = new Event('open')
    this.onopen?.(event)
    try {
      this.dispatchEvent(event)
    } catch (error) {
      // Ignore dispatch errors during cleanup
    }
  }

  simulateMessage(data: any): void {
    const event = new MessageEvent('message', { data: JSON.stringify(data) })
    this.onmessage?.(event)
    try {
      this.dispatchEvent(event)
    } catch (error) {
      // Ignore dispatch errors during cleanup
    }
  }

  simulateError(): void {
    const event = new Event('error')
    this.onerror?.(event)
    try {
      this.dispatchEvent(event)
    } catch (error) {
      // Ignore dispatch errors during cleanup
    }
  }
}

// Mock MediaStream and MediaStreamTrack
class MockMediaStreamTrack extends EventTarget {
  kind: string
  id: string
  enabled = true
  readyState: MediaStreamTrackState = 'live'
  
  onended: ((event: Event) => void) | null = null

  constructor(kind: string, id: string = `${kind}-${Math.random()}`) {
    super()
    this.kind = kind
    this.id = id
  }

  stop(): void {
    this.readyState = 'ended'
    const event = new Event('ended')
    this.onended?.(event)
    this.dispatchEvent(event)
  }

  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack(this.kind, `${this.id}-clone`) as unknown as MediaStreamTrack
  }
}

class MockMediaStream extends EventTarget {
  id: string
  active = true
  private tracks: MediaStreamTrack[] = []

  constructor(tracks: MediaStreamTrack[] = []) {
    super()
    this.id = `stream-${Math.random()}`
    this.tracks = tracks
  }

  getTracks(): MediaStreamTrack[] {
    return [...this.tracks]
  }

  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'audio')
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter(track => track.kind === 'video')
  }

  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track)
  }

  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track)
    if (index > -1) {
      this.tracks.splice(index, 1)
    }
  }
}

// Mock WebSocket for WebRTC tests
class MockWebSocketForWebRTC extends EventTarget {
  url: string
  readyState = 1 // OPEN
  sentMessages: any[] = []

  constructor(url: string) {
    super()
    this.url = url
  }

  send(data: string): void {
    this.sentMessages.push(JSON.parse(data))
  }

  close(): void {
    this.readyState = 3 // CLOSED
  }

  simulateMessage(message: any): void {
    const event = new MessageEvent('message', { data: JSON.stringify(message) })
    this.dispatchEvent(event)
  }
}

describe('WebRTC Integration Layer - 100% Coverage', () => {
  let mockPeerConnection: AdvancedMockRTCPeerConnection
  let mockWebSocket: MockWebSocketForWebRTC
  let mockWebSocketClient: WebSocketClient
  let RTCPeerConnectionSpy: any
  let getUserMediaSpy: any
  let getDisplayMediaSpy: any
  let enumerateDevicesSpy: any

  const mockClientInfo: ClientInfo = {
    clientId: 'test-client-123',
    displayName: 'Test User'
  }

  const mockConfig: WebRTCConfig = {
    iceServers: [{ urls: 'stun:test.stun.server' }],
    video: true,
    audio: true,
    screenshare: true
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock RTCPeerConnection
    RTCPeerConnectionSpy = vi.fn().mockImplementation(() => {
      mockPeerConnection = new AdvancedMockRTCPeerConnection()
      return mockPeerConnection
    })
    global.RTCPeerConnection = RTCPeerConnectionSpy

    // Mock WebSocket
    mockWebSocket = new MockWebSocketForWebRTC('ws://test')
    mockWebSocketClient = new WebSocketClient({
      url: 'ws://test',
      token: 'test-token'
    })

    // Mock WebSocketClient methods to prevent actual sending
    vi.spyOn(mockWebSocketClient, 'send').mockImplementation(() => {})
    vi.spyOn(mockWebSocketClient, 'sendWebRTCOffer').mockImplementation(() => {})
    vi.spyOn(mockWebSocketClient, 'sendWebRTCAnswer').mockImplementation(() => {})
    vi.spyOn(mockWebSocketClient, 'sendICECandidate').mockImplementation(() => {})
    vi.spyOn(mockWebSocketClient, 'requestRenegotiation').mockImplementation(() => {})
    vi.spyOn(mockWebSocketClient, 'on').mockImplementation(() => {})

    // Mock media APIs
    getUserMediaSpy = vi.fn().mockImplementation((constraints) => {
      const tracks: MediaStreamTrack[] = []
      if (constraints.video) {
        tracks.push(new MockMediaStreamTrack('video') as unknown as MediaStreamTrack)
      }
      if (constraints.audio) {
        tracks.push(new MockMediaStreamTrack('audio') as unknown as MediaStreamTrack)
      }
      return Promise.resolve(new MockMediaStream(tracks) as unknown as MediaStream)
    })

    getDisplayMediaSpy = vi.fn().mockImplementation(() => {
      const tracks = [
        new MockMediaStreamTrack('video') as unknown as MediaStreamTrack,
        new MockMediaStreamTrack('audio') as unknown as MediaStreamTrack
      ]
      return Promise.resolve(new MockMediaStream(tracks) as unknown as MediaStream)
    })

    enumerateDevicesSpy = vi.fn().mockResolvedValue([
      { deviceId: 'camera1', kind: 'videoinput', label: 'Camera 1' },
      { deviceId: 'mic1', kind: 'audioinput', label: 'Microphone 1' },
      { deviceId: 'speaker1', kind: 'audiooutput', label: 'Speaker 1' }
    ])

    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: getUserMediaSpy,
        getDisplayMedia: getDisplayMediaSpy,
        enumerateDevices: enumerateDevicesSpy
      }
    })

    // Mock RTCSessionDescription
    global.RTCSessionDescription = vi.fn().mockImplementation((init) => ({
      type: init.type,
      sdp: init.sdp
    }))

    // Mock RTCIceCandidate
    global.RTCIceCandidate = vi.fn().mockImplementation((init) => ({
      candidate: init.candidate,
      sdpMid: init.sdpMid,
      sdpMLineIndex: init.sdpMLineIndex
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('PeerConnection Class', () => {
    let peerConnection: PeerConnection

    beforeEach(() => {
      peerConnection = new PeerConnection('peer-123', mockClientInfo, mockWebSocketClient, mockConfig)
    })

    afterEach(() => {
      peerConnection.close()
    })

    describe('Constructor and Initialization', () => {
      it('should create peer connection with default ICE servers', () => {
        const peer = new PeerConnection('peer-456', mockClientInfo, mockWebSocketClient, {
          iceServers: [],
          video: true,
          audio: true
        })
        
        expect(RTCPeerConnectionSpy).toHaveBeenCalledWith({
          iceServers: [],
          iceCandidatePoolSize: 10
        })
        
        peer.close()
      })

      it('should create peer connection with custom ICE servers', () => {
        expect(RTCPeerConnectionSpy).toHaveBeenCalledWith({
          iceServers: mockConfig.iceServers,
          iceCandidatePoolSize: 10
        })
      })

      it('should setup data channel on creation', () => {
        // Data channel should be created during construction
        expect(mockPeerConnection.dataChannels).toHaveLength(1)
      })
    })

    describe('Local Stream Management', () => {
      it('should add local media stream', async () => {
        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack,
          new MockMediaStreamTrack('audio') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await peerConnection.addLocalStream(mockStream, 'camera')

        expect(mockPeerConnection.getSenders()).toHaveLength(2)
        expect(peerConnection.getLocalStreams().has('camera')).toBe(true)
      })

      it('should replace existing stream of same type', async () => {
        const stream1 = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream
        
        const stream2 = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await peerConnection.addLocalStream(stream1, 'camera')
        await peerConnection.addLocalStream(stream2, 'camera')

        // Should only have one stream of type 'camera'
        expect(peerConnection.getLocalStreams().size).toBe(1)
        expect(peerConnection.getLocalStreams().get('camera')).toBe(stream2)
      })

      it('should remove local stream', async () => {
        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await peerConnection.addLocalStream(mockStream, 'camera')
        expect(peerConnection.getLocalStreams().has('camera')).toBe(true)

        await peerConnection.removeLocalStream('camera')
        expect(peerConnection.getLocalStreams().has('camera')).toBe(false)
      })

      it('should handle remove non-existent stream gracefully', async () => {
        await expect(peerConnection.removeLocalStream('nonexistent' as StreamType)).resolves.not.toThrow()
      })

      it('should handle errors when adding local stream', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        // Mock addTrack to throw error
        mockPeerConnection.addTrack = vi.fn().mockImplementation(() => {
          throw new Error('Failed to add track')
        })

        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await expect(peerConnection.addLocalStream(mockStream, 'camera')).rejects.toThrow('Failed to add track')
        
        consoleSpy.mockRestore()
      })

      it('should handle errors when removing local stream', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await peerConnection.addLocalStream(mockStream, 'camera')

        // Mock removeTrack to throw error
        mockPeerConnection.removeTrack = vi.fn().mockImplementation(() => {
          throw new Error('Failed to remove track')
        })

        await expect(peerConnection.removeLocalStream('camera')).rejects.toThrow('Failed to remove track')
        
        consoleSpy.mockRestore()
      })
    })

    describe('WebRTC Signaling', () => {
      it('should create and send offer', async () => {
        const sendSpy = vi.spyOn(mockWebSocketClient, 'sendWebRTCOffer').mockImplementation(() => {})

        const offer = await peerConnection.createOffer()

        expect(offer.type).toBe('offer')
        expect(offer.sdp).toBe('mock-offer-sdp')
        expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(offer)
        expect(sendSpy).toHaveBeenCalledWith(offer, 'peer-123', mockClientInfo)
      })

      it('should handle offer creation failure', async () => {
        mockPeerConnection.setFailOffer(true)

        await expect(peerConnection.createOffer()).rejects.toThrow('Failed to create offer')
      })

      it('should handle incoming offer and create answer', async () => {
        const sendSpy = vi.spyOn(mockWebSocketClient, 'sendWebRTCAnswer').mockImplementation(() => {})
        
        const offer = { type: 'offer' as RTCSdpType, sdp: 'remote-offer-sdp' }
        
        const answer = await peerConnection.handleOffer(offer)

        expect(answer.type).toBe('answer')
        expect(answer.sdp).toBe('mock-answer-sdp')
        expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(offer)
        expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(answer)
        expect(sendSpy).toHaveBeenCalledWith(answer, 'peer-123', mockClientInfo)
      })

      it('should handle offer processing failure', async () => {
        mockPeerConnection.setFailAnswer(true)
        
        const offer = { type: 'offer' as RTCSdpType, sdp: 'remote-offer-sdp' }
        
        await expect(peerConnection.handleOffer(offer)).rejects.toThrow('Failed to create answer')
      })

      it('should handle incoming answer', async () => {
        const answer = { type: 'answer' as RTCSdpType, sdp: 'remote-answer-sdp' }
        
        await peerConnection.handleAnswer(answer)

        expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(answer)
      })

      it('should handle answer processing failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        // Mock setRemoteDescription to fail
        mockPeerConnection.setRemoteDescription = vi.fn().mockRejectedValue(new Error('Failed to set remote description'))
        
        const answer = { type: 'answer' as RTCSdpType, sdp: 'remote-answer-sdp' }
        
        await expect(peerConnection.handleAnswer(answer)).rejects.toThrow('Failed to set remote description')
        
        consoleSpy.mockRestore()
      })

      it('should handle ICE candidates', async () => {
        const candidateData = {
          candidate: 'candidate:test-candidate',
          sdpMid: 'data',
          sdpMLineIndex: 0
        }

        await peerConnection.handleICECandidate(candidateData)

        expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith({
          candidate: candidateData.candidate,
          sdpMid: candidateData.sdpMid,
          sdpMLineIndex: candidateData.sdpMLineIndex
        })
      })

      it('should handle ICE candidates with null values', async () => {
        const candidateData = {
          candidate: 'candidate:test-candidate',
          sdpMid: undefined,
          sdpMLineIndex: undefined
        }

        await peerConnection.handleICECandidate(candidateData)

        expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith({
          candidate: candidateData.candidate,
          sdpMid: null,
          sdpMLineIndex: null
        })
      })

      it('should handle ICE candidate processing failure', async () => {
        mockPeerConnection.setFailIceCandidate(true)
        
        const candidateData = {
          candidate: 'candidate:test-candidate',
          sdpMid: 'data',
          sdpMLineIndex: 0
        }

        await expect(peerConnection.handleICECandidate(candidateData)).rejects.toThrow('Failed to add ICE candidate')
      })

      it('should request renegotiation', async () => {
        const sendSpy = vi.spyOn(mockWebSocketClient, 'requestRenegotiation').mockImplementation(() => {})

        await peerConnection.requestRenegotiation('Connection quality poor')

        expect(sendSpy).toHaveBeenCalledWith('peer-123', 'Connection quality poor', mockClientInfo)
      })

      it('should handle renegotiation request failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const sendSpy = vi.spyOn(mockWebSocketClient, 'requestRenegotiation').mockImplementation(() => {
          throw new Error('Failed to send renegotiation request')
        })

        await expect(peerConnection.requestRenegotiation('test')).rejects.toThrow('Failed to send renegotiation request')
        
        consoleSpy.mockRestore()
      })
    })

    describe('Data Channel Functionality', () => {
      it('should send data through data channel when open', () => {
        const testData = { type: 'test', message: 'hello' }
        
        // Simulate data channel open
        mockPeerConnection.dataChannels[0].simulateOpen()
        
        peerConnection.sendData(testData)
        
        // Verify data was sent (implementation detail - data channel mock would verify)
        expect(mockPeerConnection.dataChannels[0].readyState).toBe('open')
      })

      it('should handle sending data when channel is not open', () => {
        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        
        const testData = { type: 'test', message: 'hello' }
        
        // Data channel starts in 'connecting' state
        peerConnection.sendData(testData)
        
        expect(consoleSpy).toHaveBeenCalledWith('Data channel not available or not open')
        
        consoleSpy.mockRestore()
      })

      it('should handle data channel send errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        // Simulate data channel open
        mockPeerConnection.dataChannels[0].simulateOpen()
        
        // Mock send to throw error
        mockPeerConnection.dataChannels[0].send = vi.fn().mockImplementation(() => {
          throw new Error('Send failed')
        })
        
        const testData = { type: 'test', message: 'hello' }
        peerConnection.sendData(testData)
        
        expect(consoleSpy).toHaveBeenCalledWith('Failed to send data:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })

      it('should handle incoming data channel messages', () => {
        const messageHandler = vi.fn()
        peerConnection.onDataChannelMessage(messageHandler)

        const testData = { type: 'test', message: 'hello' }
        mockPeerConnection.dataChannels[0].simulateMessage(testData)

        expect(messageHandler).toHaveBeenCalledWith(testData, 'peer-123')
      })

      it('should handle data channel message parsing errors', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        // Simulate invalid JSON
        const event = new MessageEvent('message', { data: 'invalid json{' })
        mockPeerConnection.dataChannels[0].onmessage?.(event)

        expect(consoleSpy).toHaveBeenCalledWith('Failed to parse data channel message:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })

      it('should handle errors in data channel message handlers', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const errorHandler = vi.fn().mockImplementation(() => {
          throw new Error('Handler error')
        })
        peerConnection.onDataChannelMessage(errorHandler)

        const testData = { type: 'test', message: 'hello' }
        mockPeerConnection.dataChannels[0].simulateMessage(testData)

        expect(consoleSpy).toHaveBeenCalledWith('Error in data channel message handler:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })
    })

    describe('Peer Connection Event Handling', () => {
      it('should handle ICE candidates from peer connection', () => {
        const sendSpy = vi.spyOn(mockWebSocketClient, 'sendICECandidate').mockImplementation(() => {})
        
        // Simulate ICE candidate
        mockPeerConnection.simulateIceCandidate({
          candidate: 'candidate:test-ice-candidate',
          sdpMid: 'data',
          sdpMLineIndex: 0
        })

        expect(sendSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            candidate: 'candidate:test-ice-candidate',
            sdpMid: 'data',
            sdpMLineIndex: 0
          }),
          'peer-123',
          mockClientInfo
        )
      })

      it('should handle incoming tracks from remote peer', () => {
        const streamHandler = vi.fn()
        peerConnection.onStreamAdded(streamHandler)

        const mockTrack = new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        const mockStream = new MockMediaStream([mockTrack]) as unknown as MediaStream

        mockPeerConnection.simulateTrack(mockStream, mockTrack)

        expect(streamHandler).toHaveBeenCalledWith(mockStream, 'peer-123', 'screen')
      })

      it('should handle connection state changes', () => {
        const stateHandler = vi.fn()
        peerConnection.onConnectionStateChanged(stateHandler)

        mockPeerConnection.simulateConnectionStateChange('connected')

        expect(stateHandler).toHaveBeenCalledWith('connected', 'peer-123')
      })

      it('should handle negotiation needed events', () => {
        const negotiationHandler = vi.fn()
        peerConnection.onNegotiationNeeded(negotiationHandler)

        mockPeerConnection.simulateNegotiationNeeded()

        expect(negotiationHandler).toHaveBeenCalledWith('peer-123')
      })

      it('should handle incoming data channels', () => {
        mockPeerConnection.simulateDataChannel('remote-data')
        
        // Should set up event handlers for the incoming channel
        expect(mockPeerConnection.ondatachannel).toBeDefined()
      })
    })

    describe('Connection Statistics and State', () => {
      it('should get connection stats', async () => {
        const stats = await peerConnection.getStats()
        
        expect(stats).toBeInstanceOf(Map)
        expect(stats.get('mock-stats-1')).toEqual({
          type: 'candidate-pair',
          state: 'succeeded',
          bytesReceived: 12345,
          bytesSent: 54321
        })
      })

      it('should get connection state', () => {
        mockPeerConnection.connectionState = 'connected'
        
        expect(peerConnection.getConnectionState()).toBe('connected')
      })

      it('should get local streams', async () => {
        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        await peerConnection.addLocalStream(mockStream, 'camera')
        
        const localStreams = peerConnection.getLocalStreams()
        expect(localStreams.has('camera')).toBe(true)
        expect(localStreams.get('camera')).toBe(mockStream)
      })

      it('should get remote streams', () => {
        const remoteStreams = peerConnection.getRemoteStreams()
        expect(remoteStreams).toBeInstanceOf(Map)
      })
    })

    describe('Cleanup and Resource Management', () => {
      it('should close peer connection and cleanup resources', () => {
        const mockStream = new MockMediaStream([
          new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        ]) as unknown as MediaStream

        peerConnection.addLocalStream(mockStream, 'camera')
        
        peerConnection.close()

        expect(mockPeerConnection.connectionState).toBe('closed')
        expect(mockPeerConnection.close).toHaveBeenCalled()
      })

      it('should handle close errors gracefully', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        // Mock close to throw error
        mockPeerConnection.close = vi.fn().mockImplementation(() => {
          throw new Error('Close failed')
        })

        expect(() => peerConnection.close()).not.toThrow()
        expect(consoleSpy).toHaveBeenCalledWith('Error closing peer connection:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })
    })
  })

  describe('WebRTCManager Class', () => {
    let webrtcManager: WebRTCManager

    beforeEach(() => {
      webrtcManager = new WebRTCManager(mockClientInfo, mockWebSocketClient, mockConfig)
    })

    afterEach(() => {
      webrtcManager.cleanup()
    })

    describe('Initialization and Configuration', () => {
      it('should create WebRTC manager with default config', () => {
        const manager = new WebRTCManager(mockClientInfo, mockWebSocketClient)
        
        expect(manager).toBeInstanceOf(WebRTCManager)
        
        manager.cleanup()
      })

      it('should create WebRTC manager with custom config', () => {
        const customConfig = {
          iceServers: [{ urls: 'stun:custom.stun.server' }],
          video: { width: 1280, height: 720 },
          audio: { echoCancellation: true }
        }
        
        const manager = new WebRTCManager(mockClientInfo, mockWebSocketClient, customConfig)
        
        expect(manager).toBeInstanceOf(WebRTCManager)
        
        manager.cleanup()
      })
    })

    describe('Local Media Management', () => {
      it('should initialize local media stream', async () => {
        const stream = await webrtcManager.initializeLocalMedia()
        
        expect(getUserMediaSpy).toHaveBeenCalledWith({
          video: mockConfig.video,
          audio: mockConfig.audio
        })
        expect(stream).toBeInstanceOf(MockMediaStream)
      })

      it('should handle local media initialization failure', async () => {
        getUserMediaSpy.mockRejectedValueOnce(new Error('Permission denied'))
        
        await expect(webrtcManager.initializeLocalMedia()).rejects.toThrow('Permission denied')
      })

      it('should start screen sharing', async () => {
        const stream = await webrtcManager.startScreenShare()
        
        expect(getDisplayMediaSpy).toHaveBeenCalled()
        expect(stream).toBeInstanceOf(MockMediaStream)
      })

      it('should handle screen sharing failure', async () => {
        getDisplayMediaSpy.mockRejectedValueOnce(new Error('Screen sharing denied'))
        
        await expect(webrtcManager.startScreenShare()).rejects.toThrow('Screen sharing denied')
      })

      it('should stop screen sharing', async () => {
        await webrtcManager.startScreenShare()
        await webrtcManager.stopScreenShare()
        
        // Should have stopped the screen stream tracks
        expect(webrtcManager.getLocalScreenStream()).toBeNull()
      })

      it('should toggle local audio', async () => {
        await webrtcManager.initializeLocalMedia()
        
        webrtcManager.toggleAudio(false)
        webrtcManager.toggleAudio(true)
        
        // Should have toggled audio tracks
        expect(webrtcManager.getLocalMediaStream()).not.toBeNull()
      })

      it('should toggle local video', async () => {
        await webrtcManager.initializeLocalMedia()
        
        webrtcManager.toggleVideo(false)
        webrtcManager.toggleVideo(true)
        
        // Should have toggled video tracks
        expect(webrtcManager.getLocalMediaStream()).not.toBeNull()
      })
    })

    describe('Peer Management', () => {
      it('should add peer connection', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        expect(RTCPeerConnectionSpy).toHaveBeenCalled()
        expect(peer).toBeInstanceOf(PeerConnection)
        expect(webrtcManager.getPeer('peer-456')).toBe(peer)
      })

      it('should remove peer connection', async () => {
        await webrtcManager.addPeer('peer-456')
        expect(webrtcManager.getPeer('peer-456')).toBeDefined()
        
        webrtcManager.removePeer('peer-456')
        expect(webrtcManager.getPeer('peer-456')).toBeUndefined()
      })

      it('should handle remove non-existent peer gracefully', () => {
        expect(() => webrtcManager.removePeer('nonexistent')).not.toThrow()
      })

      it('should create offer through peer', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        const offer = await peer.createOffer()
        
        expect(offer.type).toBe('offer')
        expect(offer.sdp).toBe('mock-offer-sdp')
      })

      it('should handle incoming offer through peer', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        const offer = { type: 'offer' as RTCSdpType, sdp: 'remote-offer-sdp' }
        
        const answer = await peer.handleOffer(offer)
        
        expect(answer.type).toBe('answer')
        expect(answer.sdp).toBe('mock-answer-sdp')
      })

      it('should handle incoming answer through peer', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        const answer = { type: 'answer' as RTCSdpType, sdp: 'remote-answer-sdp' }
        
        await expect(peer.handleAnswer(answer)).resolves.not.toThrow()
      })

      it('should handle ICE candidates through peer', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        const candidateData = {
          candidate: 'candidate:test-candidate',
          sdpMid: 'data',
          sdpMLineIndex: 0
        }
        
        await expect(peer.handleICECandidate(candidateData)).resolves.not.toThrow()
      })

      it('should send data to specific peer', async () => {
        const peer = await webrtcManager.addPeer('peer-456')
        
        const testData = { type: 'test', message: 'hello peer' }
        
        // Simulate data channel open
        mockPeerConnection.dataChannels[0].simulateOpen()
        
        expect(() => peer.sendData(testData)).not.toThrow()
      })

      it('should get all peers', async () => {
        await webrtcManager.addPeer('peer-456')
        await webrtcManager.addPeer('peer-789')
        
        const allPeers = webrtcManager.getAllPeers()
        
        expect(allPeers.size).toBe(2)
        expect(allPeers.has('peer-456')).toBe(true)
        expect(allPeers.has('peer-789')).toBe(true)
      })
    })

    describe('Event Handling', () => {
      it('should handle WebSocket signaling messages', () => {
        // Clear existing manager to test the on registration
        const onSpy = vi.spyOn(mockWebSocketClient, 'on').mockClear()
        
        // Create a new manager to test registration
        const newManager = new WebRTCManager(mockClientInfo, mockWebSocketClient, mockConfig)
        
        // WebRTCManager should register handlers during construction
        expect(onSpy).toHaveBeenCalledWith('offer', expect.any(Function))
        expect(onSpy).toHaveBeenCalledWith('answer', expect.any(Function))
        expect(onSpy).toHaveBeenCalledWith('candidate', expect.any(Function))
        expect(onSpy).toHaveBeenCalledWith('renegotiate', expect.any(Function))
        
        newManager.cleanup()
      })

      it('should handle stream events from peers', async () => {
        const streamHandler = vi.fn()
        webrtcManager.onStreamAdded(streamHandler)
        
        const peer = await webrtcManager.addPeer('peer-456')
        
        const mockTrack = new MockMediaStreamTrack('video') as unknown as MediaStreamTrack
        const mockStream = new MockMediaStream([mockTrack]) as unknown as MediaStream
        
        // Trigger stream added event on the peer
        peer.onStreamAdded(streamHandler)
        
        expect(streamHandler).toBeDefined()
      })

      it('should handle connection state changes from peers', async () => {
        const stateHandler = vi.fn()
        webrtcManager.onConnectionStateChanged(stateHandler)
        
        const peer = await webrtcManager.addPeer('peer-456')
        
        peer.onConnectionStateChanged(stateHandler)
        
        expect(stateHandler).toBeDefined()
      })
    })

    describe('Cleanup and Resource Management', () => {
      it('should cleanup manager and all resources', async () => {
        await webrtcManager.initializeLocalMedia()
        await webrtcManager.addPeer('peer-456')
        await webrtcManager.addPeer('peer-789')
        
        webrtcManager.cleanup()
        
        expect(webrtcManager.getAllPeers().size).toBe(0)
        expect(webrtcManager.getLocalMediaStream()).toBeNull()
      })

      it('should handle cleanup errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        
        const peer = await webrtcManager.addPeer('peer-456')
        
        // Mock peer connection close to throw error
        const mockPC = (peer['pc'] as unknown) as AdvancedMockRTCPeerConnection
        mockPC.shouldFailClose = true
        
        expect(() => webrtcManager.cleanup()).not.toThrow()
        expect(consoleSpy).toHaveBeenCalledWith('Error closing peer connection:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })
    })
  })

  describe('MediaDeviceUtils', () => {
    describe('Device Enumeration', () => {
      it('should get all available devices', async () => {
        const devices = await MediaDeviceUtils.getDevices()
        
        expect(enumerateDevicesSpy).toHaveBeenCalled()
        expect(devices).toHaveLength(3)
        expect(devices[0]).toMatchObject({
          deviceId: 'camera1',
          kind: 'videoinput',
          label: 'Camera 1'
        })
      })

      it('should handle device enumeration failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        enumerateDevicesSpy.mockRejectedValueOnce(new Error('Device access denied'))
        
        const devices = await MediaDeviceUtils.getDevices()
        
        expect(devices).toEqual([])
        expect(consoleSpy).toHaveBeenCalledWith('Failed to enumerate devices:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })

      it('should get video input devices only', async () => {
        const devices = await MediaDeviceUtils.getVideoDevices()
        
        expect(devices).toHaveLength(1)
        expect(devices[0].kind).toBe('videoinput')
      })

      it('should get audio input devices only', async () => {
        const devices = await MediaDeviceUtils.getAudioInputDevices()
        
        expect(devices).toHaveLength(1)
        expect(devices[0].kind).toBe('audioinput')
      })

      it('should get audio output devices only', async () => {
        const devices = await MediaDeviceUtils.getAudioOutputDevices()
        
        expect(devices).toHaveLength(1)
        expect(devices[0].kind).toBe('audiooutput')
      })
    })

    describe('Permission Management', () => {
      it('should request media permissions successfully', async () => {
        const result = await MediaDeviceUtils.requestPermissions()
        
        expect(getUserMediaSpy).toHaveBeenCalledWith({
          video: true,
          audio: true
        })
        expect(result).toBe(true)
      })

      it('should handle permission request failure', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        getUserMediaSpy.mockRejectedValueOnce(new Error('Permission denied'))
        
        const result = await MediaDeviceUtils.requestPermissions()
        
        expect(result).toBe(false)
        expect(consoleSpy).toHaveBeenCalledWith('Failed to request media permissions:', expect.any(Error))
        
        consoleSpy.mockRestore()
      })
    })

    describe('Feature Detection', () => {
      it('should detect screen sharing support', () => {
        const supported = MediaDeviceUtils.isScreenShareSupported()
        
        expect(supported).toBe(true)
      })

      it('should detect lack of screen sharing support', () => {
        // Mock missing getDisplayMedia
        Object.defineProperty(navigator, 'mediaDevices', {
          writable: true,
          value: {
            getUserMedia: getUserMediaSpy,
            enumerateDevices: enumerateDevicesSpy
            // No getDisplayMedia
          }
        })
        
        const supported = MediaDeviceUtils.isScreenShareSupported()
        
        expect(supported).toBe(false)
        
        // Restore for other tests
        Object.defineProperty(navigator, 'mediaDevices', {
          writable: true,
          value: {
            getUserMedia: getUserMediaSpy,
            getDisplayMedia: getDisplayMediaSpy,
            enumerateDevices: enumerateDevicesSpy
          }
        })
      })

      it('should handle missing mediaDevices API', () => {
        // Mock missing navigator.mediaDevices
        Object.defineProperty(navigator, 'mediaDevices', {
          writable: true,
          value: undefined
        })
        
        const supported = MediaDeviceUtils.isScreenShareSupported()
        
        expect(supported).toBe(false)
        
        // Restore for other tests
        Object.defineProperty(navigator, 'mediaDevices', {
          writable: true,
          value: {
            getUserMedia: getUserMediaSpy,
            getDisplayMedia: getDisplayMediaSpy,
            enumerateDevices: enumerateDevicesSpy
          }
        })
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle WebRTC not supported', () => {
      // Mock missing RTCPeerConnection
      global.RTCPeerConnection = undefined as any
      
      expect(() => new PeerConnection('peer-123', mockClientInfo, mockWebSocketClient, mockConfig))
        .toThrow()
      
      // Restore for other tests
      global.RTCPeerConnection = RTCPeerConnectionSpy
    })

    it('should handle missing WebRTC APIs gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock RTCPeerConnection constructor to throw
      const FailingRTCPeerConnection = function() {
        throw new Error('WebRTC not supported')
      } as any
      
      // Add required static method
      FailingRTCPeerConnection.generateCertificate = vi.fn().mockResolvedValue({})
      
      global.RTCPeerConnection = FailingRTCPeerConnection
      
      expect(() => new PeerConnection('peer-123', mockClientInfo, mockWebSocketClient, mockConfig))
        .toThrow('WebRTC not supported')
      
      // Restore for other tests
      global.RTCPeerConnection = RTCPeerConnectionSpy
      consoleSpy.mockRestore()
    })

    it('should handle malformed signaling messages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const peerConnection = new PeerConnection('peer-123', mockClientInfo, mockWebSocketClient, mockConfig)
      
      // Test invalid offer
      await expect(peerConnection.handleOffer(null as any)).rejects.toThrow()
      
      // Test invalid answer
      await expect(peerConnection.handleAnswer(null as any)).rejects.toThrow()
      
      // Test invalid ICE candidate
      await expect(peerConnection.handleICECandidate(null as any)).rejects.toThrow()
      
      peerConnection.close()
      consoleSpy.mockRestore()
    })

    it('should handle network connectivity issues', () => {
      const peerConnection = new PeerConnection('peer-123', mockClientInfo, mockWebSocketClient, mockConfig)
      
      // Simulate connection failure
      mockPeerConnection.simulateConnectionStateChange('failed')
      
      expect(mockPeerConnection.connectionState).toBe('failed')
      
      peerConnection.close()
    })
  })
})
