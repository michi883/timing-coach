/**
 * Situations and Delivery Styles for Timing Coach
 * 
 * Situations: When users are speaking
 * Delivery Styles: How they want to come across
 */

export const situations = [
    { id: 'introductions', name: 'Introductions', icon: '👋', description: 'Meeting someone for the first time' },
    { id: 'small-talk', name: 'Small Talk', icon: '💬', description: 'Casual, light conversation' },
    { id: 'work-meetings', name: 'Work Meetings', icon: '💼', description: 'Professional workplace discussions' },
    { id: 'networking', name: 'Networking', icon: '🤝', description: 'Building professional connections' },
    { id: 'travel', name: 'Travel Situations', icon: '✈️', description: 'Navigating travel and tourism' },
    { id: 'icebreakers', name: 'Social Icebreakers', icon: '🧊', description: 'Breaking the ice in social settings' },
    { id: 'catch-ups', name: 'Casual Catch-ups', icon: '☕', description: 'Reconnecting with acquaintances' },
    { id: 'first-impressions', name: 'First Impressions', icon: '✨', description: 'Making a memorable first impression' },
];

export const deliveryStyles = [
    { id: 'friendly', name: 'Friendly', icon: '😊', description: 'Warm and approachable' },
    { id: 'curious', name: 'Curious', icon: '🤔', description: 'Genuinely interested and inquisitive' },
    { id: 'dry', name: 'Dry', icon: '😐', description: 'Subtle, understated wit' },
    { id: 'playful', name: 'Playful', icon: '😄', description: 'Light-hearted and fun' },
    { id: 'humble', name: 'Humble', icon: '🙏', description: 'Modest and self-aware' },
    { id: 'clever', name: 'Clever', icon: '🧠', description: 'Sharp and quick-witted' },
];

/**
 * @typedef {Object} Phrase
 * @property {string} id
 * @property {string} languageCode
 * @property {string} situation
 * @property {string} phrase
 * @property {string} response
 * @property {string} pronunciation
 * @property {string} culturalNote
 * @property {string} translation
 */
