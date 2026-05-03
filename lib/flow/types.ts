// Flow graph data model — shared between the editor (browser) and the
// execution engine (Render worker).

export type NodeKind = 'trigger' | 'ai' | 'condition' | 'action';

export type TriggerType = 'new_dm' | 'comment_keyword' | 'story_reply';
export type AiType = 'classify_intent' | 'generate_reply' | 'score_lead' | 'tag';
export type ConditionType = 'if_intent' | 'if_score_gt' | 'if_contains' | 'else';
export type ActionType = 'send_dm' | 'send_link' | 'add_tag' | 'set_funnel' | 'handoff_human';

export type FlowNode =
  | {
      id: string; kind: 'trigger'; type: TriggerType;
      position: { x: number; y: number };
      label: string;
      config: TriggerConfig;
    }
  | {
      id: string; kind: 'ai'; type: AiType;
      position: { x: number; y: number };
      label: string;
      config: AiConfig;
    }
  | {
      id: string; kind: 'condition'; type: ConditionType;
      position: { x: number; y: number };
      label: string;
      config: ConditionConfig;
    }
  | {
      id: string; kind: 'action'; type: ActionType;
      position: { x: number; y: number };
      label: string;
      config: ActionConfig;
    };

export type TriggerConfig = {
  /** Optional substring filter on inbound text. Empty = match all. */
  contains?: string;
  /** Optional comma-separated list of IG handles to limit to. */
  from_handles?: string;
};

export type AiConfig = {
  /** Free-form system prompt fragment appended to the brand voice. */
  system_prompt?: string;
  /** Confidence threshold (for classify; 0-1). */
  confidence?: number;
  /** Allowed output classes (for classify). */
  classes?: string[];
  /** Goal for reply generation. */
  goal?: string;
  /** Brand voice descriptor. */
  voice?: string;
};

export type ConditionConfig = {
  /** For if_intent: which intent label to match. */
  intent?: string;
  /** For if_score_gt: numeric threshold 0-100. */
  threshold?: number;
  /** For if_contains: substring to look for in last message. */
  contains?: string;
};

export type ActionConfig = {
  /** Static text for send_dm; supports {{var}} interpolation from run context. */
  text?: string;
  /** Smart link slug for send_link. */
  link_slug?: string;
  /** Tag value for add_tag. */
  tag?: string;
  /** Funnel label for set_funnel. */
  funnel?: string;
  /** Slack channel / email for handoff. */
  notify?: string;
};

/**
 * Edge connects a node to a downstream node. Optionally tied to a specific
 * branch label ("true" / "false" / intent name) when leaving a condition node.
 */
export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  branch?: string;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const EMPTY_GRAPH: FlowGraph = { nodes: [], edges: [] };

// ─── Node-creation helpers (used by the editor's "+ Add" actions) ──────────

let _idCounter = 0;
export function newId(prefix = 'n'): string {
  _idCounter++;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter}`;
}

export function defaultNode(kind: NodeKind, type: string, position: { x: number; y: number }): FlowNode {
  const base = { id: newId(), position };
  switch (kind) {
    case 'trigger':
      return { ...base, kind: 'trigger', type: type as TriggerType, label: triggerLabel(type as TriggerType), config: {} };
    case 'ai':
      return {
        ...base, kind: 'ai', type: type as AiType, label: aiLabel(type as AiType),
        config: type === 'classify_intent'
          ? { confidence: 0.85, classes: ['purchase', 'objection', 'question', 'spam'] }
          : type === 'generate_reply'
            ? { goal: 'Reply concisely with a single clear next step.', voice: 'warm, direct' }
            : {},
      };
    case 'condition':
      return {
        ...base, kind: 'condition', type: type as ConditionType, label: conditionLabel(type as ConditionType),
        config: type === 'if_intent' ? { intent: 'purchase' } : type === 'if_score_gt' ? { threshold: 70 } : {},
      };
    case 'action':
      return {
        ...base, kind: 'action', type: type as ActionType, label: actionLabel(type as ActionType),
        config: type === 'send_dm' ? { text: '' } : type === 'add_tag' ? { tag: 'interested' } : {},
      };
  }
}

function triggerLabel(t: TriggerType) {
  return { new_dm: 'New DM received', comment_keyword: 'Comment with keyword', story_reply: 'Story reply' }[t];
}
function aiLabel(t: AiType) {
  return { classify_intent: 'Classify intent', generate_reply: 'Generate reply', score_lead: 'Score lead', tag: 'Auto-tag' }[t];
}
function conditionLabel(t: ConditionType) {
  return { if_intent: 'If intent =', if_score_gt: 'If lead score >', if_contains: 'If text contains', else: 'Else' }[t];
}
function actionLabel(t: ActionType) {
  return { send_dm: 'Send DM', send_link: 'Send funnel link', add_tag: 'Tag lead', set_funnel: 'Set funnel', handoff_human: 'Notify human' }[t];
}

// ─── Default templates (used by the "Create from template" empty-state) ────

export function autoReplyTemplate(): FlowGraph {
  const trigger = defaultNode('trigger', 'new_dm', { x: 60, y: 100 });
  const classify = defaultNode('ai', 'classify_intent', { x: 320, y: 50 });
  const ifPurchase = defaultNode('condition', 'if_intent', { x: 600, y: 0 });
  (ifPurchase as Extract<FlowNode, { kind: 'condition' }>).config = { intent: 'purchase' };
  const reply = defaultNode('ai', 'generate_reply', { x: 880, y: 0 });
  const send = defaultNode('action', 'send_dm', { x: 1140, y: 0 });
  const elseN = defaultNode('condition', 'else', { x: 600, y: 180 });
  const handoff = defaultNode('action', 'handoff_human', { x: 880, y: 180 });
  return {
    nodes: [trigger, classify, ifPurchase, reply, send, elseN, handoff],
    edges: [
      { id: newId('e'), source: trigger.id, target: classify.id },
      { id: newId('e'), source: classify.id, target: ifPurchase.id, branch: 'purchase' },
      { id: newId('e'), source: classify.id, target: elseN.id, branch: 'else' },
      { id: newId('e'), source: ifPurchase.id, target: reply.id },
      { id: newId('e'), source: reply.id, target: send.id },
      { id: newId('e'), source: elseN.id, target: handoff.id },
    ],
  };
}
