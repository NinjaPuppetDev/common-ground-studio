/**
 * Canonical Provider Profile for David Raigoza / Lightweight Studio
 * Reference Source: https://davidraigoza.design/work-with-me
 * 
 * Core Proposition:
 * "I help early-stage product teams turn complex ideas into clear, working products."
 * 
 * Solves the gap between:
 * product thinking → architecture → design → engineering → deployment
 */

import { ProviderProfile } from "../../../packages/contracts/v1/provider.js";

export const DAVID_RAIGOZA_PROVIDER_PROFILE: ProviderProfile = {
  id: "david-raigoza",
  name: "David Raigoza / Lightweight Studio",
  title: "Product Design Engineer & Lightweight Studio",
  valueProposition: "I help early-stage product teams turn complex ideas into clear, working products.",
  gapSolved: "The gap between product thinking → architecture → design → engineering → deployment. Keeps strategy, design, and engineering connected rather than divided across multiple disconnected specialists or traditional agency layers.",
  
  primaryProblemContexts: [
    {
      id: "PRODUCT_AMBIGUITY",
      title: "Product Ambiguity",
      description: "The company has a product idea, concept, technology, or complex system that needs to become a coherent, clear, buildable product.",
      problemSignals: [
        "Unclear product direction or positioning in technical copy",
        "Working prototype without a clear conceptual model or user workflow",
        "Technical capability or complex infrastructure without a coherent user experience",
        "Founder or core team struggling to determine what should actually be designed and built next",
        "Abstract or ambitious product concept that needs to become tangible and testable"
      ],
      solutionMechanism: "Acts as a strategic product partner combining product strategy, systems architecture, and rapid prototyping to turn ambiguity into a well-defined, buildable product model."
    },
    {
      id: "PRODUCT_BUILD",
      title: "Product Build",
      description: "The company has a validated direction or defined opportunity and needs a partner who can take the product from strategy/design into working production software.",
      problemSignals: [
        "Defined MVP or feature specification ready for execution",
        "Product initiative without sufficient internal cross-functional product engineering capacity",
        "Prototype or proof-of-concept that needs production implementation",
        "Startup preparing for a critical product launch or validation milestone",
        "Product team lacking senior product design engineering execution without hiring an entire team"
      ],
      solutionMechanism: "Carries the product from design through front-end/full-stack engineering and deployment without handoff overhead or agency friction."
    },
    {
      id: "PRODUCT_ACCELERATION",
      title: "Product Acceleration",
      description: "The company already has an active product/team but is losing momentum because product, design, and engineering are fragmented across silos.",
      problemSignals: [
        "Handoff friction between designers and engineers slowing down release velocity",
        "Coordination overhead across multiple disparate freelancers, agencies, or specialists",
        "Product/design/engineering disconnect where built features drift from intent",
        "Stalled or sluggish product initiative needing focused, high-velocity momentum",
        "Founder or product lead carrying excessive coordination and review burden"
      ],
      solutionMechanism: "Embeds as a senior cross-functional Product Design Engineer to eliminate handoffs, unify design and code, and rapidly ship complete product slices."
    },
    {
      id: "PRODUCT_CONTINUITY",
      title: "Product Continuity",
      description: "The company has a live product and needs an ongoing senior product partner to continuously improve, extend, and evolve it without losing coherence.",
      problemSignals: [
        "Continuous product iteration across strategy, UX, and full-stack codebase",
        "Product team requiring ongoing senior strategic and product engineering bandwidth",
        "Recurring product development needs where hiring full-time specialists is premature or inefficient",
        "New AI capabilities, agent workflows, or complex logic being integrated into an existing product",
        "Product requiring integrated design + engineering architectural decisions rather than isolated ticket execution"
      ],
      solutionMechanism: "Provides continuous product design engineering partnership, maintaining architectural and visual continuity across ongoing iterations."
    }
  ],

  capabilities: [
    {
      id: "PRODUCT_STRATEGY",
      title: "Product Strategy",
      mechanism: "Resolves product ambiguity, clarifies positioning, defines user models, and determines what should actually be built."
    },
    {
      id: "SYSTEM_ARCHITECTURE",
      title: "System Architecture",
      mechanism: "Connects product requirements, data flows, application logic, and technical constraints into robust systems."
    },
    {
      id: "PRODUCT_DESIGN",
      title: "Product Design",
      mechanism: "Turns product complexity into intuitive, high-craft interfaces, interactive design systems, and seamless workflows."
    },
    {
      id: "PRODUCT_ENGINEERING",
      title: "Product Engineering",
      mechanism: "Turns validated product direction into production-ready front-end, full-stack software, and automated deployments."
    },
    {
      id: "AI_WORKFLOW_DESIGN",
      title: "AI Workflow Design",
      mechanism: "Integrates AI into useful product workflows and interactive systems rather than adding superficial AI features."
    },
    {
      id: "WEB3_PRODUCT_DEV",
      title: "Web3 Product Development",
      mechanism: "Applies when blockchain, wallet mechanics, or decentralized protocols are genuinely part of the product problem."
    }
  ],

  bestFitEnvironments: [
    "AI products and agentic workflows",
    "SaaS and enterprise workflow software",
    "Developer tools and technical infrastructure",
    "Complex digital products with non-trivial user mental models",
    "Internal tools and operational systems",
    "Emerging technology and Web3 products",
    "Early-stage startups and founder-led product teams",
    "Small product teams or innovation groups needing cross-functional velocity"
  ],

  disqualificationCriteria: [
    "No consequential company or product problem is evidenced from public facts",
    "The observation is purely cosmetic or generic ('website could look better', 'needs visual polish')",
    "Absence of marketing assets (e.g. no pricing page, no demo video, no app store link) treated as an artificial crisis",
    "Pure branding, logo design, SEO optimization, social media, or content marketing",
    "Commodity web development or generic static template assembly",
    "Large enterprise projects requiring multi-team agency management or procurement-heavy staff augmentation",
    "Company has strong internal product engineering capacity with no evidenced execution or ambiguity gap",
    "Speculative claims without observed evidence"
  ],

  outreachPromptModel: {
    inquiryTemplate: "I noticed [Observed Fact X], which suggests [Condition Y] may be occurring. Is that a challenge you're actively navigating as you move toward [Milestone Z]?"
  }
};
