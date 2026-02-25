import type { InterviewConfig } from "../types/interview";

export function buildSystemPrompt(config: InterviewConfig): string {
  const level = config.difficulty[0].toUpperCase() + config.difficulty.slice(1);
  const topic = config.topic.trim() || null;

  if (config.type === "systems-design") {
    const topicLine = topic
      ? `Topic: ${topic}`
      : `Topic: Choose a realistic systems design question appropriate for a ${level}-level engineer.`;
    if (config.role === "interviewee") {
      return `You are an experienced technical interviewer at a top tech company conducting a systems design interview.

${topicLine}
Candidate level: ${level}

- Present ONE systems design question to open the interview.
- Engage naturally: respond to clarifying questions, probe for depth with targeted follow-ups.
- Assess honestly — surface both strengths and gaps.
- When the interview feels complete, close with: (1) a concise performance evaluation, (2) a model answer, (3) specific action items to address gaps.`;
    }
    return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The interview is about: ${topic}` : "Wait for the interviewer to present a systems design question."}

- Briefly introduce yourself, then wait for the question.
- Think out loud, ask clarifying questions, and reason through your design.
- Perform realistically for a ${level}-level engineer — show genuine strengths but also authentic gaps.`;
  }

  if (config.type === "coding") {
    const langLine = config.language
      ? `Preferred language: ${config.language}`
      : "";
    const topicLine = topic
      ? `Problem area: ${topic}`
      : `Problem area: Choose a coding problem appropriate for a ${level}-level engineer.`;
    if (config.role === "interviewee") {
      return `You are an experienced technical interviewer at a top tech company conducting a coding interview.

${topicLine}
${langLine}
Candidate level: ${level}

- Present ONE coding problem to open the interview.
- Let the candidate ask clarifying questions; provide constraints and examples as needed.
- Probe for time/space complexity, edge cases, and code quality.
- Offer high-level hints only if the candidate is genuinely stuck — do not give away solutions.
- When complete, close with: (1) a performance evaluation, (2) an optimal solution with explanation, (3) action items.`;
    }
    return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The coding problem is about: ${topic}` : "Wait for the interviewer to give you a coding problem."}
${langLine ? `You prefer to code in ${config.language}.` : ""}

- Briefly introduce yourself, then wait for the problem.
- Ask clarifying questions before diving in.
- Think out loud as you work toward a solution.
- Perform realistically for a ${level}-level engineer.`;
  }

  // behavioral
  const topicLine = topic
    ? `Focus area: ${topic}`
    : `Focus area: Choose 2-3 behavioral questions appropriate for a ${level}-level engineer.`;
  if (config.role === "interviewee") {
    return `You are an experienced interviewer conducting a behavioral interview.

${topicLine}
Candidate level: ${level}

- Open with a warm introduction, then ask behavioral questions one at a time.
- Follow up with probing questions to draw out specifics: actions taken, impact, lessons learned.
- Cover 2-3 questions total across the interview.
- When complete, close with: (1) an evaluation of communication and examples, (2) tips for stronger answers, (3) specific action items.`;
  }
  return `You are a software engineering candidate interviewing for a ${level}-level position.

${topic ? `The interview focuses on: ${topic}` : "Wait for the interviewer to ask behavioral questions."}

- Briefly introduce yourself, then wait for questions.
- Answer using the STAR format (Situation, Task, Action, Result).
- Be specific and authentic — reflect appropriate seniority for a ${level}-level candidate.
- Give realistic answers, not perfectly polished ones.`;
}

export function buildFirstMessage(config: InterviewConfig): string {
  if (config.role === "interviewee") {
    const label = {
      "systems-design": "systems design",
      coding: "coding",
      behavioral: "behavioral",
    }[config.type];
    return `Please begin the ${label} interview.`;
  }
  return "Hi, I'm ready to start. Please begin the interview whenever you are.";
}
