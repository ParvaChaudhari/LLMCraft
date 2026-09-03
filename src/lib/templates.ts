export interface WorkflowTemplate {
  id: string;
  name: string;
  badge?: string;
  icon: string;
  category: string;
  defaultCityName: string;
  description: string;
  graph: {
    nodes: any[];
    edges: any[];
  };
}

export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    icon: 'crop_square',
    category: 'Starter',
    defaultCityName: 'New Sector',
    description: 'Start with an empty isometric grid. Lay roads and build custom logic from scratch.',
    graph: {
      nodes: [],
      edges: []
    }
  },
  {
    id: 'web-research-agent',
    name: 'Web Research Agent',
    badge: 'Agent Mode',
    icon: 'radar',
    category: 'AI Agents',
    defaultCityName: 'Web Research City',
    description: 'Gemini AI Factory running in Agent Mode with Watchtower web search wired as an autonomous tool.',
    graph: {
      nodes: [
        {
          id: 'tpl_node_webhook',
          type: 'webhook',
          position: { x: 1024, y: 416 },
          data: {
            label: 'Radio Tower',
            isLoading: false
          }
        },
        {
          id: 'tpl_node_factory',
          type: 'geminiFactory',
          position: { x: 1216, y: 320 },
          data: {
            label: 'Gemini Factory',
            agentMode: true,
            maxToolRounds: 3,
            model: 'gemini-3.1-flash-lite',
            prompt: 'Who won the latest Premier League football match yesterday? Search the live web to find the exact score and answer in 2 sentences.',
            isLoading: false
          }
        },
        {
          id: 'tpl_node_watchtower',
          type: 'watchtower',
          position: { x: 1216, y: 128 },
          data: {
            label: 'Watchtower',
            toolName: 'search_web',
            toolDescription: 'Search the live web for current information, news, and facts.',
            toolSchema: '{"query": {"type": "string", "description": "The search query to look up"}}',
            isLoading: false
          }
        },
        {
          id: 'tpl_node_output',
          type: 'output',
          position: { x: 1600, y: 256 },
          data: {
            label: 'Delivery Dock',
            isLoading: false
          }
        }
      ],
      edges: [
        {
          id: 'tpl_edge_webhook_to_factory',
          type: 'road',
          source: 'tpl_node_webhook',
          target: 'tpl_node_factory',
          targetHandle: 'main'
        },
        {
          id: 'tpl_edge_watchtower_to_factory',
          type: 'road',
          source: 'tpl_node_watchtower',
          target: 'tpl_node_factory',
          targetHandle: 'tool'
        },
        {
          id: 'tpl_edge_factory_to_output',
          type: 'road',
          source: 'tpl_node_factory',
          target: 'tpl_node_output',
          sourceHandle: 'output'
        }
      ]
    }
  },
  {
    id: 'content-publisher',
    name: 'Content Publisher',
    badge: 'Human-in-Loop',
    icon: 'palette',
    category: 'Content & Media',
    defaultCityName: 'Content Publisher City',
    description: 'AI generates image prompts, Art Studio creates visuals, and Checkpoint pauses for human approval before email dispatch.',
    graph: {
      nodes: [
        {
          id: 'tpl_cp_webhook',
          type: 'webhook',
          position: { x: 576, y: 480 },
          data: {
            label: 'Radio Tower',
            isLoading: false
          }
        },
        {
          id: 'tpl_cp_factory',
          type: 'geminiFactory',
          position: { x: 832, y: 352 },
          data: {
            label: 'Gemini Factory',
            model: 'gemini-3.1-flash-lite',
            prompt: 'Write a vivid prompt for a stunning futuristic neon cyberpunk city skyscraper at twilight with flying cars. Return only the image description.',
            isLoading: false
          }
        },
        {
          id: 'tpl_cp_artstudio',
          type: 'artStudio',
          position: { x: 1088, y: 448 },
          data: {
            label: 'Art Studio',
            prompt: '{{lastOutput}}',
            model: 'dall-e-3',
            isLoading: false
          }
        },
        {
          id: 'tpl_cp_checkpoint',
          type: 'checkpoint',
          position: { x: 1280, y: 416 },
          data: {
            label: 'Content Approval Gate',
            isLoading: false
          }
        },
        {
          id: 'tpl_cp_postoffice',
          type: 'postOffice',
          position: { x: 1536, y: 320 },
          data: {
            label: 'Post Office',
            to: 'team@example.com',
            subject: 'New Visual Post Approved & Ready',
            body: 'Your generated visual post has passed review: {{lastOutput}}',
            isLoading: false
          }
        }
      ],
      edges: [
        {
          id: 'tpl_cp_edge_1',
          type: 'road',
          source: 'tpl_cp_webhook',
          target: 'tpl_cp_factory',
          targetHandle: 'main'
        },
        {
          id: 'tpl_cp_edge_2',
          type: 'road',
          source: 'tpl_cp_factory',
          target: 'tpl_cp_artstudio',
          sourceHandle: 'output'
        },
        {
          id: 'tpl_cp_edge_3',
          type: 'road',
          source: 'tpl_cp_artstudio',
          target: 'tpl_cp_checkpoint'
        },
        {
          id: 'tpl_cp_edge_4',
          type: 'road',
          source: 'tpl_cp_checkpoint',
          target: 'tpl_cp_postoffice',
          sourceHandle: 'approved'
        }
      ]
    }
  },
  {
    id: 'radio-city',
    name: 'Radio City (Daily Audio)',
    badge: 'Cron + Voice',
    icon: 'mic',
    category: 'Media & Voice',
    defaultCityName: 'Radio City',
    description: 'Autonomous morning news radio show. Clocktower triggers live web search, Gemini writes a podcast script, Audio Studio speaks it, and Post Office dispatches it.',
    graph: {
      nodes: [
        {
          id: 'tpl_rc_clocktower',
          type: 'clocktower',
          position: { x: 640, y: 288 },
          data: {
            label: 'Morning Broadcast Timer',
            cron: '0 8 * * *',
            isLoading: false
          }
        },
        {
          id: 'tpl_rc_billboard',
          type: 'billboard',
          position: { x: 768, y: 128 },
          data: {
            label: 'Billboard',
            title: 'Radio City',
            content: 'Audio updates every morning powered by live web search & Gemini TTS',
            isLoading: false
          }
        },
        {
          id: 'tpl_rc_gemini',
          type: 'geminiFactory',
          position: { x: 896, y: 320 },
          data: {
            label: 'Gemini News Host',
            model: 'gemini-3.1-flash-lite',
            agentMode: true,
            maxToolRounds: 3,
            agentSystemPrompt: 'You are a warm, charismatic, and articulate morning radio host. Search the web for breaking technology, AI, or science stories, and write a lively 60-to-80 word broadcast script ready for live text-to-speech reading. Do not output markdown symbols, stage notes, or asterisks—only spoken words.',
            prompt: 'Search the live web for the top breaking artificial intelligence or technology story today. Then write a warm, engaging radio broadcast script (under 80 words) explaining what happened and why listeners should care. Speak directly to the listener as our morning tech host.',
            isLoading: false
          }
        },
        {
          id: 'tpl_rc_watchtower',
          type: 'watchtower',
          position: { x: 1216, y: 160 },
          data: {
            label: 'News Watchtower',
            toolName: 'search_web',
            toolDescription: 'Search the live web for breaking news, current events, and tech stories.',
            toolSchema: '{"query": {"type": "string", "description": "The search query to look up current news stories"}}',
            isLoading: false
          }
        },
        {
          id: 'tpl_rc_audio',
          type: 'audioStudio',
          position: { x: 1088, y: 352 },
          data: {
            label: 'Audio Broadcast Studio',
            provider: 'google',
            mode: 'text_to_speech',
            voice: 'Kore',
            speed: 1.0,
            text: '{{lastOutput}}',
            isLoading: false
          }
        },
        {
          id: 'tpl_rc_postoffice',
          type: 'postOffice',
          position: { x: 1408, y: 384 },
          data: {
            label: 'Dispatch Post Office',
            to: 'team@example.com',
            subject: '🎙️ Your Daily Morning Tech Briefing is Ready',
            body: 'Good morning! Here is today\'s autonomous audio briefing:\n\n{{lastOutput}}',
            isLoading: false
          }
        }
      ],
      edges: [
        {
          id: 'tpl_rc_edge_1',
          type: 'road',
          source: 'tpl_rc_clocktower',
          target: 'tpl_rc_gemini',
          targetHandle: 'main'
        },
        {
          id: 'tpl_rc_edge_2',
          type: 'road',
          source: 'tpl_rc_watchtower',
          target: 'tpl_rc_gemini',
          targetHandle: 'tool'
        },
        {
          id: 'tpl_rc_edge_3',
          type: 'road',
          source: 'tpl_rc_gemini',
          target: 'tpl_rc_audio',
          sourceHandle: 'output'
        },
        {
          id: 'tpl_rc_edge_4',
          type: 'road',
          source: 'tpl_rc_audio',
          target: 'tpl_rc_postoffice'
        }
      ]
    }
  }
];

/**
 * Clones a template's graph and gives all nodes and edges unique IDs so that
 * multiple cities created from the same template never collide on node ID references.
 */
export function instantiateTemplate(templateId: string): { nodes: any[]; edges: any[] } {
  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  if (!template.graph || template.graph.nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const timestamp = Date.now();
  const idMap = new Map<string, string>();

  // Generate unique IDs for all nodes
  const newNodes = template.graph.nodes.map((node, index) => {
    const newId = `node_${index}_${timestamp}`;
    idMap.set(node.id, newId);
    return {
      ...JSON.parse(JSON.stringify(node)),
      id: newId,
      selected: false,
      dragging: false
    };
  });

  // Remap edges to the new node IDs
  const newEdges = template.graph.edges.map((edge, index) => {
    const newSource = idMap.get(edge.source) || edge.source;
    const newTarget = idMap.get(edge.target) || edge.target;
    return {
      ...JSON.parse(JSON.stringify(edge)),
      id: `edge_${index}_${timestamp}`,
      source: newSource,
      target: newTarget
    };
  });

  return { nodes: newNodes, edges: newEdges };
}
