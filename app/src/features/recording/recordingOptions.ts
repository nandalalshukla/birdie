import { AudioQuality, IOSOutputFormat, type RecordingOptions } from 'expo-audio';

/**
 * Mono AAC at 48 kHz — BirdNET's native sample rate — so the server rarely has
 * to resample. Metering powers the live level meter.
 */
export const BIRD_RECORDING_OPTIONS: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 48000,
  numberOfChannels: 1,
  bitRate: 128000,
  isMeteringEnabled: true,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};
