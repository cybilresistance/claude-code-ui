/**
 * OpenRouter SDK integration types
 */

export interface ChatTitleContext {
	userMessage: string;
	projectName?: string;
}

/**
 * OpenRouter generation result
 */
export interface GenerationResult {
	success: boolean;
	content?: string;
	error?: string;
}