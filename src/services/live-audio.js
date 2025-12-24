/**
 * Live Audio Service for real-time coaching via Gemini Live API
 */

export class LiveAudioService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.ws = null;
        this.isConnected = false;
        this.storedPhrase = '';
        this.storedLanguage = '';
        this.onReady = null;
        this.onAudio = null;
        this.onText = null;
        this.onTurnComplete = null;
        this.onError = null;
        this.onInterrupted = null;
    }

    async connect(targetLanguage, phraseText) {
        if (this.isConnected) await this.disconnect();

        this.storedPhrase = phraseText;
        this.storedLanguage = targetLanguage;

        const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                // Send setup message
                const setupMessage = {
                    setup: {
                        model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
                        generationConfig: {
                            responseModalities: ['AUDIO']
                        }
                    }
                };
                this.ws.send(JSON.stringify(setupMessage));
                this.isConnected = true;
                resolve();
            };

            this.ws.onmessage = async (event) => {
                // Handle Blob or string data
                const data = event.data instanceof Blob
                    ? await event.data.text()
                    : event.data;
                this._handleResponse(data);
            };

            this.ws.onerror = () => {
                this.isConnected = false;
                this.onError?.('Connection error');
                reject(new Error('WebSocket error'));
            };

            this.ws.onclose = () => {
                this.isConnected = false;
            };
        });
    }

    requestDemonstration() {
        if (!this.isConnected || !this.ws) return;

        const message = {
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{
                        text: `You are a language timing coach teaching ${this.storedLanguage}. 

FIRST TURN: Skip all greetings. Immediately demonstrate this phrase in ${this.storedLanguage}: ${this.storedPhrase}. Say ONLY the phrase, nothing else.

ALL SUBSEQUENT TURNS - You MUST understand BOTH English and ${this.storedLanguage}:
- If the user speaks in ENGLISH (asking questions, making comments), respond in ENGLISH
- If the user attempts the phrase in ${this.storedLanguage}, give brief feedback in ENGLISH about their timing and pronunciation
- NEVER ask the user to repeat themselves - always try to understand and respond helpfully
- Only speak ${this.storedLanguage} when demonstrating or correcting specific pronunciation`
                    }]
                }],
                turnComplete: true
            }
        };

        this.ws.send(JSON.stringify(message));
    }

    sendAudio(audioData) {
        if (!this.isConnected || !this.ws) return;

        // Convert Uint8Array to base64
        const base64 = btoa(String.fromCharCode(...audioData));
        const message = {
            realtimeInput: {
                mediaChunks: [{
                    data: base64,
                    mimeType: 'audio/pcm;rate=16000'
                }]
            }
        };

        this.ws.send(JSON.stringify(message));
    }

    endAudioInput() {
        if (!this.isConnected || !this.ws) return;

        const message = {
            clientContent: {
                turnComplete: true
            }
        };

        this.ws.send(JSON.stringify(message));
    }

    _handleResponse(data) {
        try {
            const json = JSON.parse(data);

            if (json.setupComplete) {
                this.onReady?.();
                return;
            }

            if (json.serverContent) {
                const sc = json.serverContent;

                if (sc.interrupted) {
                    this.onInterrupted?.();
                    return;
                }

                if (sc.modelTurn?.parts) {
                    for (const part of sc.modelTurn.parts) {
                        if (part.text) {
                            this.onText?.(part.text);
                        }
                        if (part.inlineData?.data) {
                            // Decode base64 to Uint8Array
                            const binary = atob(part.inlineData.data);
                            const bytes = new Uint8Array(binary.length);
                            for (let i = 0; i < binary.length; i++) {
                                bytes[i] = binary.charCodeAt(i);
                            }
                            this.onAudio?.(bytes);
                        }
                    }
                }

                if (sc.turnComplete) {
                    this.onTurnComplete?.();
                }
            }

            if (json.error) {
                this.onError?.(json.error.toString());
            }
        } catch (e) {
            // Silently handle parse errors
        }
    }

    async disconnect() {
        this.isConnected = false;
        this.ws?.close();
        this.ws = null;
    }

    dispose() {
        this.disconnect();
    }
}
