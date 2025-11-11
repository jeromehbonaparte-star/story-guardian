# Story Guardian

A SillyTavern extension that validates and auto-corrects LLM outputs against storytelling guidelines.

## Features

### 🛡️ Real-Time Validation
- **Scene Ending Checker**: Detects forbidden reflective/philosophical endings
- **Show-Don't-Tell Validator**: Catches emotion labels and tells you to show instead
- **Dialogue Naturalness**: Checks for overly formal speech patterns
- **Pacing Monitor**: Ensures proper word count and paragraph structure

### 🔧 Auto-Correction
- Automatically removes problematic scene endings
- Marks emotion labels for revision
- Suggests concrete alternatives
- Works silently in the background or shows warnings

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
☑ Auto-correct violations
☑ Show warnings
☐ Strict mode

Validation Rules:
☑ Check scene endings
☑ Check show-don't-tell
☑ Check dialogue naturalness
```

### Default Guidelines

The extension comes with built-in storytelling guidelines based on best practices from high-quality fanfiction writers. You can customize these in the settings.

## How It Works

1. **Intercepts Messages**: Listens for AI responses before they're displayed
2. **Analyzes Content**: Runs validation rules against the text
3. **Detects Violations**: Identifies patterns that break guidelines
4. **Auto-Corrects** (optional): Removes/fixes problematic content
5. **Shows Warnings** (optional): Displays violations to user

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

1. **Scene Endings**: Removes last 1-2 sentences if they match forbidden patterns
2. **Emotion Labels**: Marks them with `[SHOW-DON'T-TELL: ...]` for manual revision
3. **Dialogue**: Suggests contractions (doesn't auto-fix to preserve intent)

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

**Not catching violations?**
- Enable strict mode for more aggressive checking
- Check that validation rules are enabled
- Verify the pattern exists in FORBIDDEN_PATTERNS

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
