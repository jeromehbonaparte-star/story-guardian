# Story Guardian

A SillyTavern extension that validates and auto-corrects LLM outputs against storytelling guidelines.

## Features

### 🛡️ Real-Time Validation
- **Scene Ending Checker**: Detects forbidden reflective/philosophical endings
- **Show-Don't-Tell Validator**: Catches emotion labels and tells you to show instead
- **Dialogue Naturalness**: Checks for overly formal speech patterns
- **Pacing Monitor**: Ensures proper word count and paragraph structure

### 🔧 LLM-Powered Auto-Correction
- **Fully Automated**: Uses your current LLM connection to intelligently rewrite violations
- **Scene Endings**: Replaces reflective/philosophical endings with concrete action, dialogue, or sensory details
- **Show-Don't-Tell**: Transforms emotion labels into physical sensations and body language
- **Dialogue**: Makes speech more natural with appropriate contractions
- **Minimal Changes**: Only fixes what's broken, preserves your character voice and POV
- **Real-Time Notifications**: Shows success message when corrections are applied

### ⚙️ Customizable Rules
- Enable/disable specific validation rules
- Strict mode for aggressive checking
- Toggle auto-correction on/off
- Show/hide warnings

## Installation

1. Place the `story-guardian` folder in your SillyTavern extensions directory:
   ```
   SillyTavern/public/scripts/extensions/third-party/story-guardian/
   ```

2. Refresh SillyTavern or restart the server

3. Go to **Extensions** → **Story Guardian** to configure

## Usage

### Basic Setup

1. Enable the extension in settings
2. Choose which validation rules to apply
3. Decide if you want auto-correction or just warnings
4. **Important**: Auto-correction uses your currently selected LLM connection to intelligently rewrite violations

### Testing Mode

Enable "Show notification when no violations found" to verify the extension is working properly. You'll see a success message after each AI response if no guideline violations are detected.

### Validation Rules

#### Scene Endings (CRITICAL)
Detects and corrects:
- ✗ "One day at a time" platitudes
- ✗ Philosophical reflections about the future
- ✗ "This was X and I was going to Y" patterns
- ✗ Thematic statements and life lessons
- ✓ Requires: Concrete action, dialogue, sensory detail, or interruption

**Example Bad Ending:**
```
And I would do everything in my power to protect that. One day at a time.
Starting with a bath and some clean clothes. Even gods had to handle the basics first.
```

**Example Good Ending:**
```
I grabbed a towel from the closet and turned on the shower, already peeling off my shirt.
```

#### Show, Don't Tell
Catches emotion labels like:
- "I felt angry" → Show through clenched fists, sharp tone, etc.
- "She seemed sad" → Show through slumped shoulders, quiet voice, etc.
- "I was terrified" → Show through racing heart, frozen muscles, etc.

#### Dialogue Naturalness
Checks for:
- Overly formal speech ("I am" vs "I'm")
- Missing contractions in casual conversation
- Unnatural speech patterns

### Strict Mode

When enabled, applies additional checks:
- Requires at least ONE concrete ending element
- Flags abstract/vague endings even without forbidden patterns
- More aggressive emotion label detection

## Configuration

### Settings Panel

```
☑ Enable Story Guardian
☑ Auto-correct violations (uses LLM to rewrite violations)
☑ Show warnings (displays violation details)
☑ Show notification when no violations found (testing mode)
☐ Strict mode (more aggressive checking)

Validation Rules:
☑ Check scene endings
☑ Check show-don't-tell
☑ Check dialogue naturalness
```

### Default Guidelines

The extension comes with built-in storytelling guidelines based on best practices from high-quality fanfiction writers. You can customize these in the settings.

## How It Works

1. **Intercepts Messages**: Listens for AI responses as they're received (MESSAGE_RECEIVED and MESSAGE_SWIPED events)
2. **Analyzes Content**: Runs validation rules against the text using pattern matching
3. **Detects Violations**: Identifies patterns that break storytelling guidelines
4. **LLM Auto-Correction** (optional): Sends violations to your current LLM with specific rewriting instructions
5. **Updates Message**: Replaces the original text with the corrected version and saves to chat
6. **Notifications**: Shows success message when corrections are applied, or warnings for violations in warning-only mode

## Technical Details

### Validation Engine

```javascript
// Scene ending check
FORBIDDEN_PATTERNS = [
    /one day at a time/gi,
    /(I|we|they) (would|will|must) .*(protect|ensure)/gi,
    /even (gods|people) (had to|must)/gi,
    // ... more patterns
]

// Good ending indicators
GOOD_ENDING_TYPES = {
    physicalAction: ['grabbed', 'reached', 'turned', ...],
    dialogue: ['"', 'said', 'asked', ...],
    sensory: ['heard', 'saw', 'felt', ...],
    interruption: ['door opened', 'phone rang', ...]
}
```

### Auto-Correction Process

The extension uses **intelligent LLM-powered rewriting** to fix violations automatically:

1. **Detection Phase**: Analyzes message for violations using regex patterns
2. **Correction Prompt**: Builds a specialized prompt with:
   - Original text
   - List of specific violations found
   - Detailed rewriting instructions (e.g., "Replace reflective ending with concrete action")
   - Guidelines to preserve POV, tense, and character voice
3. **LLM Rewriting**: Calls `generateRaw()` using your current LLM connection
4. **Validation**: Ensures the corrected text is different and non-empty
5. **Application**: Updates message in chat history and DOM
6. **Fallback**: If LLM fails, uses simple pattern-based fixes (removes problematic sentences)

**Example Correction Prompt Sent to LLM:**
```
ORIGINAL TEXT:
[Your message with violations]

VIOLATIONS FOUND:
- scene_ending: Scene ending contains forbidden reflective/philosophical pattern
  Problem text: "One day at a time. Even gods had to..."

INSTRUCTIONS:
1. Fix ALL violations completely and automatically
2. For scene endings: Replace reflective/philosophical endings with concrete
   action, dialogue, sensory detail, or interruption
3. Keep the same POV, tense, and character voice
4. Make minimal changes - only fix what's broken

Return ONLY the corrected text, nothing else.
```

## Development

### File Structure
```
story-guardian/
├── manifest.json       # Extension metadata
├── index.js           # Main validation logic
├── style.css          # UI styling
└── README.md          # Documentation
```

### Adding New Rules

```javascript
// In index.js
const NEW_PATTERN = /your pattern here/gi;

function checkNewRule(text) {
    const violations = [];
    // Your validation logic
    return violations;
}

// Add to analyzeMessage()
if (settings.validationRules.yourRule) {
    const newViolations = checkNewRule(text);
    violations.push(...newViolations);
}
```

## Troubleshooting

**Extension not loading?**
- Check browser console for errors
- Verify file paths are correct
- Ensure manifest.json is valid JSON

**Auto-correction too aggressive?**
- Disable auto-correct and use warning-only mode
- Turn off strict mode
- Disable specific rules you don't need
- Note: The LLM tries to make minimal changes - if results seem off, check your LLM connection

**Not catching violations?**
- Enable strict mode for more aggressive checking
- Check that validation rules are enabled
- Enable "Show notification when no violations found" to verify extension is running
- Check browser console for "[Story Guardian]" debug logs

**Messages not being corrected?**
- Check browser console for "[Story Guardian]" logs to see if corrections are being attempted
- Verify your LLM connection is working (try a normal message)
- Ensure "Auto-correct violations" is enabled in Extensions tab
- The extension uses `generateRaw()` which requires an active LLM API connection

## Credits

- Based on storytelling guidelines from high-kudos AO3 writers
- Inspired by the SillyTavern extension ecosystem
- Built with the RPG Companion extension as reference

## License

MIT License - Feel free to modify and distribute

## Version History

### 1.0.0 (2025-11-11)
- Initial release
- Scene ending validation
- Show-don't-tell checker
- Dialogue naturalness validator
- Auto-correction system
- Configurable rules and settings
