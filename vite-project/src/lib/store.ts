import _ from 'lodash';
import { writable } from 'svelte/store';
// import { asyncable } from 'svelte-asyncable';
import { AudioConfig } from './AudioManager';
import { Frog } from './Frog';

export const frogsCount = 2;
export const AUDIO_SRC_DIRECTORY = 'https://reubenson.com/frog/audio';
export const AUDIO_FILES = ['Aneides_lugubris90.mp3', 'Anaxyrus_punctatus2.mp3'];
export const audio = new AudioConfig();
export const audioFile = `${AUDIO_SRC_DIRECTORY}/${AUDIO_FILES[0]}`;
export const hasStarted = writable(false);
export const FFT_SIZE = 512;
export const DEBUG_ON = writable(true);
export const FROGS = writable([]);
export const PRINT_LOGS = writable(true);
export const inputSamplingInterval = 50; // time (ms) between FFT analysis events
export let inputSourceNode;

export const handleStart = () => {
  return audio.start().then(() => {
    inputSourceNode = audio.input;
    console.log('input source node', inputSourceNode);
    hasStarted.set(true);
    console.log('start handler');

    _.times(frogsCount, i => {
      const frog = new Frog(audio, audioFile);

      frog.initialize().then(() => {
        FROGS.update(val => [...val, frog]);
        setInterval(() => {
          frog.updateState();

          // update UI props
          FROGS.update(state => {
            state[i].amplitude = frog.amplitude;
            state[i].eagerness = frog.eagerness;
            state[i].shyness = frog.eagerness;
            state[i].inputFFT = frog.inputFFT;
            return state;
          });
        }, inputSamplingInterval);
      });
    });
  });
};
