/**
 * Prosody Visualizer - Real-time amplitude waveform visualization
 * Displays dual waveforms: coach "ghost" line and user's live input
 */

export class ProsodyVisualizer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.isActive = false;
        this.isSetup = false;

        // Waveform data buffers (circular buffers)
        this.bufferSize = 200; // Number of data points to display
        this.ghostData = new Float32Array(this.bufferSize);      // Amplitude
        this.ghostPitch = new Float32Array(this.bufferSize);     // Pitch (Hz)
        this.userdata = new Float32Array(this.bufferSize);       // Amplitude
        this.userPitch = new Float32Array(this.bufferSize);      // Pitch (Hz)
        this.ghostIndex = 0;
        this.userIndex = 0;

        // User wave horizontal offset and scale (for manual alignment)
        this.userOffset = 0; // Data points to shift user wave
        this.userScale = 1.0; // Horizontal stretch factor (1.0 = normal)

        // Recording state for ghost line
        this.isRecordingGhost = false;
        this.ghostRecording = [];        // Amplitude recording
        this.ghostPitchRecording = [];   // Pitch recording

        // Colors
        // Colors
        this.ghostColor = 'rgba(165, 166, 246, 0.5)'; // Soft purple
        this.userColor = '#58CC02'; // Duolingo Green
        this.backgroundColor = 'transparent';

        // Animation
        this.animationId = null;

        // Drag state for shifting user waveform
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartOffset = 0;

        // Setup resize listener
        window.addEventListener('resize', () => this.setupCanvas());

        // Setup drag-to-shift on canvas
        this.canvas.style.cursor = 'grab';
        this.canvas.addEventListener('mousedown', (e) => this.onDragStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.onDragMove(e));
        this.canvas.addEventListener('mouseup', () => this.onDragEnd());
        this.canvas.addEventListener('mouseleave', () => this.onDragEnd());
        // Touch support
        this.canvas.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0]));
        this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.onDragMove(e.touches[0]); });
        this.canvas.addEventListener('touchend', () => this.onDragEnd());

        // Scroll wheel for scaling/stretching (zoom around cursor position)
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const scaleDelta = e.deltaY > 0 ? 0.95 : 1.05; // Scroll down = shrink, up = stretch
            const newScale = Math.max(0.5, Math.min(3.0, this.userScale * scaleDelta));

            // Get cursor position relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const cursorX = e.clientX - rect.left;
            const step = rect.width / this.bufferSize;

            // Find the data point under cursor in current view
            // x = (i * scale + offset) * step, solve for i
            const dataPointUnderCursor = (cursorX / step - this.userOffset) / this.userScale;

            // After scaling, adjust offset so same data point is still under cursor
            const newOffset = cursorX / step - dataPointUnderCursor * newScale;

            this.userScale = newScale;
            this.userOffset = newOffset;
            this.draw();
        });
    }

    onDragStart(e) {
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartOffset = this.userOffset;
        this.canvas.style.cursor = 'grabbing';
    }

    onDragMove(e) {
        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStartX;
        const step = this.canvas.width / (window.devicePixelRatio || 1) / this.bufferSize;
        const offsetChange = dx / step;
        this.userOffset = this.dragStartOffset + offsetChange;
        // Redraw immediately (animation may be stopped)
        this.draw();
    }

    onDragEnd() {
        this.isDragging = false;
        this.canvas.style.cursor = 'grab';
    }

    setupCanvas() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        // Skip if container has no dimensions yet
        if (rect.width === 0) return;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = 140 * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = '140px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.scale(dpr, dpr);
        this.isSetup = true;
    }

    /**
     * Start recording the ghost line from coach audio
     */
    startGhostRecording() {
        this.isRecordingGhost = true;
        this.ghostRecording = [];
        this.ghostData.fill(0);
        this.ghostIndex = 0;
    }

    /**
     * Stop recording ghost line and prepare for playback
     */
    stopGhostRecording() {
        this.isRecordingGhost = false;
        // Normalize ghost data to buffer (amplitude and pitch)
        if (this.ghostRecording.length > 0) {
            const step = this.ghostRecording.length / this.bufferSize;
            for (let i = 0; i < this.bufferSize; i++) {
                const srcIndex = Math.floor(i * step);
                this.ghostData[i] = this.ghostRecording[srcIndex] || 0;
                this.ghostPitch[i] = this.ghostPitchRecording[srcIndex] || 0;
            }
        }
    }

    /**
     * Add amplitude and pitch data from coach audio (for ghost line)
     * @param {Uint8Array} pcmData - Raw PCM audio data (16-bit)
     */
    addGhostAudio(pcmData) {
        if (!this.isRecordingGhost) return;

        // Convert PCM to float for pitch detection
        const floatData = this.pcmToFloat(pcmData);
        const amplitude = this.computeRMS(floatData);
        const pitch = this.detectPitch(floatData, 24000); // Gemini audio is 24kHz

        this.ghostRecording.push(amplitude);
        this.ghostPitchRecording.push(pitch);
    }

    /**
     * Add amplitude and pitch data from user's microphone
     * @param {Float32Array} audioData - Audio samples from microphone
     */
    addUserAudio(audioData) {
        const amplitude = this.computeRMS(audioData);
        const pitch = this.detectPitch(audioData, 16000); // Mic is 16kHz

        this.userdata[this.userIndex] = amplitude;
        this.userPitch[this.userIndex] = pitch;
        this.userIndex = (this.userIndex + 1) % this.bufferSize;
    }

    /**
     * Convert PCM 16-bit to float array
     */
    pcmToFloat(pcmData) {
        const numSamples = pcmData.length / 2;
        const floatData = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            const sample = pcmData[i * 2] | (pcmData[i * 2 + 1] << 8);
            const signedSample = sample > 32767 ? sample - 65536 : sample;
            floatData[i] = signedSample / 32768;
        }
        return floatData;
    }

    /**
     * Compute RMS amplitude from float audio data
     */
    computeRMS(floatData) {
        let sum = 0;
        for (let i = 0; i < floatData.length; i++) {
            sum += floatData[i] * floatData[i];
        }
        return Math.sqrt(sum / floatData.length);
    }

    /**
     * Detect pitch using autocorrelation
     * Returns frequency in Hz, or 0 if no clear pitch detected
     */
    detectPitch(audioData, sampleRate) {
        const minFreq = 80;   // Lowest human voice ~80Hz
        const maxFreq = 400;  // Highest typical speech ~400Hz
        const minPeriod = Math.floor(sampleRate / maxFreq);
        const maxPeriod = Math.floor(sampleRate / minFreq);

        // Downsample for performance if buffer is large
        let data = audioData;
        let sr = sampleRate;
        if (audioData.length > 2048) {
            const factor = Math.floor(audioData.length / 1024);
            data = new Float32Array(Math.floor(audioData.length / factor));
            for (let i = 0; i < data.length; i++) {
                data[i] = audioData[i * factor];
            }
            sr = sampleRate / factor;
        }

        // Check if signal is loud enough
        const rms = this.computeRMS(data);
        if (rms < 0.01) return 0; // Too quiet

        // Autocorrelation
        let bestCorrelation = 0;
        let bestPeriod = 0;

        const adjMinPeriod = Math.floor(sr / maxFreq);
        const adjMaxPeriod = Math.min(Math.floor(sr / minFreq), data.length / 2);

        for (let period = adjMinPeriod; period < adjMaxPeriod; period++) {
            let correlation = 0;
            for (let i = 0; i < data.length - period; i++) {
                correlation += data[i] * data[i + period];
            }
            correlation /= (data.length - period);

            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestPeriod = period;
            }
        }

        // Require minimum correlation for valid pitch
        if (bestCorrelation < 0.1 || bestPeriod === 0) return 0;

        return sr / bestPeriod;
    }

    /**
     * Start the visualization animation loop
     */
    start() {
        this.isActive = true;
        // Reset all data for new session (amplitude and pitch)
        this.ghostData.fill(0);
        this.ghostPitch.fill(0);
        this.userdata.fill(0);
        this.userPitch.fill(0);
        this.ghostIndex = 0;
        this.userIndex = 0;
        this.ghostRecording = [];
        this.ghostPitchRecording = [];
        this.isRecordingGhost = false;

        // Defer canvas setup to next frame when container is visible and laid out
        requestAnimationFrame(() => {
            this.setupCanvas();
            this.animate();
        });
    }

    /**
     * Stop the visualization (keeps last frame visible)
     */
    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // Don't clear - keep the last frame visible
    }

    /**
     * Clear the canvas
     */
    clear() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, width, height);
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    /**
     * Get normalization factor for an array (returns multiplier to fill space)
     */
    getNormalizationFactor(data) {
        let max = 0;
        for (let i = 0; i < data.length; i++) {
            if (data[i] > max) max = data[i];
        }
        // Minimum gain of 5x, max of 50x to avoid noise amplification
        if (max < 0.01) return 5;
        const factor = 0.8 / max; // Scale to 80% of max height
        return Math.min(50, Math.max(5, factor));
    }

    /**
     * Draw both waveforms
     */
    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const centerY = height / 2;
        const maxAmplitude = height * 0.4; // Max wave height

        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw center line (subtle)
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, centerY);
        this.ctx.lineTo(width, centerY);
        this.ctx.stroke();

        // Calculate normalization factors
        const ghostNorm = this.getNormalizationFactor(this.ghostData);
        const userNorm = this.getNormalizationFactor(this.userdata);

        // Draw ghost waveform (filled area)
        this.drawWaveform(this.ghostData, 0, this.ghostColor, maxAmplitude, centerY, width, true, ghostNorm);

        // Draw user waveform with horizontal offset and scale (solid green, user can align manually)
        this.drawWaveform(this.userdata, this.userIndex, this.userColor, maxAmplitude, centerY, width, false, userNorm, this.userOffset, this.userScale);
    }

    /**
     * Set the horizontal offset for user waveform alignment
     * @param {number} offset - Offset in data points (-bufferSize to +bufferSize)
     */
    setUserOffset(offset) {
        this.userOffset = Math.max(-this.bufferSize, Math.min(this.bufferSize, offset));
    }

    /**
     * Get color based on match score (0 = no match, 1 = perfect match)
     * Green (good) → Yellow (ok) → Red (off)
     */
    getMatchColor(matchScore) {
        // Clamp score between 0 and 1
        const score = Math.max(0, Math.min(1, matchScore));

        if (score > 0.7) {
            // Good match: Green
            return '#58CC02';
        } else if (score > 0.4) {
            // Okay match: Yellow/Orange blend
            const t = (score - 0.4) / 0.3;
            return `hsl(${45 + t * 75}, 85%, 55%)`; // Yellow to green
        } else {
            // Poor match: Red to Yellow
            const t = score / 0.4;
            return `hsl(${t * 45}, 85%, 55%)`; // Red to yellow
        }
    }

    /**
     * Draw user waveform with color based on how well it matches the ghost pattern
     * Match score combines amplitude (rhythm) and pitch (intonation)
     */
    drawUserWaveformWithMatching(maxAmplitude, centerY, width, userNorm, ghostNorm) {
        const step = width / this.bufferSize;

        // Draw each segment with appropriate color
        for (let i = 0; i < this.bufferSize - 1; i++) {
            const userIdx = (this.userIndex + i) % this.bufferSize;
            const userIdxNext = (this.userIndex + i + 1) % this.bufferSize;

            const userAmp = this.userdata[userIdx] * userNorm;
            const userAmpNext = this.userdata[userIdxNext] * userNorm;
            const ghostAmp = this.ghostData[i] * ghostNorm;

            const userP = this.userPitch[userIdx];
            const ghostP = this.ghostPitch[i];

            // Calculate COMBINED match score (amplitude + pitch)
            let matchScore = 1;

            // Only evaluate if there's audio
            const hasAudio = ghostAmp > 0.01 || userAmp > 0.01;
            const hasPitch = ghostP > 0 || userP > 0;

            if (hasAudio) {
                // Amplitude match (0-1): closer normalized amplitudes = better
                const ampDiff = Math.abs(userAmp - ghostAmp);
                const ampScore = Math.max(0, 1 - ampDiff * 2);

                // Pitch match (0-1): closer frequencies = better
                let pitchScore = 1;
                if (hasPitch && ghostP > 0 && userP > 0) {
                    // Compare pitch as ratio (octave-aware)
                    // Perfect match = 1.0 ratio, one octave off = 0.5 or 2.0
                    const ratio = userP / ghostP;
                    const logRatio = Math.abs(Math.log2(ratio));
                    // Score: 0 semitones diff = 1.0, 12 semitones (octave) = 0
                    pitchScore = Math.max(0, 1 - logRatio);
                } else if (hasPitch) {
                    // One has pitch, other doesn't - partial penalty
                    pitchScore = 0.5;
                }

                // Combined score: 50% amplitude + 50% pitch
                matchScore = (ampScore + pitchScore) / 2;
            }

            const color = this.getMatchColor(matchScore);
            const x1 = i * step;
            const x2 = (i + 1) * step;
            const y1 = centerY - userAmp * maxAmplitude;
            const y2 = centerY - userAmpNext * maxAmplitude;

            // Draw top line segment
            this.ctx.beginPath();
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // Draw mirrored bottom line segment
            this.ctx.beginPath();
            this.ctx.moveTo(x1, centerY + userAmp * maxAmplitude);
            this.ctx.lineTo(x2, centerY + userAmpNext * maxAmplitude);
            this.ctx.stroke();
        }
    }

    /**
     * Draw a single waveform
     * @param {number} xOffset - Optional horizontal offset in data points
     * @param {number} xScale - Optional horizontal scale (1.0 = normal, >1 = stretched)
     */
    drawWaveform(data, startIndex, color, maxAmplitude, centerY, width, filled, normFactor = 1, xOffset = 0, xScale = 1) {
        const step = (width / this.bufferSize) * xScale; // Apply scale to step size

        this.ctx.beginPath();
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;

        // Start from center
        this.ctx.moveTo(0, centerY);

        for (let i = 0; i < this.bufferSize; i++) {
            const dataIndex = (startIndex + i) % this.bufferSize;
            const amplitude = data[dataIndex] * normFactor * maxAmplitude;
            const x = (i * xScale + xOffset) * (width / this.bufferSize); // Apply scale and offset
            const y = centerY - amplitude; // Wave goes up

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        if (filled) {
            // Complete the fill path
            for (let i = this.bufferSize - 1; i >= 0; i--) {
                const dataIndex = (startIndex + i) % this.bufferSize;
                const amplitude = data[dataIndex] * normFactor * maxAmplitude;
                const x = i * (width / this.bufferSize);
                const y = centerY + amplitude; // Mirror below center
                this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fill();
        } else {
            this.ctx.stroke();

            // Draw mirrored line below
            this.ctx.beginPath();
            for (let i = 0; i < this.bufferSize; i++) {
                const dataIndex = (startIndex + i) % this.bufferSize;
                const amplitude = data[dataIndex] * normFactor * maxAmplitude;
                const x = (i * xScale + xOffset) * (width / this.bufferSize); // Apply scale and offset
                const y = centerY + amplitude;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            this.ctx.stroke();
        }
    }

    /**
     * Reset all data
     */
    reset() {
        this.ghostData.fill(0);
        this.userdata.fill(0);
        this.ghostIndex = 0;
        this.userIndex = 0;
        this.ghostRecording = [];
        this.isRecordingGhost = false;
    }
}
