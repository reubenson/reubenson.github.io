
 * - Architecture
    - Listening
        - Initialize web audio access to microphone
        - Process audio to distill it into a stream of abstracted real-time measurements
            - Determine rate of reducing final to bins (probably between 100 - 1000ms)
            - Research libraries for signal pattern recognition?
            - Apply FFT to search for a mathematical match to a recording of frog
            - Determine level of match with frog. Detect, also, density of frog sounds
    - Sounding
        - Take stream of abstracted audio, and use as input into an integratosr
        - Integrator will use density of frog to influence frequency of sounding
        - Unless there is detectable noise absent of frog sounds, there should be a baseline frequency of soundings

