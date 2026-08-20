export interface OnboardingMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  choices?: string[] // Optional structured choices for the user to pick from
}

export interface OnboardingState {
  isComplete: boolean
  collectedData: {
    preferredName?: string
    focusArea?: string
    vibe?: string
  }
}

/**
 * Abstract service for the Day 2+ Onboarding Conversational engine (Sarvam 105B).
 * Currently mocked until backend exposes `/api/onboarding/conversation`.
 */
export class OnboardingService {
  private step = 0
  
  private mockScript: { content: string; choices?: string[] }[] = [
    {
      content: "Welcome. I am Mythri. What name should I call you?",
    },
    {
      content: "It is a pleasure to meet you. What brings you to this sanctuary today?",
      choices: ["I need a safe space to talk", "I want to understand my emotions better", "I am feeling overwhelmed", "Just exploring"]
    },
    {
      content: "I understand. I am here to listen without judgment. How would you like me to respond to you?",
      choices: ["Listen quietly", "Offer gentle guidance", "Ask deep questions"]
    },
    {
      content: "Thank you for sharing that with me. I will remember. Whenever you're ready, we can step into the sanctuary together.",
      choices: ["Let's begin"]
    }
  ]

  async sendMessage(userMessage: string): Promise<{ response: OnboardingMessage, state: OnboardingState }> {
    // Mock network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    const nextScript = this.mockScript[this.step]
    
    let isComplete = false
    if (this.step >= this.mockScript.length) {
      isComplete = true
    } else {
      this.step++
    }

    return {
      response: {
        id: Date.now().toString(),
        role: 'assistant',
        content: nextScript ? nextScript.content : "We are ready.",
        choices: nextScript?.choices
      },
      state: {
        isComplete: isComplete || (this.step >= this.mockScript.length && userMessage === "Let's begin"),
        collectedData: {}
      }
    }
  }

  async getInitialGreeting(): Promise<OnboardingMessage> {
    await new Promise(resolve => setTimeout(resolve, 1000))
    this.step = 1
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: this.mockScript[0].content,
    }
  }
}

export const onboardingService = new OnboardingService()
