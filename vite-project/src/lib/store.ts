import _ from 'lodash';
import { writable } from 'svelte/store';
import { AudioConfig } from './AudioManager';
import { Frog } from './Frog';

export const frogsCount = 1;
export const AUDIO_SRC_DIRECTORY = 'https://reubenson.com/frog/audio';
export const AUDIO_FILES = ['Aneides_lugubris90.mp3', 'Anaxyrus_punctatus2.mp3'];
export const audio = new AudioConfig();
export const audioFile = `${AUDIO_SRC_DIRECTORY}/${AUDIO_FILES[0]}`;
export const hasStarted = writable(false);
export const FFT_SIZE = 512;
export const DEBUG_ON = writable(true);
export const FROGS = writable([]);
export const PRINT_LOGS = writable(true);
export const inputSamplingInterval = 100; // time (ms) between FFT analysis events
export let inputSourceNode;

function handleUpdate(frog) {
  FROGS.update(val => [...val, frog]);
  setInterval(() => {
    frog.updateState();

    // update UI props
    // todo: more performant to selectively update props?
    FROGS.update(state => state);
  }, inputSamplingInterval);
}

export const handleStart = () => {
  return audio.start().then(() => {
    inputSourceNode = audio.input;
    hasStarted.set(true);

    _.times(frogsCount, () => {
      const frog = new Frog(audio, audioFile);

      frog.initialize().then(() => {
        handleUpdate(frog);
      });
    });
  });
};
