import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  HardDrive, 
  Download, 
  Terminal, 
  Check, 
  Copy, 
  ExternalLink, 
  Server, 
  ShieldCheck, 
  Sparkles, 
  Filter, 
  Search, 
  Zap, 
  Brain, 
  Layers, 
  Globe, 
  Activity, 
  FileText, 
  Eye, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Laptop, 
  Monitor, 
  Boxes, 
  ChevronRight, 
  Info, 
  Lock, 
  Sliders,
  X,
  Code2,
  FolderDown,
  WifiOff
} from 'lucide-react';

export interface OllamaModel {
  id: string;
  name: string;
  tag: string;
  displayName: string;
  family: string;
  parameterSize: string;
  downloadSize: string;
  diskSpaceRequired: string;
  minRamGb: number;
  recommendedRamGb: number;
  contextWindow: string;
  category: 'chat' | 'clinical' | 'reasoning' | 'multilingual' | 'vision' | 'embedding' | 'edge';
  categoryLabel: string;
  recommendedRole: string;
  description: string;
  offlineBenefits: string;
  isPopular?: boolean;
  libraryUrl: string;
  modelfilePrompt?: string;
}

export const OLLAMA_MODELS: OllamaModel[] = [
  // Tier 1: Ultra-Lightweight & Edge (2GB - 4GB RAM)
  {
    id: 'llama3.2-1b',
    name: 'llama3.2:1b',
    tag: 'llama3.2:1b',
    displayName: 'Llama 3.2 (1B Lightweight)',
    family: 'Meta Llama',
    parameterSize: '1.2 Billion',
    downloadSize: '1.3 GB',
    diskSpaceRequired: '1.5 GB',
    minRamGb: 2,
    recommendedRamGb: 4,
    contextWindow: '128k tokens',
    category: 'edge',
    categoryLabel: 'Ultra-Lightweight / Edge',
    recommendedRole: 'Field Case Notes & On-the-Go Client Logging',
    description: 'Meta\'s ultra-compact 1B parameter model engineered for edge computing, low-battery field laptops, and Chromebooks.',
    offlineBenefits: '100% offline, near-instant responses, runs smoothly with zero lag even on older 4GB office PCs.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/llama3.2:1b'
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'qwen2.5:0.5b',
    tag: 'qwen2.5:0.5b',
    displayName: 'Qwen 2.5 (0.5B Micro)',
    family: 'Qwen',
    parameterSize: '0.5 Billion',
    downloadSize: '398 MB',
    diskSpaceRequired: '500 MB',
    minRamGb: 2,
    recommendedRamGb: 2,
    contextWindow: '32k tokens',
    category: 'edge',
    categoryLabel: 'Ultra-Lightweight / Edge',
    recommendedRole: 'Background Tagging, Rapid Categorization & Offline Search',
    description: 'Alibaba\'s micro model that fits in under 400MB. Can run continuously in background processes without battery drain.',
    offlineBenefits: 'Extremely fast CPU inference, negligible memory footprint, ideal for low-spec non-profit loaner laptops.',
    libraryUrl: 'https://ollama.com/library/qwen2.5:0.5b'
  },
  {
    id: 'gemma2-2b',
    name: 'gemma2:2b',
    tag: 'gemma2:2b',
    displayName: 'Gemma 2 (2B Efficient)',
    family: 'Google Gemma',
    parameterSize: '2.6 Billion',
    downloadSize: '1.6 GB',
    diskSpaceRequired: '2.0 GB',
    minRamGb: 4,
    recommendedRamGb: 6,
    contextWindow: '8k tokens',
    category: 'chat',
    categoryLabel: 'Conversational & Intake',
    recommendedRole: 'Concise Client Summaries & Empathetic Task Structuring',
    description: 'Built on Google\'s DeepMind architecture, delivering outsized reasoning quality in a 2B footprint.',
    offlineBenefits: 'Smooth conversational tone, highly consistent markdown formatting for trauma-informed intakes.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/gemma2:2b'
  },
  {
    id: 'deepseek-r1-1.5b',
    name: 'deepseek-r1:1.5b',
    tag: 'deepseek-r1:1.5b',
    displayName: 'DeepSeek R1 (1.5B Reasoning)',
    family: 'DeepSeek',
    parameterSize: '1.5 Billion',
    downloadSize: '1.1 GB',
    diskSpaceRequired: '1.5 GB',
    minRamGb: 4,
    recommendedRamGb: 6,
    contextWindow: '128k tokens',
    category: 'reasoning',
    categoryLabel: 'Reasoning & Logic',
    recommendedRole: 'Quick Step-by-Step Grant Math & Case Prioritization',
    description: 'Distilled reasoning model that shows internal thinking tags (`<think>`) for verifying triage decisions offline.',
    offlineBenefits: 'Transparent chain-of-thought logic without sending sensitive client data to external cloud APIs.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/deepseek-r1:1.5b'
  },

  // Tier 2: Balanced Laptop & Desktop (8GB - 16GB RAM)
  {
    id: 'llama3.2-3b',
    name: 'llama3.2:3b',
    tag: 'llama3.2:3b',
    displayName: 'Llama 3.2 (3B Standard)',
    family: 'Meta Llama',
    parameterSize: '3.2 Billion',
    downloadSize: '2.0 GB',
    diskSpaceRequired: '2.5 GB',
    minRamGb: 6,
    recommendedRamGb: 8,
    contextWindow: '128k tokens',
    category: 'chat',
    categoryLabel: 'Conversational & Intake',
    recommendedRole: 'Primary Offline Case Manager & Haven Sandbox Companion',
    description: 'The premier sweet spot model for everyday laptops (MacBook Air, ThinkPads, Dell XPS). Balances speed, nuance, and memory.',
    offlineBenefits: 'Native 128k context allows loading complete multi-page client histories and SDOH timelines into local memory.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/llama3.2:3b'
  },
  {
    id: 'qwen2.5-3b',
    name: 'qwen2.5:3b',
    tag: 'qwen2.5:3b',
    displayName: 'Qwen 2.5 (3B Multilingual)',
    family: 'Qwen',
    parameterSize: '3.0 Billion',
    downloadSize: '1.9 GB',
    diskSpaceRequired: '2.4 GB',
    minRamGb: 6,
    recommendedRamGb: 8,
    contextWindow: '32k tokens',
    category: 'multilingual',
    categoryLabel: 'Multilingual & Global Care',
    recommendedRole: 'Multilingual Client Translations (Spanish, Arabic, French, Tagalog)',
    description: 'Benchmark leader for multilingual translation and structured JSON output in the 3B class.',
    offlineBenefits: 'Allows field caseworkers to translate intake forms and resources for immigrant/refugee families without internet.',
    libraryUrl: 'https://ollama.com/library/qwen2.5:3b'
  },
  {
    id: 'phi4-mini',
    name: 'phi4:mini',
    tag: 'phi4:mini',
    displayName: 'Microsoft Phi-4 (3.8B Mini)',
    family: 'Microsoft Phi',
    parameterSize: '3.8 Billion',
    downloadSize: '2.4 GB',
    diskSpaceRequired: '3.0 GB',
    minRamGb: 8,
    recommendedRamGb: 8,
    contextWindow: '128k tokens',
    category: 'reasoning',
    categoryLabel: 'Reasoning & Logic',
    recommendedRole: 'Grant Narrative Outlines, Compliance Checks & SDOH Synthesis',
    description: 'Microsoft\'s flagship small language model with high mathematical and analytical precision.',
    offlineBenefits: 'Strong factual adherence, excellent for auditing budget tables and nonprofit compliance regulations.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/phi4:mini'
  },
  {
    id: 'mistral-7b',
    name: 'mistral:7b-instruct',
    tag: 'mistral:7b-instruct',
    displayName: 'Mistral (7B Instruct)',
    family: 'Mistral AI',
    parameterSize: '7.3 Billion',
    downloadSize: '4.1 GB',
    diskSpaceRequired: '5.0 GB',
    minRamGb: 8,
    recommendedRamGb: 16,
    contextWindow: '32k tokens',
    category: 'chat',
    categoryLabel: 'Conversational & Intake',
    recommendedRole: 'Comprehensive Case Plan Formulation & Executive Summaries',
    description: 'Industry-standard 7B model renowned for crisp writing, nuance, and trauma-informed tone flexibility.',
    offlineBenefits: 'Battle-tested instruction following; produces thorough, empathetic care coordination plans.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/mistral:7b-instruct'
  },
  {
    id: 'deepseek-r1-7b',
    name: 'deepseek-r1:7b',
    tag: 'deepseek-r1:7b',
    displayName: 'DeepSeek R1 (7B Full Reasoning)',
    family: 'DeepSeek',
    parameterSize: '7.0 Billion',
    downloadSize: '4.7 GB',
    diskSpaceRequired: '5.5 GB',
    minRamGb: 8,
    recommendedRamGb: 16,
    contextWindow: '128k tokens',
    category: 'reasoning',
    categoryLabel: 'Reasoning & Logic',
    recommendedRole: 'Deep Strategic Vision Planning, Grant Proposal Drafting & SDOH Root-Cause Analysis',
    description: 'High-power reasoning engine that breaks complex multi-variable case management problems into methodical steps.',
    offlineBenefits: 'Analyzes complicated grant criteria and multi-funder restrictions locally with step-by-step validation.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/deepseek-r1:7b'
  },
  {
    id: 'qwen2.5-7b',
    name: 'qwen2.5:7b',
    tag: 'qwen2.5:7b',
    displayName: 'Qwen 2.5 (7B Powerhouse)',
    family: 'Qwen',
    parameterSize: '7.6 Billion',
    downloadSize: '4.7 GB',
    diskSpaceRequired: '5.5 GB',
    minRamGb: 8,
    recommendedRamGb: 16,
    contextWindow: '128k tokens',
    category: 'multilingual',
    categoryLabel: 'Multilingual & Global Care',
    recommendedRole: 'Full Multilingual Case Management, Policy Manual Summarization & Grant Math',
    description: 'One of the highest scoring 7B open-weight models in the world across coding, math, and multi-language support.',
    offlineBenefits: 'Native support for 29+ languages and 128k context for deep policy archive interrogation.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/qwen2.5:7b'
  },
  {
    id: 'llama3.1-8b',
    name: 'llama3.1:8b',
    tag: 'llama3.1:8b',
    displayName: 'Llama 3.1 (8B Flagship)',
    family: 'Meta Llama',
    parameterSize: '8.0 Billion',
    downloadSize: '4.7 GB',
    diskSpaceRequired: '5.5 GB',
    minRamGb: 8,
    recommendedRamGb: 16,
    contextWindow: '128k tokens',
    category: 'chat',
    categoryLabel: 'Conversational & Intake',
    recommendedRole: 'Complete Haven Care OS Offline Brain & Autonomous Case Assistant',
    description: 'Meta\'s gold standard 8B model with extensive knowledge across healthcare, social services, and nonprofit governance.',
    offlineBenefits: 'Zero cloud reliance, 100% HIPAA safe for sensitive client intake transcripts and crisis debriefs.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/llama3.1:8b'
  },

  // Tier 3: Specialized Clinical, Vision & Embeddings
  {
    id: 'meditron-7b',
    name: 'meditron:7b',
    tag: 'meditron:7b',
    displayName: 'Meditron (7B Clinical Care)',
    family: 'EPFL Clinical',
    parameterSize: '7.0 Billion',
    downloadSize: '4.2 GB',
    diskSpaceRequired: '5.0 GB',
    minRamGb: 8,
    recommendedRamGb: 16,
    contextWindow: '4k tokens',
    category: 'clinical',
    categoryLabel: 'Clinical & Health Terminology',
    recommendedRole: 'Health Literacy, Medication Terminology & SDOH Health Barrier Analysis',
    description: 'Trained on PubMed and clinical guidelines to help case workers interpret medical summaries and health barrier notes.',
    offlineBenefits: 'Confidential clinical terminology understanding without sharing medical data outside the agency.',
    libraryUrl: 'https://ollama.com/library/meditron:7b'
  },
  {
    id: 'moondream-1.8b',
    name: 'moondream:1.8b',
    tag: 'moondream:1.8b',
    displayName: 'Moondream 2 (1.8B Vision / OCR)',
    family: 'Moondream',
    parameterSize: '1.8 Billion',
    downloadSize: '1.8 GB',
    diskSpaceRequired: '2.2 GB',
    minRamGb: 4,
    recommendedRamGb: 8,
    contextWindow: '4k tokens',
    category: 'vision',
    categoryLabel: 'Vision & Document OCR',
    recommendedRole: 'Offline Scanning of Client ID, Intake Documents & Expense Receipts',
    description: 'Fast local vision model capable of reading photographed intake sheets, rent receipts, and utility bills.',
    offlineBenefits: 'Extracts text from client documentation directly on the laptop with zero cloud upload risk.',
    libraryUrl: 'https://ollama.com/library/moondream:1.8b'
  },
  {
    id: 'llama3.2-vision-11b',
    name: 'llama3.2-vision:11b',
    tag: 'llama3.2-vision:11b',
    displayName: 'Llama 3.2 Vision (11B Multimodal)',
    family: 'Meta Llama',
    parameterSize: '11.0 Billion',
    downloadSize: '7.9 GB',
    diskSpaceRequired: '9.0 GB',
    minRamGb: 16,
    recommendedRamGb: 24,
    contextWindow: '128k tokens',
    category: 'vision',
    categoryLabel: 'Vision & Document OCR',
    recommendedRole: 'High-Accuracy Form Processing & Multi-Page Document Analysis',
    description: 'Meta\'s premier multimodal vision model for parsing complex PDF tables, medical releases, and legal aid petitions.',
    offlineBenefits: 'Combines full visual understanding with deep language reasoning locally.',
    libraryUrl: 'https://ollama.com/library/llama3.2-vision:11b'
  },
  {
    id: 'nomic-embed-text',
    name: 'nomic-embed-text',
    tag: 'nomic-embed-text',
    displayName: 'Nomic Embed Text (Embeddings Engine)',
    family: 'Nomic AI',
    parameterSize: '137 Million',
    downloadSize: '274 MB',
    diskSpaceRequired: '350 MB',
    minRamGb: 2,
    recommendedRamGb: 4,
    contextWindow: '8k tokens',
    category: 'embedding',
    categoryLabel: 'Local Vector Embeddings',
    recommendedRole: 'Offline Semantic Search & Case Vault Indexing',
    description: 'Industry standard 8192-token embedding model. Enables lightning-fast offline vector search over thousands of case notes.',
    offlineBenefits: 'Enables private semantic search across your entire client history with zero cloud egress.',
    isPopular: true,
    libraryUrl: 'https://ollama.com/library/nomic-embed-text'
  },

  // Tier 4: High-Performance & Dedicated Server (16GB - 32GB+ RAM)
  {
    id: 'qwen2.5-14b',
    name: 'qwen2.5:14b',
    tag: 'qwen2.5:14b',
    displayName: 'Qwen 2.5 (14B High-Grade)',
    family: 'Qwen',
    parameterSize: '14.7 Billion',
    downloadSize: '9.0 GB',
    diskSpaceRequired: '10.5 GB',
    minRamGb: 16,
    recommendedRamGb: 24,
    contextWindow: '128k tokens',
    category: 'reasoning',
    categoryLabel: 'Reasoning & Logic',
    recommendedRole: 'Multi-Year Strategic Roadmaps & Comprehensive Grant Proposals',
    description: 'Exceptional reasoning depth approaching proprietary commercial APIs, runnable on 16GB+ Apple Silicon or workstation GPUs.',
    offlineBenefits: 'Uncompromised synthesis quality for executive directors and grant writing teams working offline.',
    libraryUrl: 'https://ollama.com/library/qwen2.5:14b'
  },
  {
    id: 'command-r-35b',
    name: 'command-r:35b',
    tag: 'command-r:35b',
    displayName: 'Command R (35B Enterprise RAG)',
    family: 'Cohere',
    parameterSize: '35.0 Billion',
    downloadSize: '20.0 GB',
    diskSpaceRequired: '23.0 GB',
    minRamGb: 24,
    recommendedRamGb: 32,
    contextWindow: '128k tokens',
    category: 'chat',
    categoryLabel: 'Conversational & Intake',
    recommendedRole: 'Agency-Wide Policy & SOP Compliance Indexing',
    description: 'Enterprise model optimized for grounding, verifiable citations, and complete policy handbook navigation.',
    offlineBenefits: 'Provides precise document citations when answering complex nonprofit regulatory questions.',
    libraryUrl: 'https://ollama.com/library/command-r:35b'
  }
];

export interface DeviceSpecs {
  estimatedRamGb: number;
  cpuCores: number;
  platform: string;
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isMobile: boolean;
  gpuRenderer: string;
  recommendedTier: 'edge' | 'standard' | 'power' | 'workstation';
  tierLabel: string;
}

export function DeviceOllamaModels({
  onClose,
  isModal = false
}: {
  onClose?: () => void;
  isModal?: boolean;
}) {
  // Device Hardware Profiler State
  const [deviceSpecs, setDeviceSpecs] = useState<DeviceSpecs>({
    estimatedRamGb: 8,
    cpuCores: 4,
    platform: 'Detecting...',
    isMac: false,
    isWindows: false,
    isLinux: false,
    isMobile: false,
    gpuRenderer: 'Standard Display Adapter',
    recommendedTier: 'standard',
    tierLabel: 'Standard Balanced (8GB RAM)'
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRamTier, setSelectedRamTier] = useState<string>('all');
  const [onlyDeviceRecommended, setOnlyDeviceRecommended] = useState<boolean>(true);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'install' | 'modelfile' | 'connection'>('catalog');
  const [selectedModelForModelfile, setSelectedModelForModelfile] = useState<OllamaModel>(OLLAMA_MODELS[4]); // Llama 3.2 3b default
  const [ollamaEndpoint, setOllamaEndpoint] = useState<string>('http://localhost:11434');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');
  const [installedLocalModels, setInstalledLocalModels] = useState<string[]>([]);
  const [downloadedTags, setDownloadedTags] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('haven_ollama_downloaded_models');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Detect Hardware on Mount
  useEffect(() => {
    try {
      const cores = navigator.hardwareConcurrency || 4;
      // @ts-ignore - navigator.deviceMemory is standard in Chromium
      const rawRam = (navigator.deviceMemory as number) || (cores >= 8 ? 16 : 8);
      const ua = navigator.userAgent.toLowerCase();
      const isMac = ua.includes('mac');
      const isWin = ua.includes('win');
      const isLinux = ua.includes('linux') && !ua.includes('android');
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);

      let gpu = 'Integrated Graphics / Generic GPU';
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          // @ts-ignore
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            // @ts-ignore
            gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpu;
          }
        }
      } catch (err) {
        // Fallback gracefully
      }

      let tier: 'edge' | 'standard' | 'power' | 'workstation' = 'standard';
      let tierLabel = 'Standard Balanced Laptop (8GB RAM)';

      if (rawRam <= 4 || isMobile) {
        tier = 'edge';
        tierLabel = 'Ultra-Lightweight & Field (2-4GB RAM)';
      } else if (rawRam >= 24 || (isMac && gpu.includes('Apple') && cores >= 12)) {
        tier = 'workstation';
        tierLabel = 'High-Performance Workstation (24GB+ RAM)';
      } else if (rawRam >= 16 || (isMac && gpu.includes('Apple'))) {
        tier = 'power';
        tierLabel = 'Power Laptop / Studio (16GB+ RAM)';
      }

      let platformName = 'Desktop Workstation';
      if (isMac) platformName = 'macOS (Apple Silicon / Intel)';
      else if (isWin) platformName = 'Windows PC';
      else if (isLinux) platformName = 'Linux Desktop / Server';
      else if (isMobile) platformName = 'Mobile / Field Device';

      setDeviceSpecs({
        estimatedRamGb: rawRam,
        cpuCores: cores,
        platform: platformName,
        isMac,
        isWindows: isWin,
        isLinux,
        isMobile,
        gpuRenderer: gpu,
        recommendedTier: tier,
        tierLabel
      });
    } catch (e) {
      console.warn("Hardware profiling notice:", e);
    }
  }, []);

  const handleCopyCommand = (tag: string, fullCommand: string) => {
    navigator.clipboard.writeText(fullCommand);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2500);
  };

  const toggleDownloadedStatus = (tag: string) => {
    const updated = { ...downloadedTags, [tag]: !downloadedTags[tag] };
    setDownloadedTags(updated);
    try {
      localStorage.setItem('haven_ollama_downloaded_models', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Test Local Ollama Connection
  const handleTestOllamaConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Pinging local Ollama endpoint...');
    try {
      const res = await fetch(`${ollamaEndpoint.replace(/\/$/, '')}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      }).catch(err => {
        throw new Error(`Failed to reach Ollama at ${ollamaEndpoint}. Please ensure Ollama is running ('ollama serve') and CORS allows localhost.`);
      });

      if (res && res.ok) {
        const data = await res.json();
        const models = (data.models || []).map((m: any) => m.name || m.model);
        setInstalledLocalModels(models);
        setTestStatus('success');
        setTestMessage(`Connected to Ollama! Found ${models.length} model(s) installed on this machine: ${models.slice(0, 4).join(', ')}${models.length > 4 ? '...' : ''}`);
        
        // Auto mark as downloaded
        if (models.length > 0) {
          const updated = { ...downloadedTags };
          models.forEach((mName: string) => {
            updated[mName] = true;
          });
          setDownloadedTags(updated);
          localStorage.setItem('haven_ollama_downloaded_models', JSON.stringify(updated));
        }
      } else {
        throw new Error(`Ollama returned status ${res.status}. Check if Ollama is running.`);
      }
    } catch (err: any) {
      setTestStatus('error');
      setTestMessage(err.message || 'Could not connect to Ollama. Make sure the desktop app or daemon is running.');
    }
  };

  // Model Compatibility Evaluator
  const getCompatibilityInfo = (model: OllamaModel) => {
    const deviceRam = deviceSpecs.estimatedRamGb;
    if (deviceRam >= model.recommendedRamGb) {
      return {
        status: 'optimal',
        label: 'Optimal Fit',
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        badge: '✨ Runs at Maximum Speed'
      };
    } else if (deviceRam >= model.minRamGb) {
      return {
        status: 'compatible',
        label: 'Compatible',
        color: 'text-teal-400 border-teal-500/30 bg-teal-500/10',
        badge: '⚡ Good Daily Performance'
      };
    } else if (deviceRam >= model.minRamGb - 2) {
      return {
        status: 'demanding',
        label: 'Demanding',
        color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
        badge: '⚠️ May Require Closing Apps'
      };
    } else {
      return {
        status: 'incompatible',
        label: 'Heavy / High RAM',
        color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
        badge: '🛑 Exceeds Detected Device RAM'
      };
    }
  };

  // Filter Models
  const filteredModels = useMemo(() => {
    return OLLAMA_MODELS.filter(model => {
      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = model.name.toLowerCase().includes(q) || model.displayName.toLowerCase().includes(q);
        const matchesDesc = model.description.toLowerCase().includes(q) || model.recommendedRole.toLowerCase().includes(q);
        const matchesCategory = model.categoryLabel.toLowerCase().includes(q) || model.family.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && model.category !== selectedCategory) {
        return false;
      }

      // RAM filter
      if (selectedRamTier === 'edge' && model.minRamGb > 4) return false;
      if (selectedRamTier === 'laptop' && (model.minRamGb > 8 || model.recommendedRamGb > 16)) return false;
      if (selectedRamTier === 'power' && model.minRamGb < 8) return false;

      // Smart Recommended For Device filter
      if (onlyDeviceRecommended) {
        const compat = getCompatibilityInfo(model);
        if (compat.status === 'incompatible') return false;
      }

      return true;
    });
  }, [searchQuery, selectedCategory, selectedRamTier, onlyDeviceRecommended, deviceSpecs]);

  // Generate Haven Care Modelfile for Selected Model
  const generateModelfileCode = (model: OllamaModel) => {
    return `# Haven Care OS Trauma-Informed Local Modelfile
FROM ${model.tag}

# Set parameter temperature for grounded, empathetic case management
PARAMETER temperature 0.4
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|eot_id|>"

# Set Haven the Owl System Instruction
SYSTEM """
You are Haven the Owl, the wise, empathetic, and trauma-informed AI companion for Haven Care OS.
Your core mission is supporting case managers, non-profit founders, and community health workers.

Guiding Principles:
1. Trauma-Informed Care: Prioritize safety, trust, transparency, collaboration, and client empowerment.
2. SDOH Awareness: Recognize social determinants of health (Housing, Food, Transport, Healthcare, Safety).
3. Data Privacy & Zero-Leakage: All case notes and data provided to you are strictly confidential and stay 100% on this local device.
4. Action-Oriented: Provide structured next steps, clear summaries, and respectful phrasing.
"""
`;
  };

  const containerContent = (
    <div className="flex flex-col h-full space-y-6 text-white">
      {/* Header & Device Profiler Banner */}
      <div className="flex flex-col gap-4 bg-slate-900/80 p-6 sm:p-8 rounded-[2rem] border border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <Cpu className="w-7 h-7 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">Local Ollama Model Manager</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Offline & HIPAA Safe
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Download and run open-weight AI models locally on your physical machine with Ollama. Zero cloud fees, zero data transmission, 100% private.
              </p>
            </div>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Device Profile Badge Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <Laptop className="w-5 h-5 text-teal-400 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Detected System</p>
              <p className="text-xs font-bold text-slate-200 truncate">{deviceSpecs.platform}</p>
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Available Memory & Cores</p>
              <p className="text-xs font-bold text-slate-200">
                ~{deviceSpecs.estimatedRamGb} GB RAM · {deviceSpecs.cpuCores} CPU Threads
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="truncate">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Graphics Engine</p>
              <p className="text-xs font-bold text-slate-200 truncate" title={deviceSpecs.gpuRenderer}>
                {deviceSpecs.gpuRenderer.length > 28 ? deviceSpecs.gpuRenderer.slice(0, 28) + '...' : deviceSpecs.gpuRenderer}
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-teal-500/10 rounded-2xl border border-teal-500/30 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-300 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-teal-300">Device Recommendation</p>
              <p className="text-xs font-bold text-white">{deviceSpecs.tierLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'catalog'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Model Catalog ({filteredModels.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'install'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Ollama Quick Setup Guide</span>
          </button>

          <button
            onClick={() => setActiveTab('modelfile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'modelfile'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Haven Modelfile Generator</span>
          </button>

          <button
            onClick={() => setActiveTab('connection')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'connection'
                ? 'bg-teal-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Local Endpoint Ping</span>
            {installedLocalModels.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-500 text-slate-950 font-black">
                {installedLocalModels.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'catalog' && (
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 transition-all">
            <input
              type="checkbox"
              checked={onlyDeviceRecommended}
              onChange={(e) => setOnlyDeviceRecommended(e.target.checked)}
              className="accent-teal-500 rounded"
            />
            <span>Filter for My Device (~{deviceSpecs.estimatedRamGb}GB RAM)</span>
          </label>
        )}
      </div>

      {/* Tab 1: Model Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="ollama-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models by name, role, or feature (e.g. Llama 3.2, Qwen, Clinical, Vision, Grant)..."
                className="w-full bg-black/30 border border-white/10 focus:border-teal-500 rounded-xl pl-9 pr-9 py-2.5 text-xs text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
              {[
                { id: 'all', label: 'All Roles' },
                { id: 'chat', label: 'Case Management' },
                { id: 'reasoning', label: 'Reasoning & Grants' },
                { id: 'clinical', label: 'Clinical SDOH' },
                { id: 'multilingual', label: 'Multilingual' },
                { id: 'vision', label: 'Vision / OCR' },
                { id: 'edge', label: 'Ultra-Lightweight' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                    selectedCategory === cat.id
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                      : 'bg-white/5 text-slate-400 border-white/5 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Model Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredModels.map((model) => {
              const compat = getCompatibilityInfo(model);
              const isDownloaded = !!downloadedTags[model.tag];

              return (
                <motion.div
                  key={model.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 hover:bg-white/[0.08] border border-white/10 rounded-[2rem] p-6 flex flex-col justify-between gap-5 transition-all shadow-xl hover:shadow-2xl hover:border-teal-500/30 group"
                >
                  <div className="space-y-4">
                    {/* Header: Name, Family, Category Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 font-mono">
                            {model.family}
                          </span>
                          {model.isPopular && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              ★ Recommended
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                          {model.displayName}
                        </h3>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${compat.color} shrink-0`}>
                        {compat.label}
                      </span>
                    </div>

                    {/* Description & Role */}
                    <div className="space-y-2">
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {model.description}
                      </p>
                      <div className="p-2.5 bg-black/30 rounded-xl border border-white/5 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-teal-400" />
                          Best Haven Use Case:
                        </p>
                        <p className="text-[11px] text-slate-300 font-medium">
                          {model.recommendedRole}
                        </p>
                      </div>
                    </div>

                    {/* Spec Matrix Pill Row */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Download</p>
                        <p className="text-xs font-bold text-white font-mono mt-0.5">{model.downloadSize}</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Min RAM</p>
                        <p className="text-xs font-bold text-white font-mono mt-0.5">{model.minRamGb} GB</p>
                      </div>
                      <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Context</p>
                        <p className="text-xs font-bold text-white font-mono mt-0.5">{model.contextWindow}</p>
                      </div>
                    </div>

                    {/* Compatibility Feedback Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <Info className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                      <span>{compat.badge}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {/* Pull Command Copy Box */}
                    <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-xl p-2 font-mono text-xs text-slate-300">
                      <span className="truncate pr-2 select-all text-teal-300 font-bold">
                        ollama run {model.tag}
                      </span>
                      <button
                        onClick={() => handleCopyCommand(model.tag, `ollama run ${model.tag}`)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[11px] font-bold flex items-center gap-1 transition-all border border-teal-500/30 shrink-0"
                        title="Copy command to run in terminal"
                      >
                        {copiedTag === model.tag ? (
                          <>
                            <Check className="w-3 h-3 text-teal-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Command</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Secondary Action Links */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <button
                        onClick={() => toggleDownloadedStatus(model.tag)}
                        className={`flex items-center gap-1.5 text-[11px] font-bold transition-colors ${
                          isDownloaded ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${isDownloaded ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{isDownloaded ? 'Installed Locally' : 'Mark as Downloaded'}</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedModelForModelfile(model);
                            setActiveTab('modelfile');
                          }}
                          className="text-[11px] font-bold text-teal-400 hover:text-teal-300 flex items-center gap-1 transition-colors"
                        >
                          <Code2 className="w-3 h-3" />
                          Modelfile
                        </button>

                        <a
                          href={model.libraryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span>Library</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredModels.length === 0 && (
            <div className="text-center py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
              <h4 className="text-base font-bold text-white">No models matching current filters</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Try clearing the search query or unchecking "Filter for My Device" to explore higher-tier server models.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedRamTier('all');
                  setOnlyDeviceRecommended(false);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Ollama Install Guide */}
      {activeTab === 'install' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Download className="w-5 h-5 text-teal-400" />
                How to Install & Run Ollama on Your Device
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ollama runs as a lightweight local background daemon on macOS, Windows, Linux, or Docker. It exposes an OpenAI-compatible REST API on port 11434.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* macOS */}
              <div className="p-5 bg-black/30 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <Laptop className="w-4 h-4" />
                  <span>macOS (Apple Silicon & Intel)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Download the official native application or install via Homebrew in Terminal:
                </p>
                <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-teal-300 flex items-center justify-between">
                  <span>brew install ollama</span>
                  <button
                    onClick={() => handleCopyCommand('brew', 'brew install ollama')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <a
                  href="https://ollama.com/download/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-400 hover:underline pt-1"
                >
                  Download .dmg installer <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Windows */}
              <div className="p-5 bg-black/30 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <Monitor className="w-4 h-4" />
                  <span>Windows 10 / 11 (x64 & ARM)</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Download the direct Windows installer executable which installs GPU acceleration drivers:
                </p>
                <a
                  href="https://ollama.com/download/windows"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>Download OllamaSetup.exe</span>
                </a>
                <p className="text-[11px] text-slate-400">
                  Supports NVIDIA GeForce RTX, AMD Radeon, and Intel Arc.
                </p>
              </div>

              {/* Linux */}
              <div className="p-5 bg-black/30 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <Terminal className="w-4 h-4" />
                  <span>Linux / Ubuntu / Debian</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  One-line shell installer with automatic systemd service creation:
                </p>
                <div className="bg-black/60 p-3 rounded-xl font-mono text-xs text-teal-300 flex items-center justify-between">
                  <span className="truncate pr-1">curl -fsSL https://ollama.com/install.sh | sh</span>
                  <button
                    onClick={() => handleCopyCommand('linux', 'curl -fsSL https://ollama.com/install.sh | sh')}
                    className="p-1 text-slate-400 hover:text-white shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Requires curl and sudo privileges.
                </p>
              </div>
            </div>

            {/* Quick Command Guide */}
            <div className="p-6 bg-black/20 rounded-2xl border border-white/5 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                Essential Terminal Commands
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[10px] text-slate-400 font-sans font-bold uppercase">Download & Chat</p>
                  <p className="text-teal-300 font-bold">ollama run llama3.2:3b</p>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[10px] text-slate-400 font-sans font-bold uppercase">Download in Background</p>
                  <p className="text-teal-300 font-bold">ollama pull deepseek-r1:7b</p>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[10px] text-slate-400 font-sans font-bold uppercase">List Installed Models</p>
                  <p className="text-teal-300 font-bold">ollama list</p>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[10px] text-slate-400 font-sans font-bold uppercase">Start Ollama Server</p>
                  <p className="text-teal-300 font-bold">ollama serve</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Haven Modelfile Generator */}
      {activeTab === 'modelfile' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-teal-400" />
                  Haven Care OS Custom Modelfile
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Create a dedicated, customized local model with Haven the Owl's trauma-informed case management instructions pre-packaged.
                </p>
              </div>

              {/* Model Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold">Base Model:</span>
                <select
                  value={selectedModelForModelfile.id}
                  onChange={(e) => {
                    const found = OLLAMA_MODELS.find(m => m.id === e.target.value);
                    if (found) setSelectedModelForModelfile(found);
                  }}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-teal-500"
                >
                  {OLLAMA_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.tag})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Block */}
            <div className="relative">
              <pre className="p-5 bg-black/50 border border-white/10 rounded-2xl font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed max-h-[600px] custom-scrollbar">
                {generateModelfileCode(selectedModelForModelfile)}
              </pre>
              <button
                onClick={() => handleCopyCommand('modelfile', generateModelfileCode(selectedModelForModelfile))}
                className="absolute right-4 top-4 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all border border-teal-500/40"
              >
                {copiedTag === 'modelfile' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>Copied Modelfile!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Modelfile</span>
                  </>
                )}
              </button>
            </div>

            {/* Build Command Box */}
            <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-teal-400" />
                Build your custom local model in 2 steps:
              </p>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside font-mono">
                <li>Save the content above into a file named <strong className="text-white">Modelfile</strong></li>
                <li className="text-teal-300 font-bold">ollama create haven-owl -f Modelfile</li>
                <li className="text-slate-200">ollama run haven-owl</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Local Endpoint Ping & Diagnostics */}
      {activeTab === 'connection' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Server className="w-5 h-5 text-teal-400" />
                Local Ollama Server Health & Diagnostics
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Verify that your local Ollama server is running and detect models installed on this workstation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                value={ollamaEndpoint}
                onChange={(e) => setOllamaEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-teal-500"
              />
              <button
                onClick={handleTestOllamaConnection}
                disabled={testStatus === 'testing'}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                {testStatus === 'testing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    <span>Test Local Connection</span>
                  </>
                )}
              </button>
            </div>

            {testStatus !== 'idle' && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed flex items-start gap-3 ${
                  testStatus === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : testStatus === 'error'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                {testStatus === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : testStatus === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-teal-400 animate-spin shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{testStatus === 'success' ? 'Connection Successful!' : testStatus === 'error' ? 'Connection Notice' : 'Testing...'}</p>
                  <p className="mt-1">{testMessage}</p>
                  {testStatus === 'error' && (
                    <p className="mt-2 text-[11px] text-amber-300/80">
                      Tip: If accessing via browser, launch Ollama with CORS enabled by setting environment variable: <code className="bg-black/40 px-1 py-0.5 rounded font-mono">OLLAMA_ORIGINS="*" ollama serve</code>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Installed Models list if detected */}
            {installedLocalModels.length > 0 && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Detected Locally Installed Models ({installedLocalModels.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {installedLocalModels.map(mName => (
                    <span
                      key={mName}
                      className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      {mName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-6xl max-h-[95vh] bg-slate-950/95 border border-white/15 rounded-[2.5rem] p-6 sm:p-8 overflow-y-auto custom-scrollbar shadow-2xl relative"
        >
          {containerContent}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto py-2">
      {containerContent}
    </div>
  );
}
