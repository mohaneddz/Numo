import { describe, expect, it } from 'vitest';
import { SYSTEM_DEFAULT, inputConstraints, toDeviceOptions } from './audioDevices';

function device(overrides: Partial<MediaDeviceInfo>): MediaDeviceInfo {
  return {
    deviceId: 'abc',
    kind: 'audioinput',
    label: 'Built-in Microphone',
    groupId: 'g1',
    toJSON: () => ({}),
    ...overrides,
  } as MediaDeviceInfo;
}

describe('toDeviceOptions', () => {
  it('always offers the system default first', () => {
    const options = toDeviceOptions([], 'audioinput');
    expect(options[0]).toEqual({ deviceId: SYSTEM_DEFAULT, label: 'System default' });
  });

  it('lists the devices the system actually reports', () => {
    const options = toDeviceOptions(
      [device({ deviceId: 'mic-1', label: 'Headset Microphone' })],
      'audioinput',
    );
    expect(options.map((option) => option.label)).toContain('Headset Microphone');
  });

  it('keeps inputs and outputs apart', () => {
    const devices = [
      device({ deviceId: 'mic-1', label: 'Mic' }),
      device({ deviceId: 'out-1', kind: 'audiooutput', label: 'Speakers' }),
    ];
    expect(toDeviceOptions(devices, 'audioinput').map((o) => o.label)).not.toContain('Speakers');
    expect(toDeviceOptions(devices, 'audiooutput').map((o) => o.label)).not.toContain('Mic');
  });

  it('numbers a device whose label is hidden until permission is granted', () => {
    const options = toDeviceOptions([device({ deviceId: 'mic-1', label: '' })], 'audioinput');
    expect(options[1].label).toBe('Microphone 1');
  });

  it('does not list the default device twice', () => {
    const options = toDeviceOptions(
      [device({ deviceId: SYSTEM_DEFAULT, label: 'Default' })],
      'audioinput',
    );
    expect(options).toHaveLength(1);
  });

  it('skips a device with no id to select it by', () => {
    const options = toDeviceOptions([device({ deviceId: '', label: 'Ghost' })], 'audioinput');
    expect(options).toHaveLength(1);
  });
});

describe('inputConstraints', () => {
  it('asks for plain audio when no device is chosen', () => {
    expect(inputConstraints(SYSTEM_DEFAULT)).toEqual({ audio: true });
    expect(inputConstraints('')).toEqual({ audio: true });
  });

  it('requests the chosen microphone', () => {
    expect(inputConstraints('mic-1')).toEqual({ audio: { deviceId: { ideal: 'mic-1' } } });
  });

  it('asks for the device as preferred, not required', () => {
    // A remembered microphone that has since been unplugged must fall back to
    // the default rather than failing to record at all.
    const constraints = inputConstraints('mic-1') as { audio: { deviceId: Record<string, string> } };
    expect(constraints.audio.deviceId.exact).toBeUndefined();
    expect(constraints.audio.deviceId.ideal).toBe('mic-1');
  });
});
