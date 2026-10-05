export type AgentToolName="memory_search"|"memory_save"|"project_files_list"|"project_file_open";
export type AgentToolPermission={name:AgentToolName;enabled:boolean};
export type AgentRunInput={agentId:string;prompt:string;conversationId?:string;projectId?:string;maxSteps?:number};
export type AgentRunResult={text:string;steps:number;toolCalls:number;model:string};