class AudioController {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private initialized: boolean = false;

    constructor() {
        // Lazy init
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Prevent clipping
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.error('AudioContext not supported');
        }
    }

    playJump() {
        if (!this.ctx || !this.masterGain) {
            this.init();
            if (!this.ctx || !this.masterGain) return;
        }
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playLand() {
        if (!this.ctx || !this.masterGain) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.15);
    }

    playPerfect() {
        if (!this.ctx || !this.masterGain) return;

        const now = this.ctx.currentTime;
        // C Major Arpeggio: C5, E5, G5, C6
        const notes = [523.25, 659.25, 783.99, 1046.50];
        
        notes.forEach((freq, i) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            
            osc.type = 'square';
            osc.frequency.value = freq;
            
            const startTime = now + (i * 0.05);
            
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

            osc.connect(gain);
            gain.connect(this.masterGain!);

            osc.start(startTime);
            osc.stop(startTime + 0.4);
        });
    }

    playShatter() {
         if (!this.ctx || !this.masterGain) return;
         
         // White noise burst
         const bufferSize = this.ctx.sampleRate * 0.5;
         const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
         const data = buffer.getChannelData(0);
         
         for (let i = 0; i < bufferSize; i++) {
             data[i] = Math.random() * 2 - 1;
         }

         const noise = this.ctx.createBufferSource();
         noise.buffer = buffer;
         
         const gain = this.ctx.createGain();
         gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
         gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
         
         noise.connect(gain);
         gain.connect(this.masterGain);
         noise.start();
    }
}

export const audioController = new AudioController();
