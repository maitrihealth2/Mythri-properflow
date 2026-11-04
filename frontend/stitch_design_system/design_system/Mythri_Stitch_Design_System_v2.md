---
document: Design System & Experience Specification
experience_focus: Minimal · Immersive · Human · Accessible
name: Mythri
primary_palette: 03 --- Espresso & Oat
status: Working specification for Stitch exploration
version: 02
---

# Mythri --- Design System & Experience Specification

## 1. Product direction

Mythri is a calm, private, conversation-first emotional-support
experience. It should feel like entering a quiet space where someone can
pause, talk, and reflect at their own pace.

> Do not design a mental-health dashboard. Design a place someone would
> want to stay when they are having a difficult day.

The product combines a restrained interface, an immersive environment, a
natural companion character, and text- or voice-based conversation. The
experience should feel premium, warm, mature, and human without
pretending that the AI is a licensed therapist or a real person.

### Core principles

-   **Conversation first:** Text and voice conversation are the primary
    interactions.
-   **Low visual density:** Introduce features progressively; avoid
    dashboards, competing cards, and persistent side panels.
-   **Immersive but optional:** The 3D room adds presence but must not
    be required to use core features.
-   **User agency:** Users can skip non-essential onboarding questions,
    correct assumptions, control memory, and leave immersive mode.
-   **Accessible by default:** Maintain readable UI, keyboard access,
    visible focus, reduced-motion support, and a complete 2D/text path.
-   **Honest support:** Describe Mythri as an AI emotional-support
    companion, not a human therapist or emergency service.

## 2. Brand and visual style

### Brand character

**Digital Sanctuary · Minimalism · Tactile Editorial**

Use exquisite but legible typography, generous whitespace, warm neutral
surfaces, deliberate visual hierarchy, restrained accents, and fine
borders. The interface should feel intimate and thoughtfully
crafted---like a well-made book or stationery---without becoming
decorative or difficult to use.

### Avoid

-   Analytics-heavy healthcare dashboards.
-   Game, metaverse, or avatar-first styling.
-   Excessive cards, floating panels, glassmorphism, blur, or heavy
    shadows.
-   Constant gradients, shimmer, parallax, or decorative motion without
    purpose.
-   A mascot-like or glossy synthetic character.
-   Clinical, judgmental, or overly certain language.
-   Using colour alone to convey meaning.

## 3. Primary colour palette --- 03 Espresso & Oat

The design-direction brief specifies **Palette 03 --- Espresso & Oat**
as the primary direction. The tokens below are the working values
documented in that brief. The palette artwork and token values must be
compared before production; do not silently substitute values from
another palette sheet.

  -----------------------------------------------------------------------
  Token                   Hex                     Intended use
  ----------------------- ----------------------- -----------------------
  Espresso                `#49362D`               Primary text, strong
                                                  controls, selected
                                                  states

  Mocha                   `#8B6250`               Secondary actions and
                                                  warm emphasis

  Caramel                 `#CBAF91`               Soft accents and
                                                  decorative material
                                                  references

  Oat                     `#F1E6D7`               Warm surfaces and quiet
                                                  section backgrounds

  Ivory                   `#FBF8F2`               Main canvas and page
                                                  background

  Ink                     `#2C2724`               Body text where extra
                                                  contrast is needed

  Muted                   `#756A62`               Secondary text; verify
                                                  contrast before use

  Border                  `#E3D8CC`               Dividers, input
                                                  outlines, subtle
                                                  boundaries
  -----------------------------------------------------------------------

### Colour usage

-   Use Ivory and Oat as the dominant visual field.
-   Use Espresso and Ink for text and structure.
-   Keep accent colours restrained.
-   Blue may be used for a familiar, high-salience interaction cue where
    appropriate, but must not replace the selected palette.
-   Reserve semantic colours for their functional meaning.
-   Provide explicit tokens for light and dark surfaces, text, borders,
    chat, focus, disabled, error, and success states.
-   Validate all final foreground/background pairs against WCAG contrast
    requirements. A palette image is not proof of accessibility.

### Light and dark themes

Create a complete light and dark theme. Dark mode should use deep warm
neutrals rather than a simple inversion of light mode. Keep text
readable and controls distinguishable in both modes.

Required token families:

-   Page background, surface, raised surface, and inverse surface.
-   Primary, secondary, and muted text.
-   Primary and secondary actions, including their text colours.
-   Borders, dividers, input backgrounds, and placeholders.
-   Selected, hover, pressed, focus, disabled, loading, success,
    warning, and error states.
-   User and AI message treatments.
-   Crisis-support panel and action colours.

Exact dark-mode and semantic values are not fully specified in the
design-direction brief. Define and contrast-test them during
design-system implementation rather than inventing them as approved
brand values.

## 4. Typography

The existing Stitch specification uses **Literata** throughout to
reinforce Mythri's literary character. Retain it as the current
direction for exploration, but test long-form reading, UI density, and
multilingual rendering before finalising.

### Type scale from the current Stitch MD

  Style                   Typeface     Size   Weight   Line height
  ----------------------- ---------- ------ -------- -------------
  Display large           Literata     48px      500           1.2
  Headline large          Literata     32px      500           1.3
  Headline medium         Literata     24px      500           1.4
  Body large              Literata     18px      400           1.7
  Body medium             Literata     16px      400           1.7
  Body small              Literata     14px      400           1.6
  Label medium            Literata     14px      500           1.2
  Indic body medium       Literata     16px      400           1.9
  Mobile headline large   Literata     28px      500           1.3

### Typography rules

-   Use sentence case for headings, buttons, labels, and messages.
-   Keep reading text regular and structural emphasis medium.
-   Use generous line-height for emotional-support content.
-   Keep line lengths comfortable; target approximately 60--75
    characters on desktop.
-   Verify support for Telugu, Tamil, Hindi, English, and mixed-script
    content. If Literata does not render a script correctly, provide a
    suitable script-specific fallback rather than allowing broken
    glyphs.

## 5. Layout, spacing, surfaces, and shape

### Grid and spacing

  Token                 Value
  ------------------- -------
  Base spacing unit       4px
  Desktop margin         64px
  Mobile margin          20px
  Standard gutter        24px
  Small stack            12px
  Medium stack           24px
  Large stack            48px

-   Desktop: use a 12-column grid with wide margins.
-   Mobile: use a 4-column grid with 20px margins.
-   Use whitespace to separate thoughts and sections.
-   Keep the conversation in a focused central region.
-   Preserve stable reading position during transitions.

### Surfaces and borders

-   Prefer tonal layering and fine borders to heavy shadows.
-   Use a 1px border based on the semantic border token.
-   Separate interactive areas through surface tone and clear state
    changes.
-   Keep cards and static containers restrained; do not place every
    feature inside a card.
-   The existing Stitch MD specifies 12px card corners.

### Shape tokens from the existing Stitch MD

  Token                    Value
  -------------------- ---------
  Small radius           0.25rem
  Default radius          0.5rem
  Medium radius          0.75rem
  Large radius              1rem
  Extra-large radius      1.5rem
  Full/pill               9999px

Use the shape system consistently. Buttons and inputs may use pill
shapes where they improve usability, but avoid making the entire
interface feel overly rounded or childish.

## 6. Experience flow

The product journey should tell a story:

**Arrival → Welcome → Conversational onboarding → Personalisation →
Transition → Personal space → Conversation → Contextual support →
Reflection**

  -----------------------------------------------------------------------
  Stage             User experience   UI behaviour      Motion
  ----------------- ----------------- ----------------- -----------------
  01\. Arrival      Opens Mythri      Minimal brand     Soft fade or
                                      introduction and  restrained text
                                      short tagline     reveal

  02\. Welcome      Understands the   One message and   Gentle transition
                    purpose           one clear         
                                      continue action   

  03\.              Shares basic      Ask one question  Subtle prompt
  Conversational    information       at a time; free   transition
  onboarding                          text first        

  04\.              Chooses support   A few optional    Quiet, clear
  Personalisation   preference        choices; allow    selection state
                                      skipping          

  05\. Transition   Moves into        Interface reduces Slow dissolve or
                    personal space    as environment    environmental
                                      appears           reveal

  06\. Personal     Arrives in the    Minimal           Subtle lighting
  space             room              orientation and   or ambience
                                      session controls  

  07\. Conversation Talks or types    Conversation      Small, functional
                                      remains the       response
                                      primary focus     indicators

  08\. Contextual   Chooses an        Offer one         Gentle reveal; no
  support           exercise or       relevant next     stacked pop-ups
                    reflection        step at a time    

  09\. Reflection   Reviews or saves  Journal and       Simple return
                    a thought         insights          transition
                                      available when    
                                      wanted            
  -----------------------------------------------------------------------

### Navigation principle

Keep the active session visually quiet. Journal, Resources, Insights,
history, and settings should remain available without being permanently
displayed beside the conversation.

## 7. Conversational onboarding

Onboarding should feel like meeting Mythri, not completing a
registration form. Ask only what is needed, explain why sensitive
information is requested, and allow users to skip non-essential
questions.

  -----------------------------------------------------------------------
  Step                    Suggested copy          Input and behaviour
  ----------------------- ----------------------- -----------------------
  Welcome                 "Hi, I'm Mythri. This   One primary action:
                          is a space to pause,    Begin
                          talk, and reflect at    
                          your own pace."         

  Name                    "What would you like me Free text; skipping
                          to call you?"           allowed

  Reason for coming       "What brings you here   Optional free text and
                          today?"                 suggestions such as
                                                  stress, sleep,
                                                  relationships, work, or
                                                  something else

  Current need            "What would feel most   Optional choices: talk
                          helpful right now?"     it through, reflect,
                                                  try an exercise,
                                                  explore resources

  Preferences             "Would you prefer to    Text, voice, or either;
                          type, speak, or use     changeable later
                          either?"                

  Transition              "Your space is ready.   Enter the main
                          We can begin whenever   experience without a
                          you are."               forced breathing
                                                  exercise
  -----------------------------------------------------------------------

### Onboarding rules

-   One primary question per view.
-   Show progress unobtrusively.
-   Allow back, skip, and return where appropriate.
-   Preserve typed answers after navigation or recoverable errors.
-   Use plain language rather than clinical terminology.
-   Do not treat preferences or onboarding answers as a diagnosis or
    clinical assessment.
-   Do not collect deeper personal information simply because it is
    technically possible.

## 8. Immersive 3D environment and companion

### Environment direction

  -----------------------------------------------------------------------
  Element                             Requirement
  ----------------------------------- -----------------------------------
  Point of view                       Seated, first-person perspective;
                                      the user should feel present in the
                                      room

  Composition                         Companion sits naturally opposite
                                      the user at a comfortable visual
                                      distance

  Materials                           Natural wood, fabric, stone, and
                                      warm neutral finishes; restrained
                                      detail

  Lighting                            Soft daylight or warm ambient
                                      light; stable exposure and readable
                                      UI

  Objects                             A small number of meaningful
                                      objects, such as a chair, table,
                                      books, or window

  Movement                            Subtle environmental movement only;
                                      no unnecessary camera drift, zoom,
                                      or parallax

  UI integration                      Controls feel connected to the
                                      space while remaining legible and
                                      easy to operate

  Fallback                            A 2D conversation mode with the
                                      same essential features
  -----------------------------------------------------------------------

### Companion character

-   Explore a lifelike or subtly stylised adult human character with
    natural proportions and an approachable expression.
-   Avoid cartoon/mascot styling, exaggerated expressions, or a glossy
    synthetic appearance.
-   Use subtle breathing, eye movement, and posture changes; avoid
    constant animation.
-   Keep speech and facial movement coherent. If high-quality lip-sync
    is not possible, use a less distracting presentation.
-   Never imply that the user is speaking to a real licensed
    psychologist.

### Comfort and control

-   Avoid rapid camera moves, simulated head movement, and forced
    perspective shifts.
-   Do not place essential text over visually complex parts of the
    scene.
-   Make pause/end, mute, switch to text, and exit immersive mode easy
    to find.
-   Respect reduced-motion preferences and provide a static or dissolve
    alternative.

## 9. Core UI components

### Navigation

Keep Chat/Conversation primary. Journal, Resources, Insights, history,
and settings are secondary destinations. Navigation should be small,
quiet, and easy to reach.

### Conversation layout

The existing Stitch MD describes a **Stream of Thought** layout:
messages do not use conventional chat bubbles. Instead, use generous
vertical spacing, subtle indentation, and clear author labels.

-   Keep readable line lengths and generous vertical spacing.
-   Make speaker distinction clear without relying on colour alone.
-   Avoid oversized messages or excessive message chrome.
-   Keep the composer persistent and easy to reach without obscuring
    content.
-   Support text and voice.
-   Show clear listening, thinking, paused, and error states.

### Component requirements

  -----------------------------------------------------------------------
  Component                           Specification
  ----------------------------------- -----------------------------------
  Primary action                      One primary CTA per step; verb-led
                                      labels; visible focus and disabled
                                      states

  Secondary action                    Visually quieter than the primary
                                      action

  Message composer                    Text/voice support, clear focus,
                                      does not obscure messages

  Quick replies                       Optional, concise, easy to dismiss
                                      or change

  Contextual intervention             One relevant suggestion at a time;
                                      briefly explain why; never force an
                                      exercise

  Session controls                    Pause/end, mute, switch to text,
                                      and leave immersive mode are easy
                                      to locate

  Journal save                        Explicit and optional; make it
                                      clear what will be saved

  Insights                            Secondary destination; distinguish
                                      user-reported information from
                                      system-generated inference

  Notifications and errors            Plain language, actionable recovery
                                      step, no shame or blame
  -----------------------------------------------------------------------

### Required interaction states

Design and document:

-   Default, hover, pressed, selected, focused, disabled, loading,
    success, and error.
-   Microphone permission denied and voice input unavailable.
-   Network interruption and response-generation delay.
-   User pauses or ends a session.
-   User switches from immersive 3D to 2D chat.
-   User skips an onboarding question.
-   System is uncertain about an emotional inference and invites
    correction rather than asserting a conclusion.

## 10. Motion language

  -----------------------------------------------------------------------
  Moment                  Direction               Guardrail
  ----------------------- ----------------------- -----------------------
  Brand reveal            Opacity fade; optional  Do not delay access to
                          subtle letter reveal    the product

  Onboarding prompt       Soft fade or slight     Keep reading position
                          vertical settle         stable

  Answer submitted        Small, clear state      Do not animate every
                          transition              keystroke

  Transition to room      Slow dissolve or        Provide reduced-motion
                          environmental reveal    alternative

  Character idle          Subtle breathing and    Avoid constant movement
                          eye movement            or uncanny expressions

  Contextual action       Gentle fade or slide    No stacked pop-ups or
                          into view               interruptions

  Error state             Static highlight or     No shaking or alarming
                          concise inline message  red flash
  -----------------------------------------------------------------------

**Motion test:** Every animation must communicate a state change,
establish the experience, or support orientation. If it does none of
these, remove it.

## 11. Accessibility baseline

Target **WCAG 2.2 AA** for the web interface.

-   Normal text contrast: at least 4.5:1.
-   Large text contrast: at least 3:1.
-   Meet applicable non-text contrast requirements for meaningful
    controls, boundaries, and states.
-   Support keyboard navigation, visible focus, semantic headings,
    accessible labels, logical screen-reader order, and text resizing.
-   Respect operating-system reduced-motion preferences.
-   Provide a 2D fallback for the immersive experience.
-   Provide captions/transcripts for spoken content and a complete text
    interaction path.
-   Test Telugu, Tamil, Hindi, and English rendering, text expansion,
    transcription errors, and mixed-script layouts.
-   Verify actual colour combinations in the implemented components; do
    not assume the palette is accessible based on appearance.

## 12. Privacy, agency, and mental-health safety

### Privacy and user agency

-   Explain what information is collected, why it is needed, and how it
    is used.
-   Make memory, personalisation, and deletion controls understandable
    and easy to reach.
-   Do not imply confidentiality or clinical protection beyond what the
    system actually provides.
-   Do not save journal entries or share conversation content without
    clear user understanding and control.

### Mental-health safety

-   Clearly identify Mythri as an AI emotional-support companion, not a
    human therapist or emergency service.
-   Define and review a pathway for crisis disclosures and urgent safety
    needs, with appropriate human or emergency resources.
-   Do not present emotion estimates as diagnoses or definitive
    statements about the user's mental state.
-   Use tentative language when uncertain and allow the user to correct
    the system.
-   Do not rely on colour alone for crisis, warning, success, or
    selection states.
-   Keep support actions clear and accessible in both immersive and 2D
    modes.

## 13. Do and do not

  -----------------------------------------------------------------------
  Do                                  Do not
  ----------------------------------- -----------------------------------
  Use whitespace and clear hierarchy  Fill the screen with cards and
                                      statistics

  Let the room provide atmosphere     Cover the room with floating UI
                                      panels

  Keep the character naturally        Make the character a mascot or
  present                             spectacle

  Use motion to guide transitions     Add constant parallax, shimmer, or
                                      floating objects

  Reveal support options contextually Show every feature at once

  Keep text and controls accessible   Sacrifice legibility for cinematic
                                      styling

  Offer a 2D alternative              Make 3D mandatory for core tasks

  Use empathetic, plain language      Make the AI sound certain about
                                      inferred emotions
  -----------------------------------------------------------------------

## 14. Expected design deliverables

1.  Figma file with documented page structure and reusable components.
2.  Colour tokens, typography styles, spacing scale, borders, elevation,
    and semantic state tokens.
3.  Opening/splash experience and motion prototype.
4.  Complete conversational onboarding flow, including skip, back,
    error, and incomplete states.
5.  3D environment concept and point-of-view composition study.
6.  Character design exploration with realistic-but-approachable
    direction and motion tests.
7.  Text and voice conversation UI, including active, listening,
    thinking, paused, and error states.
8.  Contextual intervention components for reflection, breathing
    exercises, journal, and resources.
9.  Journal, Resources, and Insights secondary screens.
10. Responsive layouts for desktop and smaller screens.
11. Accessibility variants: keyboard focus, large text, reduced motion,
    and 2D fallback.
12. Clickable prototype demonstrating the journey from first launch to
    an active conversation.
13. Short design rationale documenting key decisions and open questions.

## 15. Design references

Use these as inspiration sources, not templates to copy.

-   **Opal:** Study visual restraint, typography, hierarchy, and
    selective use of gradients or 3D assets. Translate restraint into
    Mythri's own palette rather than copying Opal's colours.
-   **Heyday:** Study storytelling, identity systems, and coherent
    product presentation. Confirm the exact reference intended by the
    team before making reference-specific decisions.
-   **Apple Human Interface Guidelines:** Use for interaction clarity,
    concise copy, accessibility, and restrained motion---not as a
    mandate to imitate Apple's styling.
-   **WCAG 2.2:** Use as the accessibility baseline for contrast,
    keyboard access, focus visibility, and interaction accessibility.

## 16. Open questions for design review

-   Should the 3D room be the default experience or an optional
    immersive mode after onboarding?
-   What level of character realism can be achieved without uncanny
    facial behaviour or excessive rendering cost?
-   Should default room lighting be daylight, late-afternoon warmth, or
    user-selectable?
-   How should the character and interface adapt to portrait/mobile
    layouts?
-   What information is truly necessary during onboarding, and what can
    be learned gradually?
-   How will the product communicate the AI's role, memory behaviour,
    privacy limits, and crisis-support boundaries?
-   What is the minimum viable version of the immersive experience that
    can be tested with users?
-   Has Espresso & Oat been approved as the primary palette, and which
    source file governs the final hex values?

## 17. Definition of success

A user can understand how to begin, start talking without navigating a
dashboard, remain in control of the experience, and switch to a simpler
interface at any time.

------------------------------------------------------------------------

**Implementation note:** This is a consolidated working specification
based on the supplied Mythri UI/UX Design Direction Brief and the
existing Stitch `DESIGN.md`. Where the sources differ or leave a value
unspecified, the discrepancy is identified for review rather than
silently resolved. Confirm exact palette tokens, font rendering, and
accessibility contrast in Figma before implementation.
