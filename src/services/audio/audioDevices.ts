/**
 * Real audio device selection.
 *
 * Settings offered an "Input Device" select with the options
 * `['Default Microphone', 'External Mic']` and an "Audio Output" select with
 * `['Default Speakers', 'Headphones']` — invented names that matched no actual
 * hardware, wired to nothing. On a machine with a headset plugged in, neither
 * the list nor the choice meant anything.
 *
 * These enumerate what the system actually reports and remember the choice, so
 * recording and playback can use it.
 */

const INPUT_KEY = 'numo.audio.inputDeviceId';
const OUTPUT_KEY = 'numo.audio.outputDeviceId';

/** The value meaning "whatever the system default is". */
export const SYSTEM_DEFAULT = 'default';

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
}

function readStored(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? SYSTEM_DEFAULT;
  } catch {
    return SYSTEM_DEFAULT;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // A device preference is not worth failing over.
  }
}

export function preferredInputDeviceId(): string {
  return readStored(INPUT_KEY);
}

export function preferredOutputDeviceId(): string {
  return readStored(OUTPUT_KEY);
}

export function setPreferredInputDeviceId(deviceId: string): void {
  writeStored(INPUT_KEY, deviceId);
}

export function setPreferredOutputDeviceId(deviceId: string): void {
  writeStored(OUTPUT_KEY, deviceId);
}

/**
 * Turns the browser's device list into options for a picker.
 *
 * Labels are empty until microphone permission has been granted, so an unnamed
 * device is numbered rather than shown as a blank row.
 */
export function toDeviceOptions(
  devices: readonly MediaDeviceInfo[],
  kind: MediaDeviceKind,
): AudioDeviceOption[] {
  const matching = devices.filter((device) => device.kind === kind);
  const options: AudioDeviceOption[] = [
    { deviceId: SYSTEM_DEFAULT, label: 'System default' },
  ];

  matching.forEach((device, index) => {
    if (device.deviceId === SYSTEM_DEFAULT || !device.deviceId) return;
    options.push({
      deviceId: device.deviceId,
      label: device.label?.trim() || `${kind === 'audioinput' ? 'Microphone' : 'Output'} ${index + 1}`,
    });
  });

  return options;
}

async function listDevices(kind: MediaDeviceKind): Promise<AudioDeviceOption[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [{ deviceId: SYSTEM_DEFAULT, label: 'System default' }];
  }
  try {
    return toDeviceOptions(await navigator.mediaDevices.enumerateDevices(), kind);
  } catch {
    return [{ deviceId: SYSTEM_DEFAULT, label: 'System default' }];
  }
}

export function listInputDevices(): Promise<AudioDeviceOption[]> {
  return listDevices('audioinput');
}

export function listOutputDevices(): Promise<AudioDeviceOption[]> {
  return listDevices('audiooutput');
}

/**
 * Constraints for `getUserMedia` honouring the chosen microphone.
 *
 * `ideal` rather than `exact` on purpose: a remembered device that has since
 * been unplugged should fall back to the default rather than failing to record
 * at all.
 */
export function inputConstraints(deviceId = preferredInputDeviceId()): MediaStreamConstraints {
  if (!deviceId || deviceId === SYSTEM_DEFAULT) return { audio: true };
  return { audio: { deviceId: { ideal: deviceId } } };
}

/**
 * Routes an audio element to the chosen output, where the platform allows it.
 *
 * `setSinkId` is not universally available, and selecting a removed device
 * rejects; either way playback should continue on the default rather than stop.
 */
export async function applyPreferredOutput(
  element: HTMLAudioElement,
  deviceId = preferredOutputDeviceId(),
): Promise<void> {
  if (!deviceId || deviceId === SYSTEM_DEFAULT) return;
  // Declared by the DOM lib but genuinely absent on some webviews.
  const setSinkId = (element as { setSinkId?: (id: string) => Promise<void> }).setSinkId;
  if (typeof setSinkId !== 'function') return;
  try {
    await setSinkId.call(element, deviceId);
  } catch {
    // Keep playing on the default output.
  }
}
