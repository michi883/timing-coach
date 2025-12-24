/**
 * Language definitions for Timing Coach
 */

export const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', family: 'Germanic', groupings: ['top10', 'european', 'germanic'] },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', family: 'Romance', groupings: ['top10', 'european', 'romance'] },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', family: 'Romance', groupings: ['top10', 'european', 'romance'] },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', family: 'Germanic', groupings: ['european', 'germanic'] },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', family: 'Romance', groupings: ['european', 'romance'] },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', family: 'Romance', groupings: ['top10', 'european', 'romance'] },
    { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', family: 'Japonic', groupings: ['top10', 'asian', 'eastern'] },
    { code: 'zh', name: 'Mandarin Chinese', nativeName: '中文', flag: '🇨🇳', family: 'Sino-Tibetan', groupings: ['top10', 'asian', 'eastern'] },
    { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', family: 'Koreanic', groupings: ['asian', 'eastern'] },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', family: 'Semitic', groupings: ['top10'] },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', family: 'Indo-Aryan', groupings: ['top10'] },
    { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', family: 'Slavic', groupings: ['top10', 'european'] },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', family: 'Germanic', groupings: ['european', 'germanic'] },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', family: 'Germanic', groupings: ['european', 'germanic'] },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', family: 'Turkic', groupings: ['top10'] },
];

export function getLanguageByCode(code) {
    return languages.find(l => l.code === code);
}

export function getLanguagesByGroup(group) {
    return languages.filter(l => l.groupings.includes(group));
}
