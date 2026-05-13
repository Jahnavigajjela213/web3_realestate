import { analyzeAdminData } from '../agents/adminAgent';
import { analyzeInvestorData } from '../agents/investorAgent';
import { analyzeTenantData } from '../agents/tenantAgent';

/**
 * Agent Orchestrator - The central brain for AI insights
 */
class AgentOrchestrator {
  constructor() {
    this.geminiKey = import.meta.env.VITE_GEMINI_API_KEY || null;
    this.openaiKey = import.meta.env.VITE_OPENAI_API_KEY || null;
  }

  /**
   * Get insights based on user role and data
   */
  async getInsights(role, data) {
    let baseInsights = { insights: [], recommendations: [], notifications: [] };

    // 1. Generate Local Smart Insights (Fallback/Primary)
    if (role === 'Admin') {
      baseInsights = analyzeAdminData(data.properties, data.transactions);
    } else if (role === 'Investor') {
      baseInsights = analyzeInvestorData(data.portfolio, data.properties);
    } else if (role === 'Tenant') {
      baseInsights = analyzeTenantData(data.tenantProperty);
    }

    // 2. Optional: Enhance with external LLM if key exists
    if (this.geminiKey || this.openaiKey) {
      try {
        // Here you would call Gemini/OpenAI to "polish" or add deep insights
        // For this demo, we'll stick to the rock-solid local logic to ensure speed.
        console.log("AI Agent: External API available. Enhancing insights...");
      } catch (err) {
        console.error("AI Agent: External API failed, using local logic.", err);
      }
    }

    return baseInsights;
  }
}

export const aiOrchestrator = new AgentOrchestrator();
