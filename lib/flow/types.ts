// Flow graph data model — shared between the editor (browser) and the
// execution engine (Render worker).

export type NodeKind = 'trigger' | 'ai' | 'condition' | 'action';

export type TriggerType = 'new_dm' | 'comment_keyword' | 'story_reply' | 'button_click';
export type AiType = 'classify_intent' | 'generate_reply' | 'score_lead' | 'tag' | 'moderate_comment';
export type ConditionType = 'if_intent' | 'if_score_gt' | 'if_contains' | 'if_first_contact' | 'if_returning' | 'if_sentiment' | 'else';
export type ActionType = 'send_dm' | 'send_buttons' | 'send_link_button' | 'reply_comment' | 'send_link' | 'follow_up' | 'add_tag' | 'set_funnel' | 'flag_comment' | 'handoff_human';

/** A tappable button attached to a send_buttons message. Tapping it sends the
 *  title back as the lead's reply and fires `payload` as a button_click event. */
export type FlowButton = { title: string; payload: string };

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
  /** Substring filter on inbound text. Comma-separated = match if ANY term is present
   *  (e.g. "START, VIDEO, TRAINING"). Case-insensitive. Empty = match all. */
  contains?: string;
  /** Comma-separated keywords to EXCLUDE (whole-word). If any appears in the text
   *  the trigger does NOT fire — lets a "catch-all" comment flow skip comments
   *  already handled by a keyword flow (e.g. exclude "WEBINAR"). */
  exclude?: string;
  /** Optional comma-separated list of IG handles to limit to. */
  from_handles?: string;
  /** For comment_keyword: limit to comments on posts (feed) or reels only.
   *  Undefined / 'any' = both. Lets you send a different link per media type. */
  media?: 'any' | 'post' | 'reel';
  /** For comment_keyword / story_reply / new_dm: limit to events from a specific
   *  platform. Undefined / 'any' = fire on both. */
  platform?: 'any' | 'instagram' | 'facebook';
  /** For button_click: the payload of the tapped button this trigger fires on. */
  payload?: string;
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
  /** When true (default), append the org's master doc to the system prompt. */
  use_master_doc?: boolean;
};

export type ConditionConfig = {
  /** For if_intent: which intent label to match. */
  intent?: string;
  /** For if_score_gt: numeric threshold 0-100. */
  threshold?: number;
  /** For if_contains: substring to look for in last message. */
  contains?: string;
  /** For if_sentiment: which comment sentiment to match ('positive'|'negative'|'neutral'). */
  sentiment?: string;
};

export type ActionConfig = {
  /** Static text for send_dm / send_buttons; supports {{var}} interpolation from run context. */
  text?: string;
  /** Message variations for send_dm / reply_comment. One is picked at random each send
   *  (anti-spam rotation). Up to 5. Takes precedence over `text` when non-empty. */
  variants?: string[];
  /** Tappable buttons for send_buttons (rendered as Instagram quick replies). */
  buttons?: FlowButton[];
  /** Smart link slug for send_link. */
  link_slug?: string;
  /** Tag value for add_tag. */
  tag?: string;
  /** Funnel label for set_funnel. */
  funnel?: string;
  /** Slack channel / email for handoff. */
  notify?: string;
  /** For follow_up: hours after the last message to send each nudge (e.g. [2,6,12]).
   *  Each fires only if the lead hasn't replied; the sequence stops once they do. */
  delays_hours?: number[];
  /** For follow_up (and reused by AI nodes): the goal/instruction for the message. */
  goal?: string;
  /** For follow_up: include the master doc when AI-generating the nudge (default true). */
  use_master_doc?: boolean;
  /** For send_link_button: the URL the button opens (web_url). Required. */
  link_url?: string;
  /** For send_link_button: the label shown on the button (max ~20 chars, Meta limit). */
  button_label?: string;
  /** For send_link_button: optional subtitle shown below the title on the card. */
  subtitle?: string;
  /** For send_link_button: optional image shown at the top of the card.
   *  Must be a publicly reachable HTTPS URL. Recommended 1.91:1 aspect ratio
   *  (e.g. 1200×628) for horizontal cards, or 1:1 for square cards. */
  image_url?: string;
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
        config: type === 'if_intent' ? { intent: 'purchase' } : type === 'if_score_gt' ? { threshold: 70 } : type === 'if_sentiment' ? { sentiment: 'positive' } : {},
      };
    case 'action':
      return {
        ...base, kind: 'action', type: type as ActionType, label: actionLabel(type as ActionType),
        config: type === 'send_dm'
          ? { text: '' }
          : type === 'send_buttons'
            ? { text: '', buttons: [{ title: 'Send Link', payload: 'SEND_LINK' }] }
            : type === 'reply_comment'
              ? { variants: ['Just sent it to your DMs!'] }
              : type === 'follow_up'
                ? { delays_hours: [2, 6, 12], goal: 'They went quiet after your last message. Send a short, friendly nudge to re-engage. Do not be pushy.', use_master_doc: true }
                : type === 'add_tag' ? { tag: 'interested' } : {},
      };
  }
}

function triggerLabel(t: TriggerType) {
  return { new_dm: 'New DM received', comment_keyword: 'Comment with keyword', story_reply: 'Story reply', button_click: 'Button tapped' }[t];
}
function aiLabel(t: AiType) {
  return { classify_intent: 'Classify intent', generate_reply: 'Generate reply', score_lead: 'Score lead', tag: 'Auto-tag', moderate_comment: 'Translate + read sentiment' }[t];
}
function conditionLabel(t: ConditionType) {
  return { if_intent: 'If intent =', if_score_gt: 'If lead score >', if_contains: 'If text contains', if_first_contact: 'If first message', if_returning: 'If returning lead', if_sentiment: 'If sentiment =', else: 'Else' }[t];
}
function actionLabel(t: ActionType) {
  return { send_dm: 'Send DM', send_buttons: 'Send DM with buttons', reply_comment: 'Reply to comment', send_link: 'Send funnel link', follow_up: 'Follow up later', add_tag: 'Tag lead', set_funnel: 'Set funnel', flag_comment: 'Flag for moderation', handoff_human: 'Notify human' }[t];
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
