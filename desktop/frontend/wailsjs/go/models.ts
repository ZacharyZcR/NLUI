export namespace main {
	
	export class ChatMessage {
	    id: string;
	    role: string;
	    content: string;
	    tool_name?: string;
	    tool_args?: string;
	
	    static createFrom(source: any = {}) {
	        return new ChatMessage(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.role = source["role"];
	        this.content = source["content"];
	        this.tool_name = source["tool_name"];
	        this.tool_args = source["tool_args"];
	    }
	}
	export class ConversationInfo {
	    id: string;
	    title: string;
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new ConversationInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.title = source["title"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	}
	export class ProviderInfo {
	    name: string;
	    api_base: string;
	    models: string[];
	
	    static createFrom(source: any = {}) {
	        return new ProviderInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.api_base = source["api_base"];
	        this.models = source["models"];
	    }
	}
	export class ToolSummary {
	    name: string;
	    display_name: string;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new ToolSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.display_name = source["display_name"];
	        this.description = source["description"];
	    }
	}
	export class SourceInfo {
	    name: string;
	    tools: ToolSummary[];
	
	    static createFrom(source: any = {}) {
	        return new SourceInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.tools = this.convertValues(source["tools"], ToolSummary);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ToolConfig {
	    enabled_sources: string[];
	    disabled_tools: string[];
	
	    static createFrom(source: any = {}) {
	        return new ToolConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled_sources = source["enabled_sources"];
	        this.disabled_tools = source["disabled_tools"];
	    }
	}
	export class ToolInfo {
	    target_name: string;
	    name: string;
	    description: string;
	    parameters: any;
	
	    static createFrom(source: any = {}) {
	        return new ToolInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.target_name = source["target_name"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.parameters = source["parameters"];
	    }
	}

}

