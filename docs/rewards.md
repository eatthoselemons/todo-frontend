# Reward System Design

## Core Philosophy
- **Immediate > Delayed**: ADHD brains need instant feedback
- **Clear > Ambiguous**: Make success unmistakable
- **Compassionate > Punitive**: Never punish gaps or mistakes
- **Flexible > Rigid**: Users control intensity and style

## 1. Grace Period System (Preventing Accidental Completion)

### Desktop Behavior
- **Toast notification** with 5-second countdown progress bar
- Text: "Task moving to Done [Undo]"
- **Visual transition**:
  - Root tasks: Slide right with fade
  - Subtasks: Subtle pop/fade effect
- Task stays in Active view during grace period
- Moves to Done tab only after timer expires

### Mobile Behavior
- **Hold-to-confirm** for root tasks (1.5 second hold)
- Visual: Ring fills around task as you hold
- Haptic feedback on confirmation
- Same grace period toast as fallback

### Liquid Animation During Grace
- Progress bar fills with animated liquid effect
- Colors based on task state (green for done, blue for progress)
- On confirmation: Liquid "bursts" into completion animation

## 2. Reward Systems Architecture

### Settings Structure
```
Settings > Rewards
├── Reward System: [ON/OFF]
├── Intensity: [None | Minimal | Standard | Extra Juicy]
├── Theme Selection (future)
│   ├── Adventure (XP for character)
│   ├── City Builder (coins)
│   ├── Space Explorer (stars)
│   └── Minimal (liquid only)
└── Advanced Settings
    ├── Animations: [ON/OFF]
    ├── Sounds: [ON/OFF]
    ├── Haptics: [ON/OFF]
    └── Streak Tracking: [ON/OFF]
```

### Reward Tiers

#### Micro Rewards (Every Subtask)
- **Timing**: 250-400ms
- **Minimal**: Checkbox morph + subtle glow
- **Standard**: + Small sparkle burst (4-6 particles)
- **Extra Juicy**: + Sound chime + haptic tap
- **Currency**: +1 point (coins/XP/stars based on theme)

#### Medium Rewards (Branch Complete)
- **Timing**: 700-1000ms
- **Visual**: Parent node fills with liquid animation
- **Minimal**: Just the liquid fill
- **Standard**: + 3-5 coins arc to wallet + "Branch complete: {name}"
- **Extra Juicy**: + Radial completion wave + sound
- **Currency**: +10 points

#### Major Rewards (Root Task Complete)
- **Timing**: 1200-1600ms
- **Minimal**: Liquid celebration + badge
- **Standard**: + Screen confetti (top 1/3 only, doesn't block UI)
- **Extra Juicy**: + Full animation + sound + haptic pattern
- **Currency**: +50 points
- **Optional**: "Take a break?" prompt

## 3. Liquid Animations (Performance-Optimized)

### Implementation Strategy
- Use CSS animations (GPU-accelerated)
- SVG filters for liquid effects
- Precompiled keyframes
- React.memo to prevent re-renders
- RequestAnimationFrame for smooth transitions

### Liquid Effects
1. **Progress fill**: Animated wave as tasks complete
2. **Node completion**: Liquid "fills up" parent node
3. **Celebration splash**: Liquid burst on major completion
4. **Background ambience**: Subtle liquid movement in completed areas

## 4. Comeback-Friendly Mechanics

### Instead of Streaks
- **Rolling targets**: "4 active days this week"
- **Lifetime stats**: Total tasks never reset
- **Fresh start prompts**: "New week, clean slate!"
- **Re-entry tasks**: 3 suggested micro-tasks after absence

### Welcome Back System
After 3+ days inactive:
- Gentle notification: "Welcome back! Start with something tiny"
- Special "return bonus" animation on first task
- No mention of gap or "streak broken"
- Optional: Suggest easiest incomplete task

## 5. PouchDB Storage Schema

```javascript
// User settings document
{
  _id: 'settings',
  rewards: {
    enabled: true,
    intensity: 'standard', // none|minimal|standard|extra
    theme: 'minimal', // minimal|adventure|city|space
    animations: true,
    sounds: true,
    haptics: true,
    streaks: false
  }
}

// User progress document
{
  _id: 'progress',
  points: 0,
  level: 1,
  totalTasks: 0,
  tasksByDay: {},
  lastActive: '2024-01-20',
  longestStreak: 0,
  currentStreak: 0
}

// Rewards log for analytics
{
  _id: 'reward_[timestamp]',
  type: 'micro|medium|major',
  taskId: 'task_id',
  points: 1,
  timestamp: Date.now()
}
```

## 6. Component Architecture

```typescript
// Core components
<RewardProvider> // Context for settings & state
  <GracePeriodToast /> // Undo system
  <RewardAnimation /> // Renders current reward
  <ProgressTracker /> // Points/level display
</RewardProvider>

// Animation components (lazy loaded)
<SparkleEffect size="micro|medium|major" />
<LiquidFill progress={0-100} />
<Confetti intensity="minimal|standard|extra" />

// Settings components
<SettingsPage>
  <RewardsPanel />
  <IntensitySlider />
  <ThemeSelector /> // Future
</SettingsPage>
```

## 7. Performance Guidelines

### Do's
- Use CSS transforms and opacity (GPU-accelerated)
- Batch DOM updates with requestAnimationFrame
- Preload sounds and cache animations
- Use CSS containment for animation areas
- Throttle particle generation

### Don'ts
- Avoid JavaScript-based position calculations
- Don't animate width/height directly
- Avoid creating/destroying DOM nodes rapidly
- Don't block user input during animations

## 8. Implementation Phases

### Phase 1 (MVP) - Current Sprint
1. Grace period with undo
2. Basic settings page with ON/OFF toggle
3. Sparkle animation for completion
4. PouchDB storage setup

### Phase 2
1. Liquid fill animations
2. Intensity slider (minimal/standard/extra)
3. Sound effects (Web Audio API)
4. Mobile haptics

### Phase 3
1. Theme system (adventure/city/space)
2. Points and level tracking
3. Welcome back system
4. Advanced settings

### Phase 4
1. Achievement badges
2. Customizable celebrations
3. Analytics dashboard
4. A/B testing framework

## 9. Accessibility

- All animations respect `prefers-reduced-motion`
- Screen reader announcements for rewards
- Keyboard navigation for all controls
- High contrast mode support
- Option to disable each sensory channel independently

## 10. Success Metrics (Optional Future)

If user opts in:
- Track completion rates by reward intensity
- Measure return frequency after gaps
- Compare task depth with/without rewards
- NO pressure metrics, only positive reinforcement