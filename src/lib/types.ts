import { InferUITools, UIMessage, UIDataTypes } from 'ai';
import { healthcareTools } from './tools';

// Infer the types from our patent search tools
export type PatentUITools = InferUITools<typeof healthcareTools>;

// Create a custom UIMessage type with our tools
export type PatentUIMessage = UIMessage<never, UIDataTypes, PatentUITools>;

// Legacy aliases for backwards compatibility
export type BiomedUITools = PatentUITools;
export type BiomedUIMessage = PatentUIMessage;
