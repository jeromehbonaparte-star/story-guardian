/**
 * Story Guardian - LLM Output Validator & Auto-Corrector
 * Validates AI responses against storytelling guidelines and auto-corrects common issues
 */

import { extension_settings, getContext } from '../../../extensions.js';
import { eventSource, event_types, saveSettingsDebounced, saveChatDebounced } from '../../../../script.js';

const extensionName = 'story-guardian';
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}/`;

// Default settings
const defaultSettings = {
    enabled: true,
    autoCorrect: true,
    showWarnings: true,
    showNoViolations: false,
    strictMode: false,
    guidelines: '',
    validationRules: {
        sceneEndings: true,
        showDontTell: true,
        dialogueNaturalness: true,
        pacing: true,
        emotionLabels: true
    }
};

// Extension settings
let settings = {};

// Forbidden ending patterns (from guidelines)
const FORBIDDEN_PATTERNS = [
    /one day at a time/gi,
    /(I|we|they) (would|will|must) .*(protect|ensure|make sure)/gi,
    /even (gods|people|characters) (had to|must|need to)/gi,
    /(this was|that was) .* and (I|we|they) (was|were) going to/gi,
    /standing (back|there) to (survey|appreciate|marvel|contemplate)/gi,
    /\. \w+ had to handle the basics/gi,
    /fortune cookie/gi
];

// Emotion label patterns (show don't tell violations)
const EMOTION_LABELS = [
    /I felt (angry|sad|happy|scared|worried|anxious|nervous|excited)/gi,
    /(he|she|they) (seemed|appeared|looked) (sad|happy|angry|worried|nervous)/gi,
    /I was (angry|sad|happy|scared|terrified|elated)/gi
];

// Good ending patterns (concrete, active, immediate)
const GOOD_ENDING_TYPES = {
    physicalAction: [
        'grabbed', 'reached', 'turned', 'walked', 'opened', 'closed',
        'pulled', 'pushed', 'picked up', 'set down'
    ],
    dialogue: [
        '"', 'said', 'asked', 'called', 'muttered', 'whispered'
    ],
    sensory: [
        'heard', 'saw', 'felt', 'smelled', 'tasted',
        'buzzed', 'rang', 'slammed', 'creaked'
    ],
    interruption: [
        'door opened', 'phone rang', 'alarm', 'knock', 'crash',
        'footsteps', 'voice'
    ]
};

/**
 * Initialize the extension
 */
async function init() {
    console.log('[Story Guardian] Initializing...');

    // Load settings
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = defaultSettings;
    }
    settings = extension_settings[extensionName];

    // Load guidelines from file or use default
    if (!settings.guidelines) {
        await loadDefaultGuidelines();
    }

    // Register event listeners
    eventSource.on(event_types.MESSAGE_RECEIVED, handleMessageReceived);
    eventSource.on(event_types.MESSAGE_SWIPED, handleMessageSwiped);

    // Add UI
    await loadSettingsHTML();

    console.log('[Story Guardian] Initialized successfully');
}

/**
 * Load default guidelines from file
 */
async function loadDefaultGuidelines() {
    try {
        const response = await fetch('/api/content/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file_path: 'J:/Claude Code/Story Teller Guidelines.txt'
            })
        });

        if (response.ok) {
            const data = await response.json();
            settings.guidelines = data.content || '';
        }
    } catch (error) {
        console.warn('[Story Guardian] Could not load default guidelines:', error);
        settings.guidelines = getDefaultGuidelinesText();
    }
    saveSettings();
}

/**
 * Get default guidelines as fallback
 */
function getDefaultGuidelinesText() {
    return `[Scene Endings - CRITICAL]

FORBIDDEN ENDING PATTERNS (NEVER USE):
✗ Philosophical reflections on the future
✗ Determinations about what will/must happen
✗ "One day at a time" or similar platitudes
✗ Life lesson conclusions
✗ Thematic statements
✗ Chapter-ending closure feelings
✗ Resolution statements that wrap up emotional arcs

REQUIRED ENDING TYPES:
- Physical Action: Character actively doing something mundane
- Dialogue Cut: Someone speaking, conversation continuing
- Immediate Sensory: Something noticed right now
- Interruption/Arrival: Someone entering, something happening

[Show, Don't Tell]
✗ Never use emotion labels ("I felt angry", "She seemed sad")
✓ Reveal through physical sensations, body language, actions`;
}

/**
 * Handle incoming AI message
 */
async function handleMessageReceived(data) {
    if (!settings.enabled) return;

    const context = getContext();
    const lastMessage = context.chat[context.chat.length - 1];

    if (lastMessage && !lastMessage.is_user) {
        const messageText = lastMessage.mes;
        const analysis = analyzeMessage(messageText);

        if (analysis.violations.length > 0) {
            console.log('[Story Guardian] Found violations:', analysis.violations);

            if (settings.autoCorrect) {
                const correctedText = await correctMessage(messageText, analysis);
                if (correctedText !== messageText) {
                    lastMessage.mes = correctedText;
                    console.log('[Story Guardian] Auto-corrected message');

                    // Re-render the message in the UI
                    const messageElement = $(`#chat .mes[mesid="${context.chat.length - 1}"] .mes_text`);
                    if (messageElement.length > 0) {
                        messageElement.html(correctedText);
                    }

                    // Save the corrected chat
                    saveChatDebounced();
                }
            }

            if (settings.showWarnings) {
                showWarnings(analysis.violations);
            }
        } else {
            // No violations found
            console.log('[Story Guardian] No violations detected');

            if (settings.showNoViolations) {
                if (typeof toastr !== 'undefined') {
                    toastr.success(
                        `Message passed all validation checks! (${analysis.wordCount} words)`,
                        'Story Guardian ✓',
                        { timeOut: 3000 }
                    );
                }
            }
        }
    }
}

/**
 * Handle message swipe
 */
async function handleMessageSwiped(data) {
    await handleMessageReceived(data);
}

/**
 * Analyze message for guideline violations
 */
function analyzeMessage(text) {
    const violations = [];
    const lines = text.trim().split('\n');
    const lastSentences = getLastSentences(text, 3);

    // Check scene ending violations
    if (settings.validationRules.sceneEndings) {
        const endingViolations = checkSceneEnding(lastSentences);
        violations.push(...endingViolations);
    }

    // Check show-don't-tell violations
    if (settings.validationRules.showDontTell) {
        const emotionViolations = checkEmotionLabels(text);
        violations.push(...emotionViolations);
    }

    // Check dialogue naturalness
    if (settings.validationRules.dialogueNaturalness) {
        const dialogueViolations = checkDialogue(text);
        violations.push(...dialogueViolations);
    }

    return {
        violations,
        lastSentences,
        wordCount: text.split(/\s+/).length
    };
}

/**
 * Check for forbidden scene ending patterns
 */
function checkSceneEnding(lastSentences) {
    const violations = [];
    const endingText = lastSentences.join(' ');

    // Check forbidden patterns
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(endingText)) {
            violations.push({
                type: 'scene_ending',
                severity: 'high',
                pattern: pattern.source,
                text: endingText,
                message: 'Scene ending contains forbidden reflective/philosophical pattern'
            });
        }
    }

    // Check if ending is too abstract/reflective
    const hasGoodEnding = Object.values(GOOD_ENDING_TYPES).some(keywords =>
        keywords.some(keyword => endingText.toLowerCase().includes(keyword.toLowerCase()))
    );

    if (!hasGoodEnding && settings.strictMode) {
        violations.push({
            type: 'scene_ending',
            severity: 'medium',
            text: endingText,
            message: 'Scene ending lacks concrete action/dialogue/sensory detail'
        });
    }

    return violations;
}

/**
 * Check for emotion label violations
 */
function checkEmotionLabels(text) {
    const violations = [];

    for (const pattern of EMOTION_LABELS) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            violations.push({
                type: 'show_dont_tell',
                severity: 'medium',
                text: match[0],
                message: 'Using emotion labels instead of showing through actions/sensations'
            });
        }
    }

    return violations;
}

/**
 * Check dialogue naturalness
 */
function checkDialogue(text) {
    const violations = [];

    // Check for dialogue without contractions (too formal)
    const dialoguePattern = /"([^"]+)"/g;
    const dialogues = [...text.matchAll(dialoguePattern)];

    for (const dialogue of dialogues) {
        const speech = dialogue[1];
        // Check if it has formal patterns like "I am", "we are" without contractions
        if (/\b(I am|we are|they are|he is|she is)\b/i.test(speech)) {
            if (!/formal|lord|lady|your (majesty|highness)/i.test(text)) {
                violations.push({
                    type: 'dialogue',
                    severity: 'low',
                    text: speech,
                    message: 'Dialogue may be too formal - consider using contractions'
                });
            }
        }
    }

    return violations;
}

/**
 * Auto-correct message based on violations
 */
async function correctMessage(text, analysis) {
    let corrected = text;

    // Fix scene endings
    const endingViolations = analysis.violations.filter(v => v.type === 'scene_ending');
    if (endingViolations.length > 0) {
        corrected = await fixSceneEnding(corrected, analysis.lastSentences);
    }

    // Fix emotion labels
    const emotionViolations = analysis.violations.filter(v => v.type === 'show_dont_tell');
    if (emotionViolations.length > 0) {
        corrected = fixEmotionLabels(corrected, emotionViolations);
    }

    return corrected;
}

/**
 * Fix scene ending by removing last reflective sentences
 */
async function fixSceneEnding(text, lastSentences) {
    // Remove the last 1-2 sentences if they're reflective
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];

    if (sentences.length > 2) {
        // Check if last sentence is problematic
        const lastSentence = sentences[sentences.length - 1];
        const isProblematic = FORBIDDEN_PATTERNS.some(pattern => pattern.test(lastSentence));

        if (isProblematic) {
            // Remove last sentence
            sentences.pop();

            // Check if second-to-last is also problematic
            const secondLast = sentences[sentences.length - 1];
            if (FORBIDDEN_PATTERNS.some(pattern => pattern.test(secondLast))) {
                sentences.pop();
            }

            return sentences.join(' ');
        }
    }

    return text;
}

/**
 * Fix emotion labels by removing or commenting them
 */
function fixEmotionLabels(text, violations) {
    let corrected = text;

    for (const violation of violations) {
        // For now, just mark them with a comment
        corrected = corrected.replace(
            violation.text,
            `[SHOW-DON'T-TELL: ${violation.text}]`
        );
    }

    return corrected;
}

/**
 * Get last N sentences from text
 */
function getLastSentences(text, n = 3) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(-n);
}

/**
 * Show warnings to user
 */
function showWarnings(violations) {
    if (violations.length === 0) return;

    // Group violations by severity
    const highSeverity = violations.filter(v => v.severity === 'high');
    const mediumSeverity = violations.filter(v => v.severity === 'medium');
    const lowSeverity = violations.filter(v => v.severity === 'low');

    // Build warning message
    let message = `Found ${violations.length} guideline violation(s):\n\n`;

    if (highSeverity.length > 0) {
        message += `🔴 High Priority (${highSeverity.length}):\n`;
        highSeverity.forEach(v => {
            message += `  • ${v.type}: ${v.message}\n`;
            if (v.text) message += `    "${v.text.substring(0, 60)}..."\n`;
        });
        message += '\n';
    }

    if (mediumSeverity.length > 0) {
        message += `🟡 Medium Priority (${mediumSeverity.length}):\n`;
        mediumSeverity.forEach(v => {
            message += `  • ${v.type}: ${v.message}\n`;
        });
        message += '\n';
    }

    if (lowSeverity.length > 0) {
        message += `🟢 Low Priority (${lowSeverity.length}):\n`;
        lowSeverity.forEach(v => {
            message += `  • ${v.type}: ${v.message}\n`;
        });
    }

    // Show notification based on highest severity
    if (typeof toastr !== 'undefined') {
        if (highSeverity.length > 0) {
            toastr.error(message, 'Story Guardian', { timeOut: 10000 });
        } else if (mediumSeverity.length > 0) {
            toastr.warning(message, 'Story Guardian', { timeOut: 8000 });
        } else {
            toastr.info(message, 'Story Guardian', { timeOut: 6000 });
        }
    } else {
        console.warn('[Story Guardian] Violations detected:', message);
    }
}

/**
 * Load settings HTML
 */
async function loadSettingsHTML() {
    const html = `
        <div id="story_guardian_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Story Guardian</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_enabled" />
                        <span>Enable Story Guardian</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_auto_correct" />
                        <span>Auto-correct violations</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_show_warnings" />
                        <span>Show warnings</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_show_no_violations" />
                        <span>Show notification when no violations found (for testing)</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_strict_mode" />
                        <span>Strict mode (more aggressive validation)</span>
                    </label>

                    <h4>Validation Rules</h4>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_rule_endings" />
                        <span>Check scene endings</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_rule_show_tell" />
                        <span>Check show-don't-tell</span>
                    </label>
                    <label class="checkbox_label">
                        <input type="checkbox" id="story_guardian_rule_dialogue" />
                        <span>Check dialogue naturalness</span>
                    </label>

                    <div id="story-guardian-warnings" style="display: none;"></div>
                </div>
            </div>
        </div>
    `;

    $('#extensions_settings2').append(html);

    // Load saved settings
    $('#story_guardian_enabled').prop('checked', settings.enabled).on('change', function () {
        settings.enabled = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_auto_correct').prop('checked', settings.autoCorrect).on('change', function () {
        settings.autoCorrect = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_show_warnings').prop('checked', settings.showWarnings).on('change', function () {
        settings.showWarnings = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_show_no_violations').prop('checked', settings.showNoViolations).on('change', function () {
        settings.showNoViolations = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_strict_mode').prop('checked', settings.strictMode).on('change', function () {
        settings.strictMode = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_rule_endings').prop('checked', settings.validationRules.sceneEndings).on('change', function () {
        settings.validationRules.sceneEndings = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_rule_show_tell').prop('checked', settings.validationRules.showDontTell).on('change', function () {
        settings.validationRules.showDontTell = $(this).prop('checked');
        saveSettings();
    });

    $('#story_guardian_rule_dialogue').prop('checked', settings.validationRules.dialogueNaturalness).on('change', function () {
        settings.validationRules.dialogueNaturalness = $(this).prop('checked');
        saveSettings();
    });
}

/**
 * Save settings
 */
function saveSettings() {
    extension_settings[extensionName] = settings;
    saveSettingsDebounced();
}

// Initialize on load
jQuery(async () => {
    await init();
});
