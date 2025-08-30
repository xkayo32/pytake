// Sound Generator for PyTake Notifications
// Creates programmatic notification sounds using Web Audio API

export class SoundGenerator {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, AudioBuffer> = new Map()

  constructor() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext()
    }
  }

  // Create different notification sounds
  async generateSounds() {
    if (!this.audioContext) return

    try {
      // Message received sound - pleasant ding
      const messageSound = this.createMessageSound()
      this.sounds.set('message', messageSound)

      // Assignment sound - two tone chime
      const assignmentSound = this.createAssignmentSound()
      this.sounds.set('assignment', assignmentSound)

      // Priority sound - urgent beep pattern
      const prioritySound = this.createPrioritySound()
      this.sounds.set('priority', prioritySound)

      // Alert sound - attention grabbing
      const alertSound = this.createAlertSound()
      this.sounds.set('alert', alertSound)

      // Connection sound - subtle notification
      const connectionSound = this.createConnectionSound()
      this.sounds.set('connection', connectionSound)

    } catch (error) {
      console.error('Error generating sounds:', error)
    }
  }

  // Play a specific sound
  async playSound(type: string, volume: number = 0.7): Promise<void> {
    if (!this.audioContext || !this.sounds.has(type)) return

    try {
      // Resume audio context if suspended (required for some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const buffer = this.sounds.get(type)!
      const source = this.audioContext.createBufferSource()
      const gainNode = this.audioContext.createGain()

      source.buffer = buffer
      gainNode.gain.value = Math.max(0, Math.min(1, volume))

      source.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      source.start()
    } catch (error) {
      console.error('Error playing sound:', error)
    }
  }

  // Create message received sound - pleasant notification
  private createMessageSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate
    const duration = 0.3
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      const frequency = 800 + (200 * Math.sin(time * 10)) // Gentle frequency modulation
      const envelope = Math.exp(-time * 3) // Exponential decay
      
      channelData[i] = envelope * Math.sin(2 * Math.PI * frequency * time) * 0.3
    }

    return buffer
  }

  // Create assignment sound - two tone chime
  private createAssignmentSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate
    const duration = 0.6
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      let sample = 0

      // First tone (0-0.3s)
      if (time < 0.3) {
        const envelope = Math.exp(-time * 2)
        sample = envelope * Math.sin(2 * Math.PI * 600 * time) * 0.4
      }
      // Second tone (0.3-0.6s)
      else {
        const adjustedTime = time - 0.3
        const envelope = Math.exp(-adjustedTime * 2)
        sample = envelope * Math.sin(2 * Math.PI * 800 * adjustedTime) * 0.4
      }

      channelData[i] = sample
    }

    return buffer
  }

  // Create priority sound - urgent pattern
  private createPrioritySound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate
    const duration = 1.0
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      let sample = 0

      // Create urgent beeping pattern
      const beepPattern = Math.floor(time * 6) % 2 // 6 beeps per second
      if (beepPattern === 0 && (time % (1/6)) < 0.1) {
        const beepTime = time % (1/6)
        const envelope = Math.exp(-beepTime * 20)
        sample = envelope * Math.sin(2 * Math.PI * 1000 * beepTime) * 0.5
      }

      channelData[i] = sample
    }

    return buffer
  }

  // Create alert sound - attention grabbing
  private createAlertSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate
    const duration = 0.8
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      
      // Siren-like sweep
      const frequency = 400 + (400 * Math.sin(time * 8))
      const envelope = Math.sin(time * Math.PI / duration) // Bell curve envelope
      
      channelData[i] = envelope * Math.sin(2 * Math.PI * frequency * time) * 0.4
    }

    return buffer
  }

  // Create connection sound - subtle notification
  private createConnectionSound(): AudioBuffer {
    const sampleRate = this.audioContext!.sampleRate
    const duration = 0.2
    const buffer = this.audioContext!.createBuffer(1, sampleRate * duration, sampleRate)
    const channelData = buffer.getChannelData(0)

    for (let i = 0; i < buffer.length; i++) {
      const time = i / sampleRate
      const envelope = Math.exp(-time * 5)
      
      // Soft click sound
      channelData[i] = envelope * Math.sin(2 * Math.PI * 400 * time) * 0.2
    }

    return buffer
  }

  // Create sound files and save to public/sounds (for development)
  async saveSoundsAsFiles() {
    if (!this.audioContext) return

    try {
      await this.generateSounds()
      
      // Create WAV files from audio buffers
      for (const [name, buffer] of this.sounds) {
        const wavBlob = this.audioBufferToWav(buffer)
        const url = URL.createObjectURL(wavBlob)
        
        // In development, you can download these files
        const a = document.createElement('a')
        a.href = url
        a.download = `${name}.wav`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error saving sound files:', error)
    }
  }

  // Convert AudioBuffer to WAV format
  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length
    const arrayBuffer = new ArrayBuffer(44 + length * 2)
    const view = new DataView(arrayBuffer)
    const channelData = buffer.getChannelData(0)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * 2, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(36, 'data')
    view.setUint32(40, length * 2, true)

    // PCM data
    let offset = 44
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]))
      view.setInt16(offset, sample * 0x7FFF, true)
      offset += 2
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
  }
}

// Singleton instance
export const soundGenerator = new SoundGenerator()