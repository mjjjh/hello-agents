class Message {
    role: "user" | "assistant" | "system";
    content: string;
    timestamp?: number;
    metadata?: Record<string, any> | undefined;

    constructor(role: "user" | "assistant" | "system", content: string, metadata?: Record<string, any>) {
        this.role = role;
        this.content = content;
        this.timestamp = Date.now();
        this.metadata = metadata;
    }

    toObj(){
        return {
            role: this.role,
            content: this.content,
        };
    }

    toString() {
        return `${this.role}: ${this.content}`;
    }
}

export default Message;