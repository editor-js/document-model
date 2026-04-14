import { ToolConfig } from '@editorjs/editorjs';
import { TextNodeSerialized } from '@editorjs/model';
import { BlockTool, BlockToolConstructorOptions, BlockToolData } from '@editorjs/sdk';

/**
 * Heading levels supported by the Header tool
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
/**
 * Data structure describing the tool's input/output data
 */
export type HeaderData = BlockToolData<{
    /**
     * Text content of the heading
     */
    text: TextNodeSerialized;
    /**
     * Heading level (1–6)
     */
    level: HeadingLevel;
}>;
/**
 * User-end configuration for the tool
 */
export type HeaderConfig = ToolConfig<{
    /**
     * Placeholder for an empty heading
     */
    placeholder?: string;
    /**
     * Default heading level when none is provided
     */
    defaultLevel?: HeadingLevel;
    /**
     * Heading levels available to the user
     */
    levels?: HeadingLevel[];
}>;
/**
 * Header block tool
 */
export declare class Header implements BlockTool<HeaderData, HeaderConfig> {
    #private;
    static type: any;
    static name: string;
    /**
     * @param options - Block tool constructor options
     */
    constructor({ adapter, data, config }: BlockToolConstructorOptions<HeaderData, HeaderConfig>);
    /**
     * Creates the heading element
     */
    render(): HTMLElement;
}
//# sourceMappingURL=index.d.ts.map