(function() {
    /* Sound Engine using Web Audio API */

    class SoundEngineClass {
        constructor() {
            this.audioCtx = null;
            this.melodyIndex = 0;
            this.sounds = [
                { name: 'Keyboard', icon: '⌨️', params: { type: 'triangle', freq: 800, vol: 0.04, len: 0.1, random: 200 } },
                { name: 'Calm', icon: '☀️', params: { type: 'sine', freq: 600, vol: 0.05, len: 0.15, random: 100 } },
                { name: 'Water', icon: '💧', params: { type: 'sine', freq: 1200, vol: 0.03, len: 0.05, random: 300 } },
                { name: 'Laser', icon: '⚡', params: { type: 'square', freq: 1000, vol: 0.02, len: 0.08, random: 100 } },
                { name: 'Bubble', icon: '🧼', params: { type: 'sine', freq: 400, vol: 0.06, len: 0.1, random: 50 } },
                { name: 'Wind', icon: '💨', params: { type: 'sine', freq: 200, vol: 0.04, len: 0.2, random: 100 } },
                { name: 'Bird', icon: '🐦', params: { type: 'sine', freq: 1500, vol: 0.03, len: 0.07, random: 500 } },
                { name: 'Synth', icon: '🎶', params: { type: 'sawtooth', freq: 500, vol: 0.03, len: 0.12, random: 150 } },
                { name: 'Bell', icon: '🔔', params: { type: 'sine', freq: 2000, vol: 0.04, len: 0.1, random: 200 } },
                { name: 'Pirate', icon: '🏴‍☠️', params: { type: 'square', vol: 0.03, len: 0.15, melody: [587, 698, 783, 783, 880, 987, 987, 1046, 987, 783, 698, 783] } },
            ];
        }

        init() {
            try {
                this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser.");
            }
        }

        resumeContext() {
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
        }

        playTypingSound(soundName) {
            this.resumeContext();
            if (!this.audioCtx) return;

            const sound = this.sounds.find(s => s.name === soundName);
            if (!sound) return;

            let freq;
            if (sound.params.melody) {
                freq = sound.params.melody[this.melodyIndex % sound.params.melody.length];
                this.melodyIndex++;
            } else {
                freq = sound.params.freq + (Math.random() - 0.5) * (sound.params.random || 0);
            }

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = sound.params.type;
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            
            gain.gain.setValueAtTime(sound.params.vol, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + sound.params.len);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(this.audioCtx.currentTime);
            osc.stop(this.audioCtx.currentTime + sound.params.len);
        }

        playSuccessSound() {
            this.resumeContext();
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, this.audioCtx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, this.audioCtx.currentTime + 0.15); // C6
            
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(this.audioCtx.currentTime);
            osc.stop(this.audioCtx.currentTime + 0.3);
        }

        playRankUpSound() {
            this.resumeContext();
            if (!this.audioCtx) return;

            const now = this.audioCtx.currentTime;
            const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98]; // Triumphant arpeggio
            const gain = this.audioCtx.createGain();
            gain.connect(this.audioCtx.destination);
            gain.gain.setValueAtTime(0, now);

            freqs.forEach((freq, i) => {
                const osc = this.audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + i * 0.06);
                
                gain.gain.linearRampToValueAtTime(0.12, now + i * 0.06 + 0.01);
                gain.gain.linearRampToValueAtTime(0, now + i * 0.06 + 0.06);

                osc.connect(gain);
                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.06);
            });
        }

        playVictoryChime() {
            this.resumeContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.08, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.00001, now + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.3);
            });
        }

        playDefeatChime() {
            this.resumeContext();
            if (!this.audioCtx) return;
            const now = this.audioCtx.currentTime;
            const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
            notes.forEach((freq, idx) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.15);
                gain.gain.setValueAtTime(0.08, now + idx * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.00001, now + idx * 0.15 + 0.4);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now + idx * 0.15);
                osc.stop(now + idx * 0.15 + 0.4);
            });
        }

        playTapSound() {
            this.resumeContext();
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1000, this.audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.02, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.04);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(this.audioCtx.currentTime);
            osc.stop(this.audioCtx.currentTime + 0.04);
        }
    }

    window.SoundEngine = new SoundEngineClass();
})();
