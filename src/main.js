/**
 * Timing Coach - Main Application
 */

import { languages } from './data/languages.js';
import { situations, deliveryStyles } from './data/phrases.js';
import { initGemini, generatePhrase } from './services/gemini.js';
import { LiveAudioService } from './services/live-audio.js';
import { ProsodyVisualizer } from './services/prosody-visualizer.js';

// Get API key from environment
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// State
const state = {
    selectedLanguage: null,
    selectedSituation: null,
    selectedDelivery: null,
    currentPhrase: null,
    isGenerating: false,
    isSessionActive: false,
    isCoachSpeaking: false,
};

// Audio context for playback
let audioContext = null;
let nextPlayTime = 0;
let liveService = null;
let mediaStream = null;
let audioProcessor = null;
let prosodyVisualizer = null;

// DOM Elements
const elements = {
    languageChips: document.getElementById('language-chips'),
    situationChips: document.getElementById('situation-chips'),
    deliveryChips: document.getElementById('delivery-chips'),
    phraseContainer: document.getElementById('phrase-container'),
    loading: document.getElementById('loading'),
    status: document.getElementById('status'),
    micButton: document.getElementById('mic-button'),
    // Collapsible sections
    languageSection: document.getElementById('language-section'),
    situationSection: document.getElementById('situation-section'),
    deliverySection: document.getElementById('delivery-section'),
    languageSelected: document.getElementById('language-selected'),
    situationSelected: document.getElementById('situation-selected'),
    deliverySelected: document.getElementById('delivery-selected'),
    // Prosody visualizer
    prosodyContainer: document.getElementById('prosody-container'),
    prosodyCanvas: document.getElementById('prosody-canvas'),
};

// Initialize
function init() {
    // Render UI first (before API key check)
    renderLanguages();
    renderSituations();
    renderDeliveryStyles();
    setupCollapsibleSections();

    elements.micButton.addEventListener('click', toggleSession);

    // Check API key after rendering
    if (!API_KEY) {
        elements.status.textContent = 'Missing VITE_GEMINI_API_KEY in .env';
        return;
    }

    initGemini(API_KEY);
}

// Setup collapsible section behavior
function setupCollapsibleSections() {
    const sections = [elements.languageSection, elements.situationSection, elements.deliverySection];

    sections.forEach(section => {
        const header = section.querySelector('.section-header');
        header.addEventListener('click', (e) => {
            e.preventDefault();
            // Close other sections
            sections.forEach(s => {
                if (s !== section) s.classList.remove('expanded');
            });
            // Toggle this section
            section.classList.toggle('expanded');
        });
    });

    // Start with language section expanded
    elements.languageSection.classList.add('expanded');
}

// Render language chips
function renderLanguages() {
    elements.languageChips.innerHTML = languages.map(lang => `
    <button class="chip" data-code="${lang.code}">
      ${lang.flag} ${lang.name}
    </button>
  `).join('');

    elements.languageChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const code = chip.dataset.code;
        state.selectedLanguage = languages.find(l => l.code === code);
        updateChipSelection(elements.languageChips, code);
        updateSelectedDisplay('language', `${state.selectedLanguage.flag} ${state.selectedLanguage.name}`);
        collapseAndOpenNext('language');
        tryGeneratePhrase();
    });
}

// Render situation chips
function renderSituations() {
    elements.situationChips.innerHTML = situations.map(situation => `
    <button class="chip" data-id="${situation.id}">
      ${situation.icon} ${situation.name}
    </button>
  `).join('');

    elements.situationChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const id = chip.dataset.id;
        state.selectedSituation = situations.find(s => s.id === id);
        updateChipSelection(elements.situationChips, id);
        updateSelectedDisplay('situation', `${state.selectedSituation.icon} ${state.selectedSituation.name}`);
        collapseAndOpenNext('situation');
        tryGeneratePhrase();
    });
}

// Render delivery style chips
function renderDeliveryStyles() {
    elements.deliveryChips.innerHTML = deliveryStyles.map(style => `
    <button class="chip" data-id="${style.id}">
      ${style.icon} ${style.name}
    </button>
  `).join('');

    elements.deliveryChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        const id = chip.dataset.id;
        state.selectedDelivery = deliveryStyles.find(d => d.id === id);
        updateChipSelection(elements.deliveryChips, id);
        updateSelectedDisplay('delivery', `${state.selectedDelivery.icon} ${state.selectedDelivery.name}`);
        collapseAndOpenNext('delivery');
        tryGeneratePhrase();
    });
}

// Update selected display text
function updateSelectedDisplay(type, text) {
    const el = elements[`${type}Selected`];
    el.textContent = text;
    el.classList.add('has-selection');
}

// Collapse current section and open next
function collapseAndOpenNext(current) {
    const order = ['language', 'situation', 'delivery'];
    const currentIndex = order.indexOf(current);

    // Collapse current
    elements[`${current}Section`].classList.remove('expanded');

    // Open next if available and not yet selected
    if (currentIndex < order.length - 1) {
        const next = order[currentIndex + 1];
        const nextState = state[`selected${next.charAt(0).toUpperCase() + next.slice(1)}`];
        if (!nextState) {
            elements[`${next}Section`].classList.add('expanded');
        }
    }
}

// Update chip selection state
function updateChipSelection(container, selectedId) {
    container.querySelectorAll('.chip').forEach(chip => {
        const id = chip.dataset.code || chip.dataset.id;
        chip.classList.toggle('selected', id === selectedId);
    });
}

// Try to generate phrase if all selections made
async function tryGeneratePhrase() {
    if (!state.selectedLanguage || !state.selectedSituation || !state.selectedDelivery) {
        return;
    }

    if (state.isGenerating) return;

    state.isGenerating = true;
    state.currentPhrase = null;
    elements.phraseContainer.innerHTML = '';
    elements.loading.classList.remove('hidden');
    elements.micButton.classList.add('hidden');
    elements.status.textContent = '';

    try {
        state.currentPhrase = await generatePhrase(
            state.selectedLanguage,
            state.selectedSituation,
            state.selectedDelivery
        );
        renderPhrase();
    } catch (error) {
        console.error('Failed to generate phrase:', error);
        elements.status.textContent = 'Failed to generate phrase. Please try again.';
    } finally {
        state.isGenerating = false;
        elements.loading.classList.add('hidden');
    }
}

// Render phrase card
function renderPhrase() {
    if (!state.currentPhrase) return;

    // Auto-collapse all sections for a cleaner view
    [elements.languageSection, elements.situationSection, elements.deliverySection].forEach(section => {
        section.classList.remove('expanded');
    });

    const phrase = state.currentPhrase;
    elements.phraseContainer.innerHTML = `
    <div class="phrase-card">
      <p class="phrase-text">${phrase.phrase}</p>
      <p class="phrase-response">${phrase.response}</p>
    </div>
    ${phrase.translation || phrase.culturalNote ? `
      <div class="phrase-details">
        ${phrase.translation ? `
          <p class="phrase-label">Delivery Notes</p>
          <p class="phrase-translation">${phrase.translation}</p>
        ` : ''}
        ${phrase.translation && phrase.culturalNote ? '<div class="phrase-divider"></div>' : ''}
        ${phrase.culturalNote ? `
          <div class="phrase-cultural">
            <span class="phrase-cultural-icon">💡</span>
            <p class="phrase-cultural-text">${phrase.culturalNote}</p>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;

    elements.micButton.classList.remove('hidden');
    // Minimal text: just show hint, status cleared
    elements.status.textContent = 'Tap mic to practice';
}

// Toggle audio session
async function toggleSession() {
    if (state.isSessionActive) {
        await endSession();
    } else {
        await startSession();
    }
}

// Start coaching session
async function startSession() {
    if (!state.currentPhrase) return;

    state.isSessionActive = true;
    updateMicButton();
    // Clear status text - waveform is the feedback during active session
    elements.status.textContent = '';

    try {
        // Initialize audio context
        if (!audioContext) {
            audioContext = new AudioContext({ sampleRate: 24000 });
        }
        nextPlayTime = 0;

        // Initialize live service
        liveService = new LiveAudioService(API_KEY);

        liveService.onReady = () => {
            state.isCoachSpeaking = true;
            // Start recording ghost line for visualization
            prosodyVisualizer?.startGhostRecording();
            setTimeout(() => liveService.requestDemonstration(), 300);
        };

        liveService.onAudio = (audioData) => {
            playPcmAudio(audioData);
            // Feed audio to prosody visualizer for ghost line
            prosodyVisualizer?.addGhostAudio(audioData);
        };

        liveService.onTurnComplete = () => {
            state.isCoachSpeaking = false;
            // Stop recording ghost, start visualizing user
            prosodyVisualizer?.stopGhostRecording();
        };

        liveService.onInterrupted = () => {
            state.isCoachSpeaking = false;
            stopAudioPlayback();
        };

        liveService.onError = (error) => {
            console.error('Live service error:', error);
            endSession();
            elements.status.textContent = 'Connection error';
        };

        // Initialize prosody visualizer BEFORE connecting
        prosodyVisualizer = new ProsodyVisualizer(elements.prosodyCanvas);
        elements.prosodyContainer.classList.remove('hidden');
        prosodyVisualizer.start();

        // Connect to Gemini Live API
        await liveService.connect(
            state.selectedLanguage.name,
            `${state.currentPhrase.phrase} ${state.currentPhrase.response}`,
            state.currentPhrase.pronunciation
        );

        // Start recording
        await startRecording();

    } catch (error) {
        console.error('Failed to start session:', error);
        endSession();
        elements.status.textContent = 'Failed to connect';
    }
}

// End coaching session
async function endSession() {
    // Stop recording
    stopRecording();
    stopAudioPlayback();

    // Disconnect
    liveService?.dispose();
    liveService = null;

    state.isSessionActive = false;
    state.isCoachSpeaking = false;
    updateMicButton();
    elements.status.textContent = 'Tap to practice again';

    // Stop prosody visualizer animation (but keep it visible)
    prosodyVisualizer?.stop();
}

// Start microphone recording
async function startRecording() {
    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        // Create audio processing pipeline
        const inputContext = new AudioContext({ sampleRate: 16000 });
        const source = inputContext.createMediaStreamSource(mediaStream);

        // Use ScriptProcessor for PCM extraction (AudioWorklet would be better but more complex)
        audioProcessor = inputContext.createScriptProcessor(4096, 1, 1);

        audioProcessor.onaudioprocess = (e) => {
            if (!state.isSessionActive) return;

            const inputData = e.inputBuffer.getChannelData(0);
            // Convert float32 to int16
            const pcmData = new Uint8Array(inputData.length * 2);
            for (let i = 0; i < inputData.length; i++) {
                const sample = Math.max(-1, Math.min(1, inputData[i]));
                const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                pcmData[i * 2] = int16 & 0xFF;
                pcmData[i * 2 + 1] = (int16 >> 8) & 0xFF;
            }

            liveService?.sendAudio(pcmData);

            // Feed raw audio to prosody visualizer for user line
            if (!state.isCoachSpeaking) {
                prosodyVisualizer?.addUserAudio(inputData);
            }
        };

        source.connect(audioProcessor);
        audioProcessor.connect(inputContext.destination);

    } catch (error) {
        console.error('Failed to start recording:', error);
        elements.status.textContent = 'Need microphone access';
    }
}

// Stop recording
function stopRecording() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    audioProcessor = null;
}

// Play PCM audio from Gemini (24kHz, 16-bit)
function playPcmAudio(pcmData) {
    if (!audioContext) return;

    const numSamples = pcmData.length / 2;
    if (numSamples === 0) return;

    const buffer = audioContext.createBuffer(1, numSamples, 24000);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < numSamples; i++) {
        const sample = pcmData[i * 2] | (pcmData[i * 2 + 1] << 8);
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        channelData[i] = signedSample / 32768;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);

    const currentTime = audioContext.currentTime;
    if (nextPlayTime < currentTime) {
        nextPlayTime = currentTime;
    }

    source.start(nextPlayTime);
    nextPlayTime += buffer.duration;
}

// Stop audio playback
function stopAudioPlayback() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        audioContext = new AudioContext({ sampleRate: 24000 });
        nextPlayTime = 0;
    }
}

// Update mic button state
function updateMicButton() {
    const micIcon = elements.micButton.querySelector('.mic-icon');
    const stopIcon = elements.micButton.querySelector('.stop-icon');

    if (state.isSessionActive) {
        elements.micButton.classList.add('active');
        micIcon.classList.add('hidden');
        stopIcon.classList.remove('hidden');
    } else {
        elements.micButton.classList.remove('active');
        micIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
    }
}

// Start the app
init();
