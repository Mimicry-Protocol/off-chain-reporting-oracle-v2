import { 
    ApiConfig,
    ThrottleConfig
} from "../types";

export class RestfulProvider {
    config: ApiConfig;

    constructor(apiKey: string, apiHost: string) {
        this.config = {
            key: apiKey,
            host: apiHost
        }
    }

    getThrottleConfig(): ThrottleConfig {
        return {
            limit: 5,
            interval: 1000
        }
    }
}