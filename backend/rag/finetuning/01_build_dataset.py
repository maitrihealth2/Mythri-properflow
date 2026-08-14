"""
01_build_dataset.py
====================
Converts Mythri's knowledge docs into a supervised fine-tuning (SFT) dataset.

Produces:
  finetuning/data/train.jsonl   -- 80% split
  finetuning/data/eval.jsonl    -- 20% split

Each line is a ChatML-formatted conversation:
  {"messages": [{"role": "system", ...}, {"role": "user", ...}, {"role": "assistant", ...}]}

Run:
  python finetuning/01_build_dataset.py
"""

import json
import random
import pathlib
import re
import sys

BACKEND_ROOT = pathlib.Path(__file__).resolve().parent.parent
KNOWLEDGE_DIR = BACKEND_ROOT / "knowledge" / "docs"
EXISTING_JSONL_DIR = BACKEND_ROOT / "knowledge" / "finetuning_datasets"
OUTPUT_DIR = pathlib.Path(__file__).resolve().parent / "data"
OUTPUT_DIR.mkdir(exist_ok=True)

SYSTEM_PROMPT = (
    "You are Mythri, a warm and emotionally intelligent friend trained in evidence-based "
    "therapeutic approaches including CBT, DBT, ACT, and psychodynamic therapy. "
    "You understand Indian cultural contexts deeply. You respond in the user's chosen language only. "
    "You are not a clinician — you are a knowledgeable, caring companion."
)

# ---------------------------------------------------------------------------
# QA templates per therapeutic domain
# ---------------------------------------------------------------------------

CBT_QA = [
    ("What is Cognitive Behavioral Therapy?",
     "CBT is a structured, time-limited psychotherapy that focuses on the relationship between thoughts, feelings, and behaviors. It helps people identify and challenge distorted thinking patterns and replace them with more balanced, realistic thoughts."),
    ("What is cognitive restructuring in CBT?",
     "Cognitive restructuring is a core CBT technique where you identify an automatic negative thought, examine the evidence for and against it, and replace it with a more balanced alternative. For example, 'I always fail' becomes 'I didn't succeed this time, but I have succeeded before.'"),
    ("What are automatic negative thoughts?",
     "Automatic negative thoughts (ANTs) are involuntary, spontaneous thoughts that arise in response to situations, often distorted and negative. Common examples: 'I'm worthless,' 'Nothing ever works out for me,' or 'People always judge me.'"),
    ("What is behavioral activation in CBT?",
     "Behavioral activation is a CBT technique for depression where you schedule and engage in activities that provide a sense of accomplishment or pleasure, even when motivation is low. The idea is that action precedes mood — doing something positive can shift how you feel."),
    ("What are CBT thought distortions?",
     "Common cognitive distortions include: all-or-nothing thinking (seeing things in black and white), catastrophizing (assuming the worst will happen), mind reading (assuming you know what others think), personalization (blaming yourself for things outside your control), and overgeneralization (one bad event = a pattern)."),
    ("How does CBT handle anxiety?",
     "CBT treats anxiety by identifying anxious thoughts and testing their accuracy, using exposure techniques to gradually face feared situations, and building coping skills like controlled breathing and grounding exercises. The goal is to break the avoidance cycle that maintains anxiety."),
    ("What is a thought record in CBT?",
     "A thought record is a structured worksheet used in CBT to document a situation, the automatic thought it triggered, the emotional response, evidence for and against the thought, and a more balanced alternative thought. It builds awareness of thinking patterns over time."),
    ("What is Socratic questioning in CBT?",
     "Socratic questioning is a guided discovery technique used in CBT where the therapist asks a series of questions to help the client examine the logic and evidence behind their beliefs, rather than directly challenging them. The goal is self-discovery."),
    ("How does CBT help with depression?",
     "CBT for depression works by identifying negative thought patterns (like hopelessness and self-criticism), behavioral withdrawal (stopping enjoyable activities), and using techniques like behavioral activation, cognitive restructuring, and problem-solving to interrupt the depression cycle."),
    ("What is the cognitive triad in depression?",
     "Aaron Beck's cognitive triad describes three negative belief patterns common in depression: negative view of oneself ('I am worthless'), negative view of the world ('Everything is hopeless'), and negative view of the future ('Nothing will ever get better')."),
]

DBT_QA = [
    ("What is Dialectical Behavior Therapy?",
     "DBT is a skills-based therapy developed by Dr. Marsha Linehan, originally for borderline personality disorder but now used broadly. It balances acceptance (you are doing the best you can) with change (you can do better). It has four skill modules: mindfulness, distress tolerance, emotion regulation, and interpersonal effectiveness."),
    ("What are the four DBT skill modules?",
     "The four DBT modules are: (1) Mindfulness — being present without judgment; (2) Distress Tolerance — surviving crisis without making things worse; (3) Emotion Regulation — understanding and managing intense emotions; (4) Interpersonal Effectiveness — maintaining relationships while respecting yourself."),
    ("What is radical acceptance in DBT?",
     "Radical acceptance means fully accepting reality as it is, not as you wish it were, without fighting or judging it. It does not mean approving of what happened — it means stopping the suffering that comes from refusing to accept what you cannot change."),
    ("What is the TIPP skill in DBT?",
     "TIPP stands for Temperature (cold water on face to calm physiology), Intense exercise (burn off adrenaline), Paced breathing (slow exhale longer than inhale), and Paired muscle relaxation. It's used in DBT for rapidly reducing overwhelming emotional arousal."),
    ("What is DEAR MAN in DBT?",
     "DEAR MAN is a DBT interpersonal effectiveness skill: Describe the situation, Express your feelings, Assert your needs, Reinforce the other person for helping, stay Mindful of your objective, Appear confident, and Negotiate. It helps you ask for what you need while maintaining the relationship."),
    ("What is the DBT concept of 'wise mind'?",
     "Wise mind is the integration of the emotion mind (driven purely by feelings) and the rational mind (driven purely by logic). Wise mind is the balanced center where you honor both your emotions and your reason. DBT teaches you to make decisions from wise mind."),
    ("How does DBT handle self-harm urges?",
     "DBT uses distress tolerance skills to ride out self-harm urges without acting on them: TIPP for immediate regulation, ice cubes (intense cold sensation as a safe substitute), distraction techniques (the ACCEPTS skill), and crisis survival strategies. The urge is validated, not ignored."),
    ("What is the STOP skill in DBT?",
     "STOP stands for: Stop (don't act on impulse), Take a step back (breathe, create distance), Observe (what is happening inside and outside), Proceed mindfully (act from wise mind, not from emotion). It prevents impulsive reactions in heated moments."),
    ("What is interpersonal effectiveness in DBT?",
     "Interpersonal effectiveness in DBT focuses on three goals: getting what you want (objective effectiveness), maintaining the relationship (relationship effectiveness), and maintaining self-respect (self-respect effectiveness). Skills like DEAR MAN, GIVE, and FAST help balance these."),
    ("What is emotional validation in DBT?",
     "Validation means acknowledging that a person's emotions, thoughts, and behaviors make sense given their history and current situation, even if you don't agree with them. DBT teaches six levels of validation, from listening attentively to radical genuineness."),
]

ACT_QA = [
    ("What is Acceptance and Commitment Therapy?",
     "ACT is a third-wave cognitive behavioral therapy that teaches psychological flexibility — the ability to be fully present, open to experience, and act in ways consistent with your values, even in the presence of difficult thoughts and feelings. It does not try to eliminate painful thoughts but changes your relationship with them."),
    ("What are the six core processes of ACT?",
     "ACT's six processes are: (1) Acceptance — opening up to difficult feelings; (2) Cognitive Defusion — seeing thoughts as just thoughts; (3) Present Moment Awareness — being here, now; (4) Self-as-Context — the observing self; (5) Values — what truly matters to you; (6) Committed Action — taking steps toward values."),
    ("What is cognitive defusion in ACT?",
     "Cognitive defusion means creating psychological distance from your thoughts so they have less impact on behavior. Instead of 'I am a failure,' you say 'I am having the thought that I am a failure.' Techniques include saying thoughts in a funny voice, naming them as 'just stories,' or thanking your mind for the thought."),
    ("What is the ACT concept of values?",
     "In ACT, values are chosen directions of living that give life meaning — not goals to be achieved, but ongoing qualities of action. Examples: 'being a caring parent,' 'contributing to my community,' 'living with honesty.' Unlike goals, values are never finished."),
    ("What is experiential avoidance in ACT?",
     "Experiential avoidance is trying to suppress, escape, or avoid uncomfortable internal experiences (thoughts, feelings, memories, sensations). ACT sees this as a major cause of psychological suffering — the more you fight anxiety, the more it grows. Acceptance is the antidote."),
    ("How does ACT handle anxiety?",
     "ACT for anxiety teaches you to accept anxious feelings as normal experiences, defuse from fearful thoughts ('I am having the thought that something bad will happen'), stay grounded in the present, and take action aligned with your values despite the anxiety — not after it goes away."),
    ("What is the observing self in ACT?",
     "The observing self (self-as-context) is the awareness behind your thoughts and feelings — the 'you' that notices all your experiences but is not defined by any of them. It provides a stable, safe vantage point from which to observe even the most intense thoughts without being overwhelmed."),
    ("What is committed action in ACT?",
     "Committed action means taking concrete steps toward your values, even when your mind tells you not to, and even in the presence of difficult feelings. It means making and keeping commitments to valued behavior patterns, not waiting until you feel better to start living."),
    ("What is mindfulness in ACT?",
     "In ACT, mindfulness means flexible, present-moment awareness — noticing what is happening right now, inside and outside, without getting caught up in judging it or trying to change it. It supports all six ACT processes and builds psychological flexibility."),
    ("What is the 'passengers on the bus' metaphor in ACT?",
     "This ACT metaphor compares you to a bus driver: your thoughts and feelings are passengers who shout instructions and threats. You don't have to eject them or do what they say — you are the driver. You choose where the bus goes based on your values, regardless of what the passengers are saying."),
]

PSYCHODYNAMIC_QA = [
    ("What is psychodynamic therapy?",
     "Psychodynamic therapy is a depth-oriented approach rooted in psychoanalytic theory. It explores how unconscious processes, early childhood experiences, and unresolved conflicts shape current thoughts, feelings, and relationships. The relationship between therapist and client is itself a key therapeutic tool."),
    ("What is transference in psychodynamic therapy?",
     "Transference is when a client unconsciously redirects feelings, expectations, or desires from past relationships (often with parents) onto the therapist. For example, expecting the therapist to be critical like a harsh parent. Exploring transference patterns reveals core relational dynamics."),
    ("What is the unconscious in psychoanalytic theory?",
     "The unconscious contains thoughts, memories, desires, and conflicts that are outside conscious awareness but influence behavior and emotions. Psychodynamic therapy uses techniques like free association, dream analysis, and exploration of defense mechanisms to access unconscious material."),
    ("What are defense mechanisms?",
     "Defense mechanisms are unconscious psychological strategies used to protect the self from anxiety and painful emotions. Common ones include: repression (pushing painful memories out of awareness), denial (refusing to accept reality), projection (attributing your own feelings to others), and rationalization (creating logical explanations for irrational behavior)."),
    ("What is attachment theory?",
     "Attachment theory, developed by John Bowlby, proposes that early bonds with caregivers create 'internal working models' — templates for how relationships work. Secure attachment leads to trust and confidence; insecure attachment (anxious, avoidant, or disorganized) shapes adult relationship patterns."),
    ("What are the four attachment styles?",
     "The four adult attachment styles are: (1) Secure — comfortable with intimacy and independence; (2) Anxious-preoccupied — fears abandonment, needs reassurance; (3) Dismissive-avoidant — values independence, minimizes emotional needs; (4) Fearful-avoidant (disorganized) — wants closeness but fears it."),
    ("What is object relations theory?",
     "Object relations theory focuses on how early relationships with caregivers ('objects') are internalized and create mental representations of self and others. These internalized relationship patterns are re-enacted in adult relationships. Key theorists include Melanie Klein, Donald Winnicott, and Ronald Fairbairn."),
    ("What is countertransference?",
     "Countertransference is the therapist's emotional reaction to the client — feelings, thoughts, or fantasies evoked by the client that may relate to the therapist's own history. Modern psychodynamic therapy views it as useful information about the client's relational world, not just something to suppress."),
    ("What is the role of early childhood in psychodynamic therapy?",
     "Psychodynamic therapy holds that early experiences, particularly with primary caregivers, form the foundation of personality, emotional patterns, and relational styles. Unresolved conflicts or traumas from childhood often manifest as symptoms or relationship difficulties in adulthood."),
    ("What is working through in psychodynamic therapy?",
     "Working through is the gradual process of understanding and integrating unconscious conflicts, painful emotions, or traumatic memories through repeated exploration in therapy. It is not a single insight but a sustained process of revisiting and digesting difficult material until its emotional charge decreases."),
]

MINDFULNESS_QA = [
    ("What is mindfulness?",
     "Mindfulness is the practice of intentionally bringing attention to the present moment — thoughts, feelings, bodily sensations, and the environment — with curiosity and without judgment. It is rooted in Buddhist meditation traditions but is now widely used in secular therapeutic contexts."),
    ("What is the body scan meditation?",
     "A body scan is a mindfulness practice where you systematically move attention through different parts of the body, noticing sensations without trying to change them. It builds interoceptive awareness (sensitivity to internal body states) and helps with stress, anxiety, and dissociation."),
    ("What is grounding and how does it work?",
     "Grounding techniques bring your awareness back to the present moment when you feel overwhelmed, dissociated, or flooded with anxiety. The 5-4-3-2-1 technique is common: notice 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste. It anchors you to the here and now."),
    ("What is diaphragmatic breathing?",
     "Diaphragmatic (belly) breathing activates the parasympathetic nervous system, countering the stress response. You breathe deeply into the belly (not the chest), hold briefly, and exhale slowly. A 4-7-8 pattern (inhale 4, hold 7, exhale 8) is particularly effective for rapid anxiety reduction."),
    ("How does mindfulness help with depression?",
     "Mindfulness-Based Cognitive Therapy (MBCT) combines mindfulness with CBT specifically for recurrent depression. It teaches people to recognize the early warning signs of a depressive episode, observe negative thoughts without becoming swept away by them, and break the ruminative thinking cycles that deepen depression."),
]

INDIAN_CONTEXT_QA = [
    ("How does family pressure affect mental health in India?",
     "In India, family expectations around education, career, and marriage are deeply embedded in identity and social standing. When individuals feel they are falling short of these expectations, it can create chronic shame, anxiety, and depression — often without any language to name it. The fear of 'log kya kahenge' (what will people say) can prevent seeking help."),
    ("How can someone deal with parental pressure about career choices in India?",
     "This is one of the most common struggles. It helps to first separate your own values from your parents' expectations — what do *you* want, separate from the fear of disappointing them? Then, have honest conversations that honor their concern while asserting your needs. This is hard in cultures where parents' sacrifice feels like a debt."),
    ("Why is mental health stigma so strong in Indian families?",
     "Mental health is often seen in Indian families as a sign of weakness, family shame, or spiritual failure ('just pray more'). This makes it harder to seek help and easier to suffer in silence. The stigma is slowly changing, especially among younger generations, but it remains a significant barrier."),
    ("How does the pressure of competitive exams like JEE and NEET affect students?",
     "The pressure of JEE, NEET, and other entrance exams in India creates a narrow definition of worth — one exam, one chance, one path. Students who don't succeed often experience profound shame, loss of identity, and in severe cases, suicidal ideation. Families and society rarely acknowledge the mental health cost."),
    ("What is the loneliness of moving to a new city for work in India?",
     "Moving alone to cities like Bangalore, Mumbai, or Delhi for work is a deeply common and often lonely experience. Far from family, working long hours, in unfamiliar cultures — this can trigger anxiety, depression, and homesickness that few people talk about openly because 'you chose to go.'"),
]

EMOTIONAL_SUPPORT_QA = [
    ("What do I say to someone who is crying and doesn't know why?",
     "Sometimes emotions don't come with explanations, and that is okay. The right response is not to search for reasons immediately — it is to be present. Sit with them. Say: 'You don't have to explain anything. I'm just here with you.' Sometimes being witnessed is what matters most."),
    ("How do you support someone who has lost a loved one?",
     "Grief does not need to be fixed — it needs to be witnessed. Avoid saying 'at least' or 'they're in a better place.' Instead: be present, let them talk about the person they lost, bring food, handle practical things without being asked, and show up consistently over weeks and months, not just in the first few days."),
    ("What should I do when someone says they feel hopeless?",
     "Take it seriously and stay calm. Ask directly: 'Are you thinking about hurting yourself?' — this does not plant the idea, it opens space for honesty. Listen without trying to fix. Remind them that hopelessness is a feeling, not a fact. Connect them to professional support if needed. Stay with them."),
    ("How do I help someone who is having a panic attack?",
     "First, stay calm yourself — your nervous system is contagious. Don't tell them to 'calm down.' Instead: speak slowly and warmly, guide their breathing (breathe with them), offer grounding ('feel the floor under your feet'), and reassure them: 'This will pass. You are safe right now. I'm right here.'"),
    ("What does emotional validation actually mean in practice?",
     "Validation means communicating that a person's feelings make sense given their situation — not that you agree with what they did, but that their internal experience is understandable. Instead of 'you shouldn't feel that way,' say 'I can see why you'd feel that way given what happened.' It reduces shame and opens the door to real conversation."),
]


def make_example(question: str, answer: str, domain: str = "therapy") -> dict:
    """Create a single ChatML training example."""
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
            {"role": "assistant", "content": answer},
        ]
    }


def load_existing_jsonl() -> list[dict]:
    """Load the existing hand-crafted conversation examples."""
    examples = []
    for path in EXISTING_JSONL_DIR.glob("*.jsonl"):
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        ex = json.loads(line)
                        # Update system prompt to match current one
                        if ex.get("messages") and ex["messages"][0]["role"] == "system":
                            ex["messages"][0]["content"] = SYSTEM_PROMPT
                        examples.append(ex)
                    except json.JSONDecodeError:
                        pass
    print(f"  Loaded {len(examples)} existing conversation examples")
    return examples


def parse_txt_to_qa(filepath: pathlib.Path, max_pairs: int = 30) -> list[dict]:
    """
    Parse a .txt knowledge file into simple QA pairs using sentence chunking.
    Produces: "What does this passage discuss? -> [passage text]" style pairs.
    """
    text = filepath.read_text(encoding="utf-8", errors="ignore")
    # Split into paragraphs
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if len(p.strip()) > 80]
    examples = []
    domain_name = filepath.stem.replace("_", " ").title()

    for i, para in enumerate(paragraphs[:max_pairs]):
        # Create a natural question from the first sentence
        first_sentence = re.split(r"(?<=[.!?])\s+", para)[0]
        question = f"Can you explain this concept from {domain_name}? '{first_sentence[:100]}...'"
        examples.append(make_example(question, para, domain=domain_name))

    print(f"  Parsed {len(examples)} examples from {filepath.name}")
    return examples


def build_all_examples() -> list[dict]:
    all_examples = []

    # 1. Hand-crafted QA pairs
    print("\n[1] Building QA pairs from domain knowledge...")
    for domain_qa in [CBT_QA, DBT_QA, ACT_QA, PSYCHODYNAMIC_QA, MINDFULNESS_QA,
                       INDIAN_CONTEXT_QA, EMOTIONAL_SUPPORT_QA]:
        for question, answer in domain_qa:
            all_examples.append(make_example(question, answer))
    print(f"  Built {len(all_examples)} structured QA pairs")

    # 2. Existing JSONL examples
    print("\n[2] Loading existing conversation examples...")
    all_examples.extend(load_existing_jsonl())

    # 3. Parse .txt knowledge files
    print("\n[3] Parsing knowledge text files...")
    for txt_file in KNOWLEDGE_DIR.glob("*.txt"):
        all_examples.extend(parse_txt_to_qa(txt_file, max_pairs=20))

    return all_examples


def split_and_save(examples: list[dict], train_ratio: float = 0.85) -> None:
    random.seed(42)
    random.shuffle(examples)

    split_idx = int(len(examples) * train_ratio)
    train = examples[:split_idx]
    eval_ = examples[split_idx:]

    train_path = OUTPUT_DIR / "train.jsonl"
    eval_path = OUTPUT_DIR / "eval.jsonl"

    with open(train_path, "w", encoding="utf-8") as f:
        for ex in train:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    with open(eval_path, "w", encoding="utf-8") as f:
        for ex in eval_:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"\n[DONE] Dataset saved:")
    print(f"  Train: {len(train)} examples -> {train_path}")
    print(f"  Eval:  {len(eval_)} examples -> {eval_path}")
    print(f"  Total: {len(examples)} examples")


if __name__ == "__main__":
    print("=" * 60)
    print("Mythri Fine-Tuning Dataset Builder")
    print("=" * 60)
    examples = build_all_examples()
    split_and_save(examples)
    print("\nNext step: python finetuning/02_train.py")
